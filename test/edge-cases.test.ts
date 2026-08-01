import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseConceptYaml, naturalSort, loadGcr } from '../src/gcr-reader.js';
import { readConcepts, readConcept, listConceptIds } from '../src/concept-reader.js';
import { InvalidInputError, YamlParseError, GlossaristError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');
const TMPDIR = path.join(__dirname, 'tmp-edge-cases');

// --- parseConceptYaml edge cases ---

describe('parseConceptYaml edge cases', () => {
  it('throws InvalidInputError on null input', () => {
    assert.throws(() => parseConceptYaml(null), (err) => {
      assert.ok(err instanceof InvalidInputError);
      assert.ok(err instanceof GlossaristError);
      return true;
    });
  });

  it('throws InvalidInputError on undefined input', () => {
    assert.throws(() => parseConceptYaml(undefined), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });

  it('throws InvalidInputError on empty string', () => {
    assert.throws(() => parseConceptYaml(''), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });

  it('throws YamlParseError on malformed YAML', () => {
    assert.throws(() => parseConceptYaml(':\n  :\n    - ['), (err) => {
      assert.ok(err instanceof YamlParseError);
      assert.ok(err.cause);
      return true;
    });
  });

  it('throws YamlParseError on YAML producing null docs', () => {
    assert.throws(() => parseConceptYaml('---\n---\n'), (err) => {
      assert.ok(err instanceof YamlParseError);
      return true;
    });
  });

  it('includes context in error messages', () => {
    assert.throws(() => parseConceptYaml(null, '3.1.1.1'), (err) => {
      assert.ok(err instanceof InvalidInputError);
      assert.ok(err.message.includes('3.1.1.1'));
      return true;
    });
  });

  it('includes context in YamlParseError', () => {
    assert.throws(() => parseConceptYaml(':\n  :\n    - [', 'concepts/3.1.1.1.yaml'), (err) => {
      assert.ok(err instanceof YamlParseError);
      assert.ok(err.message.includes('concepts/3.1.1.1.yaml'));
      return true;
    });
  });

  it('handles YAML with only a termid and no localizations', () => {
    const raw = 'termid: "999"';
    const concept = parseConceptYaml(raw);
    assert.equal(concept.termid, '999');
    assert.equal(concept.languages.length, 0);
    assert.equal(concept.term, null);
  });

  it('handles managed concept with missing localization docs', () => {
    const raw = [
      '---',
      'data:',
      '  identifier: "empty"',
      '  localized_concepts:',
      '    eng: uuid-missing',
      'id: uuid-main',
    ].join('\n');
    const concept = parseConceptYaml(raw);
    assert.equal(concept.termid, 'empty');
    assert.equal(concept.languages.length, 0);
  });

  it('discovers non-standard language codes dynamically', () => {
    const raw = [
      'termid: "lang-test"',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: test',
      'tha:',
      '  terms:',
      '    - type: expression',
      '      designation: ทดสอบ',
      'hin:',
      '  terms:',
      '    - type: expression',
      '      designation: परीक्षण',
    ].join('\n');
    const concept = parseConceptYaml(raw);
    assert.ok(concept.localization('eng'));
    assert.ok(concept.localization('tha'));
    assert.ok(concept.localization('hin'));
    assert.equal(concept.localization('tha').terms[0].designation, 'ทดสอบ');
    assert.equal(concept.localization('hin').terms[0].designation, 'परीक्षण');
  });
});

// --- loadGcr edge cases ---

describe('loadGcr edge cases', () => {
  it('throws InvalidInputError on null', async () => {
    await assert.rejects(() => loadGcr(null), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });

  it('throws InvalidInputError on undefined', async () => {
    await assert.rejects(() => loadGcr(undefined), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });

  it('loads from base64 string', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const b64 = buf.toString('base64');
    const pkg = await loadGcr(b64);
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'test-canonical');
  });

  it('does not treat short strings as base64', async () => {
    await assert.rejects(() => loadGcr('abc'), (err) => {
      assert.ok(!(err instanceof InvalidInputError));
      return true;
    });
  });
});

// --- naturalSort edge cases ---

describe('naturalSort edge cases', () => {
  it('sorts mixed alpha-numeric IDs', () => {
    const ids = ['abc10', 'abc2', 'abc1'];
    assert.deepEqual(ids.sort(naturalSort), ['abc1', 'abc2', 'abc10']);
  });

  it('returns 0 for equal strings', () => {
    assert.equal(naturalSort('3.1.1.1', '3.1.1.1'), 0);
  });

  it('sorts empty strings', () => {
    assert.equal(naturalSort('', ''), 0);
    assert.equal(naturalSort('', 'a') < 0, true);
  });
});

// --- GcrPackage edge cases ---

describe('GcrPackage edge cases', () => {
  it('loads from Uint8Array', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const pkg = await loadGcr(uint8);
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'test-canonical');
  });

  it('loads from ArrayBuffer', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const pkg = await loadGcr(ab);
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'test-canonical');
  });

  it('eachConcept works with async callbacks', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    const ids = [];
    await pkg.eachConcept(async (c) => {
      await new Promise(r => setTimeout(r, 0));
      ids.push(c.termid);
    });
    assert.deepEqual(ids, ['001', '002', '003']);
  });

  it('returns null for register when not present', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    const reg = await pkg.register();
    assert.equal(reg, null);
  });

  it('includes concept ID in parse errors', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    // Override a concept with bad YAML to test context propagation
    pkg._zip.file('concepts/bad.yaml', ':\n  :\n    - [');
    await assert.rejects(() => pkg.concept('bad'), (err) => {
      assert.ok(err instanceof YamlParseError);
      assert.ok(err.message.includes('bad'));
      return true;
    });
  });
});

// --- concept-reader input validation ---

describe('concept-reader input validation', () => {
  it('readConcepts throws on empty dir path', () => {
    assert.throws(() => readConcepts(''), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });

  it('readConcept throws on empty id', () => {
    assert.throws(() => readConcept('/tmp', ''), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });

  it('listConceptIds throws on empty dir path', () => {
    assert.throws(() => listConceptIds(''), (err) => {
      assert.ok(err instanceof InvalidInputError);
      return true;
    });
  });
});

// --- concept-reader edge cases ---

describe('readConcepts edge cases', () => {
  before(() => {
    fs.mkdirSync(TMPDIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(TMPDIR, { recursive: true, force: true });
  });

  it('returns empty array for empty directory', () => {
    const emptyDir = path.join(TMPDIR, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const concepts = readConcepts(emptyDir);
    assert.deepEqual(concepts, []);
  });

  it('skips register.yaml', () => {
    const dir = path.join(TMPDIR, 'with-register');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'register.yaml'), 'shortname: test\n');
    fs.writeFileSync(path.join(dir, '001.yaml'), [
      'termid: "001"',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: test',
    ].join('\n'));
    const concepts = readConcepts(dir);
    assert.equal(concepts.length, 1);
  });

  it('skips non-yaml files', () => {
    const dir = path.join(TMPDIR, 'mixed-files');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'readme.txt'), 'ignore me');
    fs.writeFileSync(path.join(dir, '001.yaml'), [
      'termid: "001"',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: test',
    ].join('\n'));
    const concepts = readConcepts(dir);
    assert.equal(concepts.length, 1);
  });

  it('handles unicode in designations', () => {
    const dir = path.join(TMPDIR, 'unicode');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'u1.yaml'), [
      'termid: "u1"',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: 你好世界',
      '  definition:',
      '    - content: データ処理の基本概念',
    ].join('\n'));
    const concepts = readConcepts(dir);
    assert.equal(concepts[0].localization('eng').terms[0].designation, '你好世界');
    assert.equal(concepts[0].localization('eng').definition[0].content, 'データ処理の基本概念');
  });
});

// --- Error classes ---

describe('Error classes', () => {
  it('GlossaristError preserves name and message', () => {
    const err = new GlossaristError('test message');
    assert.equal(err.name, 'GlossaristError');
    assert.equal(err.message, 'test message');
    assert.ok(err instanceof Error);
  });

  it('GlossaristError stores cause', () => {
    const cause = new Error('original');
    const err = new GlossaristError('wrapped', { cause });
    assert.equal(err.cause, cause);
  });

  it('InvalidInputError includes expected description', () => {
    const err = new InvalidInputError('bad input', 'a string');
    assert.ok(err.message.includes('bad input'));
    assert.ok(err.message.includes('a string'));
  });

  it('YamlParseError chains original error', () => {
    const original = new SyntaxError('bad yaml');
    const err = new YamlParseError('concept 3.1.1.1', original);
    assert.equal(err.name, 'YamlParseError');
    assert.equal(err.cause, original);
    assert.ok(err.message.includes('concept 3.1.1.1'));
    assert.ok(err.message.includes('bad yaml'));
  });
});
