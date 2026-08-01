import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeConcept, writeConcepts } from '../src/concept-writer.js';
import { readConcepts, readRegister } from '../src/concept-reader.js';
import { parseConceptYaml } from '../src/gcr-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMPDIR = path.join(__dirname, 'tmp-writer');

describe('writeConcept', () => {
  before(() => fs.mkdirSync(TMPDIR, { recursive: true }));
  after(() => fs.rmSync(TMPDIR, { recursive: true, force: true }));

  it('writes a concept that can be re-read', () => {
    const concept = parseConceptYaml([
      'termid: "001"',
      'term: test',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: test term',
      '  definition:',
      '    - content: A test concept.',
      '  entry_status: valid',
    ].join('\n'));

    writeConcept(TMPDIR, concept);
    const read = readConcepts(TMPDIR);
    assert.equal(read.length, 1);
    assert.equal(read[0].primaryDesignation('eng'), 'test term');
  });

  it('throws on missing id', () => {
    assert.throws(() => writeConcept(TMPDIR, {}));
  });

  it('throws on empty dir', () => {
    assert.throws(() => writeConcept('', { id: 'x' }));
  });
});

describe('writeConcepts', () => {
  const DIR = path.join(TMPDIR, 'batch');

  it('writes multiple concepts + register', () => {
    const c1 = parseConceptYaml('termid: "001"\neng:\n  terms:\n    - designation: alpha');
    const c2 = parseConceptYaml('termid: "002"\neng:\n  terms:\n    - designation: beta');

    writeConcepts(DIR, [c1, c2], { register: { schema_version: '1', shortname: 'test' } });

    const read = readConcepts(DIR);
    assert.equal(read.length, 2);

    const reg = readRegister(DIR);
    assert.equal(reg.shortname, 'test');
  });
});
