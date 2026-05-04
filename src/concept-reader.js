import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { parseConceptYaml, naturalSort } from './gcr-reader.js';

/**
 * Read all v2 glossarist concept YAML files from a directory.
 * Handles both canonical format (termid + language keys) and
 * managed concept format (data.identifier + data.localized_concepts).
 *
 * Returns an array of normalized concept objects.
 */
export function readConcepts(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.yaml') && f !== 'register.yaml')
    .sort(naturalSortKey);

  const concepts = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const concept = parseConceptYaml(raw);
    if (concept && concept.termid) {
      concepts.push(concept);
    }
  }
  return concepts;
}

/**
 * Read a single concept file by ID from a directory.
 */
export function readConcept(dir, id) {
  const filePath = path.join(dir, `${id}.yaml`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseConceptYaml(raw);
}

/**
 * List all concept IDs in a directory.
 */
export function listConceptIds(dir, prefix) {
  let files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml') && f !== 'register.yaml');
  if (prefix) {
    files = files.filter(f => f.startsWith(prefix));
  }
  return files
    .map(f => f.slice(0, -'.yaml'.length))
    .sort(naturalSort);
}

/**
 * Read register.yaml from a dataset directory (if present).
 */
export function readRegister(dir) {
  const p = path.join(dir, 'register.yaml');
  if (!fs.existsSync(p)) return null;
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

function naturalSortKey(a, b) {
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
