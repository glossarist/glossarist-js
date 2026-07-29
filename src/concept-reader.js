import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { conceptParser } from './concept-parser.js';
import { RelationLoader } from './models/relation-loader.js';
import { naturalSort } from './sort.js';
import { InvalidInputError } from './errors.js';
import { Register } from './models/register.js';

function assertDir(dir, fnName) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new InvalidInputError(`${fnName} requires a directory path`, 'non-empty string');
  }
}

/**
 * Read all v2 glossarist concept YAML files from a directory, then
 * merge in any per-file hyperedge YAMLs from `<dir>/relations/`.
 *
 * Per-file hyperedge storage (concept-model PR #83): each file at
 * `relations/<comprehensive-id>/<slug>.yaml` is loaded and merged
 * into the corresponding Concept.relations array. If the directory
 * does not exist, no per-file hyperedges are loaded (concepts still
 * get any inline hyperedges from their own YAML).
 *
 * @param {string} dir - path to directory containing concept YAML files
 * @returns {import('./models/concept.js').Concept[]}
 * @throws {InvalidInputError} if dir is missing or empty
 *
 * @example
 * const concepts = readConcepts('./geolexica-v2/');
 * console.log(concepts[0].localization('eng').terms[0].designation);
 */
export function readConcepts(dir) {
  assertDir(dir, 'readConcepts');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.yaml') && f !== 'register.yaml')
    .sort(naturalSort);

  const concepts = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const concept = conceptParser.parse(raw, file);
    if (concept && concept.id) {
      concepts.push(concept);
    }
  }

  _mergePerFileHyperedges(dir, concepts);
  return concepts;
}

/**
 * Read a single concept file by ID from a directory, then merge in
 * any per-file hyperedge YAMLs for that concept from
 * `<dir>/relations/<id>/`.
 *
 * @param {string} dir - path to directory containing concept YAML files
 * @param {string} id - concept identifier (filename without .yaml)
 * @returns {import('./models/concept.js').Concept | null}
 * @throws {InvalidInputError} if dir or id is missing or empty
 *
 * @example
 * const concept = readConcept('./geolexica-v2/', '3.1.1.1');
 * if (concept) console.log(concept.termid);
 */
export function readConcept(dir, id) {
  assertDir(dir, 'readConcept');
  if (typeof id !== 'string' || id.trim() === '') {
    throw new InvalidInputError('readConcept requires a concept ID', 'non-empty string');
  }
  const filePath = path.join(dir, `${id}.yaml`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const concept = conceptParser.parse(raw, `${id}.yaml`);
  _mergePerFileHyperedges(dir, [concept]);
  return concept;
}

// Load `relations/` directory and merge per-file hyperedges into the
// matching Concept.relations arrays. Concepts are matched by id.
// Inline hyperedges from the concept YAML are preserved alongside the
// per-file ones (audit: this is the contract — the two sources are
// additive, not exclusive).
//
// Throws if a per-file hyperedge fails to construct (bad YAML, missing
// type, invalid members) — surfaces corruption loudly per the
// RelationLoader contract.
function _mergePerFileHyperedges(dir, concepts) {
  const relationsDir = path.join(dir, 'relations');
  if (!fs.existsSync(relationsDir)) return;

  const byComprehensive = RelationLoader.loadAll(relationsDir);
  if (byComprehensive.size === 0) return;

  for (const concept of concepts) {
    const rels = byComprehensive.get(concept.id);
    if (!rels || rels.length === 0) continue;
    // Merge per-file hyperedges with any inline ones from the concept
    // YAML. Per-file wins on identity collision — they're the newer,
    // more authoritative source.
    const inline = concept.relations;
    const merged = [...inline];
    for (const r of rels) {
      const exists = inline.some(x => _sameHyperedge(x, r));
      if (!exists) merged.push(r);
    }
    concept.relations = merged;
  }
}

function _sameHyperedge(a, b) {
  const aCls = a?.constructor;
  const bCls = b?.constructor;
  if (aCls !== bCls) return false;
  if (typeof aCls.identityOf !== 'function') return false;
  return aCls.identityOf(a) === bCls.identityOf(b);
}

/**
 * List all concept IDs in a directory, optionally filtered by prefix.
 * @param {string} dir - path to directory
 * @param {string} [prefix] - optional prefix filter
 * @returns {string[]}
 * @throws {InvalidInputError} if dir is missing or empty
 *
 * @example
 * const ids = listConceptIds('./geolexica-v2/', '3.1.'); // ['3.1.1.1', '3.1.1.2', ...]
 */
export function listConceptIds(dir, prefix) {
  assertDir(dir, 'listConceptIds');
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
 * @param {string} dir - path to directory
 * @returns {Record<string, unknown> | null}
 * @throws {InvalidInputError} if dir is missing or empty
 */
export function readRegister(dir) {
  assertDir(dir, 'readRegister');
  const p = path.join(dir, 'register.yaml');
  if (!fs.existsSync(p)) return null;
  const raw = yaml.load(fs.readFileSync(p, 'utf8'));
  return Register.fromJSON(raw);
}
