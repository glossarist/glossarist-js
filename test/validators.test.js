import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConcept, validateRegister, createConceptValidator, ValidationError } from '../src/validators/index.js';
import { parseConceptYaml } from '../src/gcr-reader.js';

describe('validateConcept', () => {
  it('validates a well-formed concept', () => {
    const c = parseConceptYaml([
      'termid: "001"',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: test',
      '  definition:',
      '    - content: A test.',
    ].join('\n'));
    const result = validateConcept(c);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('flags missing id', () => {
    const result = validateConcept({ localizations: { eng: { terms: [{ type: 'expression', designation: 'x' }] } } });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.path === 'id'));
  });

  it('warns on empty localizations', () => {
    const result = validateConcept({ id: '001' });
    assert.ok(result.warnings.some(w => w.path === 'localizations'));
  });

  it('warns on localization with no terms', () => {
    const result = validateConcept({ id: '001', localizations: { eng: {} } });
    assert.ok(result.warnings.some(w => w.path.includes('terms')));
  });

  it('detects invalid language codes', () => {
    const result = validateConcept({
      id: '001',
      localizations: { 'english': { terms: [{ type: 'expression', designation: 'x' }] } },
    });
    assert.ok(result.errors.some(e => e.message.includes('Invalid language code')));
  });

  it('detects unknown designation types', () => {
    const result = validateConcept({
      id: '001',
      localizations: { eng: { terms: [{ type: 'unknown_type', designation: 'x' }] } },
    });
    assert.ok(result.errors.some(e => e.message.includes('Unknown designation type')));
  });

  it('detects unknown entry statuses', () => {
    const result = validateConcept({
      id: '001',
      localizations: { eng: { terms: [{ type: 'expression', designation: 'x' }], entry_status: 'banana' } },
    });
    assert.ok(result.errors.some(e => e.message.includes('Unknown entry status')));
  });
});

describe('validateRegister', () => {
  it('validates a well-formed register', () => {
    const result = validateRegister({ schema_version: '1', shortname: 'test' });
    assert.equal(result.valid, true);
  });

  it('flags null input', () => {
    const result = validateRegister(null);
    assert.equal(result.valid, false);
  });

  it('warns on missing schema_version', () => {
    const result = validateRegister({ shortname: 'test' });
    assert.ok(result.warnings.some(w => w.path === 'schema_version'));
  });
});

describe('createConceptValidator', () => {
  it('allows adding custom rules', () => {
    const v = createConceptValidator();
    let called = false;
    v.addRule({
      name: 'test-rule',
      severity: 'error',
      validate: () => { called = true; return []; },
    });
    v.validate({ id: '001', localizations: {} });
    assert.equal(called, true);
  });
});

describe('ValidationError', () => {
  it('toString formats correctly', () => {
    const e = new ValidationError('path.to.field', 'bad value', 'warning');
    assert.equal(e.toString(), '[WARNING] path.to.field: bad value');
  });
});
