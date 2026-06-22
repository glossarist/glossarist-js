import JSZip from 'jszip';
import * as yaml from 'js-yaml';
import { conceptParser } from './concept-parser.js';
import { InvalidInputError } from './errors.js';
import { COMPILED_FORMATS, parseCompiledPath, compiledPath } from './compiled-format.js';
import { DATASET_ASSETS, findFileAsset, findDirectoryAssetPath } from './dataset-asset.js';
import { GcrMetadata } from './models/gcr-metadata.js';
import { naturalSort } from './sort.js';
import { NonVerbalEntity } from './models/non-verbal-entity.js';
import { BibliographyData } from './models/bibliography-data.js';
import { entityDir, entityPath, ENTITY_TYPES, parseEntityPath } from './entity-directory.js';

export { naturalSort } from './sort.js';

const BASE64_RE = /^[A-Za-z0-9+/]{100,}={0,2}$/;

/**
 * @typedef {Object} Term
 * @property {string} type - e.g. 'expression', 'symbol', 'abbreviation'
 * @property {string} designation - the term text
 * @property {string} [normative_status] - e.g. 'preferred', 'admitted'
 */

/**
 * @typedef {Object} Definition
 * @property {string} content - the definition text
 */

/**
 * @typedef {Object} Source
 * @property {string} type - e.g. 'authoritative', 'adapted'
 * @property {{ ref: { source: string, id?: string, version?: string } }} [origin] - reference to the source standard
 */

/**
 * @typedef {Object} Localization
 * @property {Term[]} terms - term designations
 * @property {Definition[]} [definition] - definition content
 * @property {{ content: string }[]} [notes] - editorial notes
 * @property {Array<{ content: string, examples?: object[], sources?: object[] }>} [examples] - usage examples (may themselves nest examples)
 * @property {Source[]} [sources] - bibliographic sources
 * @property {string} [entry_status] - e.g. 'valid', 'draft'
 * @property {string} [normative_status] - e.g. 'preferred', 'admitted'
 */

/**
 * @typedef {Object} Concept
 * @property {string} termid - concept identifier (e.g. '3.1.1.1', '551-12-39')
 * @property {string|null} term - primary term (canonical format only)
 * @property {Record<string, Localization>} localizations - keyed by ISO 639-3 language code
 * @property {Record<string, unknown>} raw - original parsed YAML
 */

/**
 * Load a GCR package from a ZIP archive.
 *
 * Accepts a Buffer/ArrayBuffer/Uint8Array (Node or browser), a Blob (browser),
 * or a base64-encoded string.
 *
 * @param {Buffer | ArrayBuffer | Uint8Array | Blob | string} input
 * @returns {Promise<GcrPackage>}
 * @throws {InvalidInputError} if input is null or undefined
 *
 * @example
 * import { loadGcr } from 'glossarist';
 * import fs from 'fs';
 * const pkg = await loadGcr(fs.readFileSync('dataset.gcr'));
 * const meta = await pkg.metadata();
 */
export async function loadGcr(input) {
  if (input == null) {
    throw new InvalidInputError('loadGcr requires a Buffer, ArrayBuffer, Uint8Array, Blob, or base64 string', 'non-null input');
  }
  const opts = typeof input === 'string' && BASE64_RE.test(input) ? { base64: true } : undefined;
  const zip = await JSZip.loadAsync(input, opts);
  return new GcrPackage(zip);
}

/**
 * Represents a loaded GCR package (ZIP archive of glossarist concept data).
 */
export class GcrPackage {
  /** @param {JSZip} zip */
  constructor(zip) {
    this._zip = zip;
  }

  /**
   * Read and parse metadata.yaml from the package as a GcrMetadata instance.
   * @returns {Promise<GcrMetadata | null>}
   */
  async metadata() {
    const raw = await this._readText('metadata.yaml');
    return raw ? GcrMetadata.fromYaml(raw) : null;
  }

  /**
   * Read and parse optional register.yaml from the package.
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async register() {
    const raw = await this._readText('register.yaml');
    return raw ? yaml.load(raw) : null;
  }

  /**
   * List all concept IDs (filenames without .yaml), naturally sorted.
   * @returns {Promise<string[]>}
   */
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
   * Read and normalize a single concept by ID.
   * @param {string} id - concept identifier
   * @returns {Promise<Concept | null>}
   */
  async concept(id) {
    const raw = await this._readText(`concepts/${id}.yaml`);
    if (raw === null) return null;
    return conceptParser.parse(raw, id);
  }

  /**
   * Iterate all concepts. Use for large packages to avoid loading everything at once.
   * @param {(concept: Concept, index: number) => void | Promise<void>} callback
   * @returns {Promise<void>}
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
   * @returns {Promise<Concept[]>}
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

  // --- Compiled / machine formats (TBX, JSON-LD, Turtle, JSONL) ---

  /**
   * List compiled format directories present in this package.
   * @returns {Promise<string[]>}
   */
  async compiledFormats() {
    const seen = new Set();
    this._zip.forEach((relativePath, entry) => {
      if (!entry.dir) {
        const parsed = parseCompiledPath(relativePath);
        if (parsed) seen.add(parsed.format);
      }
    });
    return COMPILED_FORMATS.filter((f) => seen.has(f));
  }

  /**
   * List entry IDs for a given compiled format.
   * @param {string} format - e.g. 'tbx', 'jsonld', 'turtle', 'jsonl'
   * @returns {Promise<string[]>}
   */
  async compiledFormatIds(format) {
    const prefix = `compiled/${format}/`;
    const ids = [];
    this._zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.startsWith(prefix)) {
        const parsed = parseCompiledPath(relativePath);
        if (parsed && parsed.format === format) ids.push(parsed.id);
      }
    });
    return ids.sort(naturalSort);
  }

  /**
   * Check whether a compiled format is present.
   * @param {string} format
   * @returns {Promise<boolean>}
   */
  async hasCompiledFormat(format) {
    const prefix = `compiled/${format}/`;
    let found = false;
    this._zip.forEach((relativePath, entry) => {
      if (!found && !entry.dir && relativePath.startsWith(prefix)) {
        found = true;
      }
    });
    return found;
  }

  /**
   * Read a single compiled-format file as a string.
   * @param {string} format - e.g. 'jsonld'
   * @param {string} id - concept ID or document name (e.g. '3.1.1.1', 'glossary')
   * @returns {Promise<string | null>} null if the file doesn't exist
   */
  async compiledFile(format, id) {
    return this._readText(compiledPath(format, id));
  }

  /**
   * Read a single compiled-format file as a Uint8Array (for binary content).
   * @param {string} format
   * @param {string} id
   * @returns {Promise<Uint8Array | null>}
   */
  async compiledFileBuffer(format, id) {
    const entry = this._zip.file(compiledPath(format, id));
    if (!entry) return null;
    return entry.async('uint8array');
  }

  /**
   * Iterate all entries for a compiled format.
   * @param {string} format
   * @param {(id: string, content: string) => void | Promise<void>} callback
   * @returns {Promise<void>}
   */
  async eachCompiledFile(format, callback) {
    const ids = await this.compiledFormatIds(format);
    for (const id of ids) {
      const content = await this.compiledFile(format, id);
      if (content !== null) await callback(id, content);
    }
  }

  /**
   * Load all entries for a compiled format into a Map (id → content).
   * @param {string} format
   * @returns {Promise<Map<string, string>>}
   */
  async allCompiledFiles(format) {
    const map = new Map();
    await this.eachCompiledFile(format, (id, content) => { map.set(id, content); });
    return map;
  }

  // --- Dataset assets (bibliography, images, etc.) ---

  /**
   * List all dataset asset entries found in this package.
   * Each entry has { path, type, asset } where asset is the registry descriptor.
   * @returns {Promise<Array<{ path: string, type: 'file' | 'directory', asset: { path: string, type: string } }>>}
   */
  async datasetAssetEntries() {
    const entries = [];
    this._zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      const fileAsset = findFileAsset(relativePath);
      if (fileAsset) {
        entries.push({ path: relativePath, type: 'file', asset: fileAsset });
        return;
      }
      const dirAsset = findDirectoryAssetPath(relativePath);
      if (dirAsset) {
        entries.push({ path: relativePath, type: 'directory', asset: dirAsset });
      }
    });
    return entries;
  }

  /**
   * Read a file-type dataset asset by its registered path (e.g. 'bibliography.yaml').
   * @param {string} assetPath - registered file asset path
   * @returns {Promise<string | null>}
   */
  async readDatasetFileAsset(assetPath) {
    return this._readText(assetPath);
  }

  /**
   * Read and parse bibliography.yaml from the package as a BibliographyData instance.
   * @returns {Promise<BibliographyData | null>}
   */
  async bibliography() {
    const raw = await this._readText('bibliography.yaml');
    if (raw === null) return null;
    return BibliographyData.fromYAML(raw);
  }

  /**
   * Check whether the images/ directory is present and non-empty.
   * Uses the dataset-asset registry to find the images directory.
   * @returns {Promise<boolean>}
   */
  async hasImages() {
    const asset = DATASET_ASSETS.find((a) => a.type === 'directory' && a.path === 'images');
    if (!asset) return false;
    const prefix = `${asset.path}/`;
    let found = false;
    this._zip.forEach((relativePath, entry) => {
      if (!found && !entry.dir && relativePath.startsWith(prefix)) {
        found = true;
      }
    });
    return found;
  }

  /**
   * List all image file paths (relative to ZIP root).
   * Uses the dataset-asset registry to find the images directory.
   * @returns {Promise<string[]>}
   */
  async imageFileNames() {
    const asset = DATASET_ASSETS.find((a) => a.type === 'directory' && a.path === 'images');
    if (!asset) return [];
    const prefix = `${asset.path}/`;
    const names = [];
    this._zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.startsWith(prefix)) {
        names.push(relativePath);
      }
    });
    return names.sort();
  }

  /**
   * Read a single image file as a Uint8Array.
   * @param {string} path - relative path starting with 'images/' or just the filename
   * @returns {Promise<Uint8Array | null>}
   */
  async imageFile(path) {
    const asset = DATASET_ASSETS.find((a) => a.type === 'directory' && a.path === 'images');
    if (!asset) return null;
    const fullPath = path.startsWith(`${asset.path}/`) ? path : `${asset.path}/${path}`;
    const entry = this._zip.file(fullPath);
    if (!entry) return null;
    return entry.async('uint8array');
  }

  /**
   * Iterate all image files.
   * @param {(path: string, content: Uint8Array) => void | Promise<void>} callback
   * @returns {Promise<void>}
   */
  async eachImageFile(callback) {
    const names = await this.imageFileNames();
    for (const name of names) {
      const entry = this._zip.file(name);
      if (entry) {
        const content = await entry.async('uint8array');
        await callback(name, content);
      }
    }
  }

  /**
   * Load all image files into a Map (path → Uint8Array).
   * @returns {Promise<Map<string, Uint8Array>>}
   */
  async allImageFiles() {
    const map = new Map();
    await this.eachImageFile((path, content) => { map.set(path, content); });
    return map;
  }

  /**
   * Read a text file from the package.
   * @param {string} filePath
   * @returns {Promise<string | null>} null if the file doesn't exist
   */
  async readText(filePath) {
    const entry = this._zip.file(filePath);
    if (!entry) return null;
    return entry.async('text');
  }

  /**
   * List all entry paths in the package.
   * @returns {Array<{ path: string, dir: boolean }>}
   */
  entryPaths() {
    const entries = [];
    this._zip.forEach((relativePath, entry) => {
      entries.push({ path: relativePath, dir: !!entry.dir });
    });
    return entries;
  }

  /**
   * Check whether a specific entry exists in the package.
   * @param {string} filePath
   * @returns {boolean}
   */
  hasEntry(filePath) {
    return this._zip.file(filePath) != null;
  }

  /** @private @deprecated Use readText instead */
  async _readText(filePath) {
    return this.readText(filePath);
  }

  // --- Non-verbal entity directories (figures/, tables/, formulas/) ---

  async entityIds(type) {
    const prefix = `${entityDir(type)}/`;
    const ids = [];
    this._zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.startsWith(prefix) && relativePath.endsWith('.yaml')) {
        ids.push(relativePath.slice(prefix.length, -'.yaml'.length));
      }
    });
    return ids.sort(naturalSort);
  }

  async entity(type, id) {
    const raw = await this.readText(entityPath(type, id));
    if (raw === null) return null;
    const yamlData = yaml.load(raw);
    return NonVerbalEntity.fromData({ ...yamlData, type });
  }

  async eachEntity(type, callback) {
    for (const id of await this.entityIds(type)) {
      const entity = await this.entity(type, id);
      if (entity) await callback(entity, id);
    }
  }

  async allEntities(type) {
    const entities = [];
    await this.eachEntity(type, (e) => { entities.push(e); });
    return entities;
  }

  async entityTypes() {
    const seen = new Set();
    this._zip.forEach((relativePath, entry) => {
      if (!entry.dir) {
        const parsed = parseEntityPath(relativePath);
        if (parsed) seen.add(parsed.type);
      }
    });
    return ENTITY_TYPES.filter((t) => seen.has(t));
  }
}

// --- Concept YAML parsing ---

/**
 * Parse concept YAML (canonical or managed format) into a normalized object.
 *
 * @param {string} raw - raw YAML string
 * @param {string} [context] - concept ID or filename for error messages
 * @returns {Concept}
 * @throws {InvalidInputError} if raw is null, undefined, or empty
 * @throws {YamlParseError} if the YAML content is malformed
 *
 * @example
 * const concept = parseConceptYaml('termid: "001"\neng:\n  terms:\n    - designation: test', '001');
 * console.log(concept.localization('eng').terms[0].designation); // "test"
 */
export function parseConceptYaml(raw, context) {
  return conceptParser.parse(raw, context);
}

/**
 * @typedef {Object} GcrMetadata
 * @property {string} shortname - dataset short name
 * @property {string} [version] - dataset version
 * @property {string} [title] - dataset title
 * @property {number} [concept_count] - number of concepts
 * @property {string[]} [languages] - supported language codes
 * @property {string} [schema_version] - schema version
 * @property {string} [glossarist_version] - glossarist tool version
 * @property {string} [created_at] - ISO 8601 creation timestamp
 * @property {Record<string, unknown>} [statistics] - dataset statistics
 */
