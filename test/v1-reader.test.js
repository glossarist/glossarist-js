import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { V1Reader, migrateV1ToV2 } from '../src/v1-reader.js';
import { conceptParser } from '../src/concept-parser.js';

const TMP = path.join(import.meta.dirname, 'tmp-v1');

function makeV1Dir() {
  const conceptsDir = path.join(TMP, 'concepts');
  fs.mkdirSync(conceptsDir, { recursive: true });

  const c1Dir = path.join(conceptsDir, '001');
  fs.mkdirSync(c1Dir, { recursive: true });
  fs.writeFileSync(path.join(c1Dir, 'concept.yaml'), 'termid: "001"\nterm: alpha\n');
  fs.writeFileSync(path.join(c1Dir, 'eng.yaml'), [
    'terms:',
    '  - type: expression',
    '    designation: alpha',
    'definition:',
    '  - content: First concept.',
    'entry_status: valid',
  ].join('\n'));

  const c2Dir = path.join(conceptsDir, '002');
  fs.mkdirSync(c2Dir, { recursive: true });
  fs.writeFileSync(path.join(c2Dir, 'concept.yaml'), 'termid: "002"\nterm: beta\n');
  fs.writeFileSync(path.join(c2Dir, 'eng.yaml'), [
    'terms:',
    '  - type: expression',
    '    designation: beta',
    'entry_status: draft',
  ].join('\n'));
  fs.writeFileSync(path.join(c2Dir, 'fra.yaml'), [
    'terms:',
    '  - type: expression',
    '    designation: bêta',
  ].join('\n'));

  return conceptsDir;
}

describe('V1Reader', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  describe('isV1Directory', () => {
    it('returns true for v1 directory structure', () => {
      const dir = makeV1Dir();
      assert.ok(V1Reader.isV1Directory(dir));
    });

    it('returns false for v2 directory (flat YAML files)', () => {
      const dir = path.join(TMP, 'v2');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, '001.yaml'), 'termid: "001"\neng:\n  terms:\n    - designation: test');
      assert.ok(!V1Reader.isV1Directory(dir));
    });

    it('returns false for empty directory', () => {
      const dir = path.join(TMP, 'empty');
      fs.mkdirSync(dir, { recursive: true });
      assert.ok(!V1Reader.isV1Directory(dir));
    });
  });

  describe('readConcept', () => {
    it('reads a single v1 concept directory', () => {
      const dir = makeV1Dir();
      const concept = V1Reader.readConcept(path.join(dir, '001'));
      assert.equal(concept.id, '001');
      assert.equal(concept.term, 'alpha');
      assert.equal(concept.primaryDesignation('eng'), 'alpha');
      assert.equal(concept.definition('eng'), 'First concept.');
    });

    it('reads concept with multiple localizations', () => {
      const dir = makeV1Dir();
      const concept = V1Reader.readConcept(path.join(dir, '002'));
      assert.equal(concept.id, '002');
      assert.deepEqual(concept.languages, ['eng', 'fra']);
      assert.equal(concept.primaryDesignation('eng'), 'beta');
      assert.equal(concept.primaryDesignation('fra'), 'bêta');
    });
  });

  describe('readAll', () => {
    it('reads all v1 concepts', () => {
      const dir = makeV1Dir();
      const concepts = V1Reader.readAll(dir);
      assert.equal(concepts.length, 2);
      assert.ok(concepts.some(c => c.id === '001'));
      assert.ok(concepts.some(c => c.id === '002'));
    });
  });

  describe('migrateV1ToV2', () => {
    it('migrates v1 to v2 canonical format', async () => {
      const v1Dir = makeV1Dir();
      const v2Dir = path.join(TMP, 'v2-output');
      await migrateV1ToV2(v1Dir, v2Dir);

      assert.ok(fs.existsSync(path.join(v2Dir, '001.yaml')));
      assert.ok(fs.existsSync(path.join(v2Dir, '002.yaml')));

      const c = conceptParser.parse(fs.readFileSync(path.join(v2Dir, '001.yaml'), 'utf8'));
      assert.equal(c.id, '001');
      assert.equal(c.primaryDesignation('eng'), 'alpha');
    });
  });
});
