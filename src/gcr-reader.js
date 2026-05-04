import JSZip from 'jszip';
import yaml from 'js-yaml';

/**
 * Load a GCR package from a ZIP archive.
 *
 * Accepts a Buffer/ArrayBuffer/Uint8Array (Node or browser), a Blob (browser),
 * or a base64 string.
 */
export async function loadGcr(input) {
  const zip = await JSZip.loadAsync(input);
  return new GcrPackage(zip);
}

/**
 * Represents a loaded GCR package.
 */
export class GcrPackage {
  constructor(zip) {
    this._zip = zip;
  }

  /** Read and parse metadata.yaml */
  async metadata() {
    const raw = await this._readText('metadata.yaml');
    return raw ? yaml.load(raw) : null;
  }

  /** Read and parse register.yaml (optional) */
  async register() {
    const raw = await this._readText('register.yaml');
    return raw ? yaml.load(raw) : null;
  }

  /** List all concept IDs (filenames without .yaml) */
  async conceptIds() {
    const ids = [];
    this._zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.startsWith('concepts/') && relativePath.endsWith('.yaml')) {
        ids.push(relativePath.slice('concepts/'.length, -'.yaml'.length));
      }
    });
    return ids.sort(naturalSort);
  }

  /**
   * Read a single concept by ID.
   * Returns a normalized Concept object regardless of storage format.
   */
  async concept(id) {
    const raw = await this._readText(`concepts/${id}.yaml`);
    if (raw === null) return null;
    return parseConceptYaml(raw);
  }

  /**
   * Iterate all concepts. Calls `callback(concept, index)` for each.
   * Use this for large packages to avoid loading everything at once.
   */
  async eachConcept(callback) {
    const ids = await this.conceptIds();
    for (let i = 0; i < ids.length; i++) {
      const concept = await this.concept(ids[i]);
      if (concept) await callback(concept, i);
    }
  }

  /**
   * Load all concepts into an array. Beware memory for large packages.
   */
  async allConcepts() {
    const ids = await this.conceptIds();
    const concepts = [];
    for (const id of ids) {
      const c = await this.concept(id);
      if (c) concepts.push(c);
    }
    return concepts;
  }

  async _readText(path) {
    const entry = this._zip.file(path);
    if (!entry) return null;
    return entry.async('text');
  }
}

// --- Concept YAML parsing ---

/**
 * Parse concept YAML (canonical or managed format) into a normalized object.
 *
 * Canonical format (single doc):
 *   { termid: "3.1.1.1", eng: { terms: [...], definition: [...] }, ... }
 *
 * Managed concept format (multi-doc):
 *   doc 0: { data: { identifier: "3.1.1.1", localized_concepts: { eng: "uuid" } }, id: "uuid" }
 *   doc 1+: { data: { language_code: "eng", terms: [...], ... }, id: "uuid" }
 */
export function parseConceptYaml(raw) {
  const docs = yaml.loadAll(raw, null, { schema: yaml.DEFAULT_SCHEMA });

  if (docs.length === 1 && docs[0].termid !== undefined) {
    // Already canonical
    return normalizeCanonical(docs[0]);
  }

  if (docs.length >= 1 && docs[0].data && docs[0].data.identifier !== undefined) {
    // Managed concept format
    return normalizeManaged(docs);
  }

  // Fallback: treat single doc as canonical
  return normalizeCanonical(docs[0]);
}

function normalizeCanonical(doc) {
  const localizations = {};
  for (const lang of LANG_CODES) {
    const lc = doc[lang];
    if (lc) localizations[lang] = lc;
  }
  return {
    termid: String(doc.termid),
    term: doc.term || null,
    localizations,
    raw: doc,
  };
}

function normalizeManaged(docs) {
  const mc = docs[0];
  const termid = String(mc.data.identifier);
  const localizations = {};

  for (const doc of docs.slice(1)) {
    if (!doc || !doc.data || !doc.data.language_code) continue;
    const lang = doc.data.language_code;
    const lcData = { ...doc.data };
    delete lcData.language_code;
    localizations[lang] = lcData;
  }

  return {
    termid,
    term: null,
    localizations,
    raw: mc,
  };
}

// --- Helpers ---

const LANG_CODES = [
  'eng', 'ara', 'deu', 'fra', 'spa', 'ita', 'jpn', 'kor',
  'pol', 'por', 'srp', 'swe', 'zho', 'rus', 'fin', 'dan',
  'nld', 'msa', 'nob', 'nno',
];

/** Natural sort for concept IDs like "3.1.1.1", "551-12-39" */
export function naturalSort(a, b) {
  const re = /(\d+|\D+)/g;
  const pa = a.match(re) || [];
  const pb = b.match(re) || [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || '';
    const nb = pb[i] || '';
    if (/^\d+$/.test(na) && /^\d+$/.test(nb)) {
      const diff = parseInt(na, 10) - parseInt(nb, 10);
      if (diff !== 0) return diff;
    } else {
      const cmp = na.localeCompare(nb);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}
