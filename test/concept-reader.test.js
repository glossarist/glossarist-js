import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readConcepts, readConcept, listConceptIds, readRegister } from '../src/concept-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMPDIR = path.join(__dirname, 'tmp-concepts');

// Build temporary concept files in both formats
function setupCanonicalDir() {
  fs.mkdirSync(path.join(TMPDIR, 'canonical'), { recursive: true });

  fs.writeFileSync(path.join(TMPDIR, 'canonical', '001.yaml'), [
    'termid: "001"',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      designation: alpha',
    '  definition:',
    '    - content: First concept.',
    '  entry_status: valid',
  ].join('\n'));

  fs.writeFileSync(path.join(TMPDIR, 'canonical', '002.yaml'), [
    'termid: "002"',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      designation: beta',
    '  definition:',
    '    - content: Second concept.',
    '  entry_status: valid',
    'fra:',
    '  terms:',
    '    - type: expression',
    '      designation: bêta',
    '  entry_status: valid',
  ].join('\n'));

  fs.writeFileSync(path.join(TMPDIR, 'canonical', 'register.yaml'), [
    'schema_version: "1"',
    'shortname: test-canonical',
  ].join('\n'));
}

function setupManagedDir() {
  fs.mkdirSync(path.join(TMPDIR, 'managed'), { recursive: true });

  fs.writeFileSync(path.join(TMPDIR, 'managed', '3.1.1.1.yaml'), [
    '---',
    'data:',
    '  identifier: 3.1.1.1',
    '  localized_concepts:',
    '    eng: uuid-aaa',
    'id: uuid-main',
    '---',
    'data:',
    '  definition:',
    '    - content: concrete or abstract thing',
    '  terms:',
    '    - type: expression',
    '      designation: entity',
    '  language_code: eng',
    '  entry_status: valid',
    'id: uuid-aaa',
  ].join('\n'));
}

describe('readConcepts (canonical format)', () => {
  before(setupCanonicalDir);

  it('reads all concepts from directory', () => {
    const concepts = readConcepts(path.join(TMPDIR, 'canonical'));
    assert.equal(concepts.length, 2);
    assert.equal(concepts[0].termid, '001');
    assert.equal(concepts[1].termid, '002');
  });

  it('normalizes canonical concepts with localizations', () => {
    const concepts = readConcepts(path.join(TMPDIR, 'canonical'));
    const c2 = concepts.find(c => c.termid === '002');
    assert.ok(c2);
    assert.ok(c2.localizations.eng);
    assert.ok(c2.localizations.fra);
    assert.equal(c2.localizations.eng.terms[0].designation, 'beta');
    assert.equal(c2.localizations.fra.terms[0].designation, 'bêta');
  });
});

describe('readConcept (single file)', () => {
  before(setupCanonicalDir);

  it('reads a single concept by ID', () => {
    const c = readConcept(path.join(TMPDIR, 'canonical'), '001');
    assert.ok(c);
    assert.equal(c.termid, '001');
    assert.equal(c.localizations.eng.terms[0].designation, 'alpha');
  });

  it('returns null for missing concept', () => {
    const c = readConcept(path.join(TMPDIR, 'canonical'), '999');
    assert.equal(c, null);
  });
});

describe('readConcepts (managed concept format)', () => {
  before(setupManagedDir);

  it('reads multi-doc managed concepts', () => {
    const concepts = readConcepts(path.join(TMPDIR, 'managed'));
    assert.equal(concepts.length, 1);
    assert.equal(concepts[0].termid, '3.1.1.1');
    assert.equal(concepts[0].localizations.eng.terms[0].designation, 'entity');
  });
});

describe('listConceptIds', () => {
  before(setupCanonicalDir);

  it('lists all concept IDs', () => {
    const ids = listConceptIds(path.join(TMPDIR, 'canonical'));
    assert.deepEqual(ids, ['001', '002']);
  });

  it('filters by prefix', () => {
    const ids = listConceptIds(path.join(TMPDIR, 'canonical'), '00');
    assert.deepEqual(ids, ['001', '002']);
  });

  it('returns empty for no match', () => {
    const ids = listConceptIds(path.join(TMPDIR, 'canonical'), '99');
    assert.deepEqual(ids, []);
  });
});

describe('readRegister', () => {
  before(setupCanonicalDir);

  it('reads register.yaml', () => {
    const reg = readRegister(path.join(TMPDIR, 'canonical'));
    assert.ok(reg);
    assert.equal(reg.shortname, 'test-canonical');
    assert.equal(reg.schema_version, '1');
  });

  it('returns null when register.yaml is absent', () => {
    const reg = readRegister(path.join(TMPDIR, 'managed'));
    assert.equal(reg, null);
  });
});

after(() => {
  fs.rmSync(TMPDIR, { recursive: true, force: true });
});
