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
    assert.equal(r.errors.length, 1);
    assert.equal(r.errors[0].message, 'something broke');
  });

  it('warnings do not affect validity', () => {
    const r = new ValidationResult();
    r.addWarning('minor issue');
    assert.equal(r.valid, true);
    assert.equal(r.warnings.length, 1);
    assert.equal(r.warnings[0].message, 'minor issue');
  });

  it('merge combines results', () => {
    const a = new ValidationResult();
    a.addError('e1');
    const b = new ValidationResult();
    b.addError('e2');
    b.addWarning('w1');
    a.merge(b);
    assert.equal(a.errors.length, 2);
    assert.equal(a.warnings.length, 1);
  });

  it('toJSON produces plain object', () => {
    const r = new ValidationResult();
    r.addError('bad');
    r.addWarning('meh');
    const json = r.toJSON();
    assert.equal(json.valid, false);
    assert.equal(json.errors.length, 1);
    assert.equal(json.warnings.length, 1);
    assert.equal(json.errors[0].message, 'bad');
    assert.equal(json.warnings[0].message, 'meh');
  });

  it('add methods are chainable', () => {
    const r = new ValidationResult();
    const result = r.addError('a').addWarning('b');
    assert.ok(result instanceof ValidationResult);
  });

  it('addError accepts (path, message)', () => {
    const r = new ValidationResult();
    r.addError('field.name', 'is required');
    assert.equal(r.errors[0].path, 'field.name');
    assert.equal(r.errors[0].message, 'is required');
    assert.equal(r.errors[0].severity, 'error');
  });

  it('addWarning accepts (path, message)', () => {
    const r = new ValidationResult();
    r.addWarning('field.name', 'could be better');
    assert.equal(r.warnings[0].path, 'field.name');
    assert.equal(r.warnings[0].message, 'could be better');
    assert.equal(r.warnings[0].severity, 'warning');
  });
});

// --- GcrValidator ---

describe('GcrValidator', () => {
  it('validates a well-formed canonical GCR', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result instanceof ValidationResult);
    assert.equal(result.valid, true, `Unexpected errors: ${result.errors.map(e => e.message).join(', ')}`);
  });

  it('validates a well-formed managed GCR', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'managed.gcr'));
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, true, `Unexpected errors: ${result.errors.map(e => e.message).join(', ')}`);
  });

  it('validates GCR with assets', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'assets.gcr'));
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, true, `Unexpected errors: ${result.errors.map(e => e.message).join(', ')}`);
  });

  it('flags missing metadata', async () => {
    const zip = new JSZip();
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('metadata.yaml')));
  });

  it('flags metadata missing required fields', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\n');
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.errors.some(e => e.message.includes('version')));
    assert.ok(result.errors.some(e => e.message.includes('concept_count')));
  });

  it('flags missing concepts directory', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\nversion: "1.0"\nconcept_count: 0');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.errors.some(e => e.message.includes('No concept files')));
  });

  it('warns on empty images directory', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\nversion: "1.0"\nconcept_count: 1');
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    zip.folder('images');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.warnings.some(w => w.message.includes('images/') && w.message.includes('empty')));
  });

  it('flags invalid YAML in file asset', async () => {
    const zip = new JSZip();
    zip.file('metadata.yaml', 'shortname: test\nversion: "1.0"\nconcept_count: 1');
    zip.file('concepts/001.yaml', 'termid: "001"\neng:\n  terms:\n    - designation: test');
    zip.file('bibliography.yaml', 'invalid: yaml: colon:');
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const pkg = await loadGcr(buf);
    const result = await new GcrValidator().validate(pkg);
    assert.ok(result.errors.some(e => e.message.includes('bibliography.yaml')));
  });
});
