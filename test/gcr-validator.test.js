import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { GcrValidator } from '../src/validators/gcr-validator.js';
import { ValidationResult } from '../src/validators/validation-result.js';
import { loadGcr } from '../src/gcr-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

// --- ValidationResult ---

describe('ValidationResult', () => {
  it('starts empty and valid', () => {
    const r = new ValidationResult();
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
  });

  it('becomes invalid after addError', () => {
    const r = new ValidationResult();
    r.addError('something broke');
    assert.equal(r.valid, false);
    assert.deepEqual(r.errors, ['something broke']);
  });

  it('warnings do not affect validity', () => {
    const r = new ValidationResult();
    r.addWarning('minor issue');
    assert.equal(r.valid, true);
    assert.deepEqual(r.warnings, ['minor issue']);
  });

  it('merge combines results', () => {
    const a = new ValidationResult();
    a.addError('e1');
    const b = new ValidationResult();
    b.addError('e2');
    b.addWarning('w1');
    a.merge(b);
    assert.deepEqual(a.errors, ['e1', 'e2']);
    assert.deepEqual(a.warnings, ['w1']);
  });

  it('toJSON produces plain object', () => {
    const r = new ValidationResult();
    r.addError('bad');
    r.addWarning('meh');
    const json = r.toJSON();
    assert.equal(json.valid, false);
    assert.deepEqual(json.errors, ['bad']);
    assert.deepEqual(json.warnings, ['meh']);
  });

  it('add methods are chainable', () => {
    const r = new ValidationResult();
    const result = r.addError('a').addWarning('b');
    assert.ok(result instanceof ValidationResult);
  });
});

// --- GcrValidator ---

describe('GcrValidator', () => {
  it('validates a well-formed canonical GCR', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
  });

  it('validates a well-formed managed GCR', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'managed.gcr'));
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
  });

  it('validates GCR with assets', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'assets.gcr'));
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
  });

  it('flags missing metadata', async () => {
    const zip = new JSZip();
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('metadata.yaml')));
  });

  it('flags metadata missing required fields', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\n');
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.errors.some((e) => e.includes('version')));
    assert.ok(result.errors.some((e) => e.includes('concept_count')));
  });

  it('flags missing concepts directory', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\nversion: "1.0"\nconcept_count: 0');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.errors.some((e) => e.includes('No concept files')));
  });

  it('warns on empty images directory', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\nversion: "1.0"\nconcept_count: 1');
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    zip.folder('images');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.warnings.some((w) => w.includes('images/') && w.includes('empty')));
  });

  it('flags invalid YAML in file asset', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\nversion: "1.0"\nconcept_count: 1');
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    zip.file('bibliography.yaml', 'invalid: yaml: colon:');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.errors.some((e) => e.includes('bibliography.yaml')));
  });
});
