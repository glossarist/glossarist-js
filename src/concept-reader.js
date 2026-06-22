import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { conceptParser } from './concept-parser.js';
import { naturalSort } from './sort.js';
import { InvalidInputError } from './errors.js';
import { Register } from './models/register.js';

function assertDir(dir, fnName) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new InvalidInputError(`${fnName} requires a directory path`, 'non-empty string');
  }
}

/**
 * Read all v2 glossarist concept YAML files from a directory.
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
  return concepts;
}

/**
 * Read a single concept file by ID from a directory.
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
  return conceptParser.parse(raw, `${id}.yaml`);
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
