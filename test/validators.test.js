import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConcept, validateRegister, createConceptValidator, ValidationError, ValidationResult } from '../src/validators/index.js';
import { parseConceptYaml } from '../src/gcr-reader.js';
import { Concept } from '../src/models/concept.js';
import { RelationshipTypeRule } from '../src/validators/relationship-type-rule.js';

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
    assert.ok(result instanceof ValidationResult);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('flags missing id', () => {
    const result = validateConcept(new Concept({ localizations: { eng: { terms: [{ type: 'expression', designation: 'x' }] } } }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.path === 'id'));
  });

  it('warns on empty localizations', () => {
    const result = validateConcept(new Concept({ id: '001' }));
    assert.ok(result.warnings.some(w => w.path === 'localizations'));
  });

  it('warns on localization with no terms', () => {
    const result = validateConcept(new Concept({ id: '001', localizations: { eng: {} } }));
    assert.ok(result.warnings.some(w => w.path.includes('terms')));
  });

  it('detects invalid language codes', () => {
    const result = validateConcept(new Concept({
      id: '001',
      localizations: { 'english': { terms: [{ type: 'expression', designation: 'x' }] } },
    }));
    assert.ok(result.errors.some(e => e.message.includes('Invalid language code')));
  });

  it('detects unknown designation types', () => {
    const result = validateConcept(new Concept({
      id: '001',
      localizations: { eng: { terms: [{ type: 'unknown_type', designation: 'x' }] } },
    }));
    assert.ok(result.errors.some(e => e.message.includes('Unknown designation type')));
  });

  it('detects unknown entry statuses', () => {
    const result = validateConcept(new Concept({
      id: '001',
      localizations: { eng: { terms: [{ type: 'expression', designation: 'x' }], entry_status: 'banana' } },
    }));
    assert.ok(result.errors.some(e => e.message.includes('Unknown entry status')));
  });
});

describe('validateRegister', () => {
  it('validates a well-formed register', () => {
    const result = validateRegister({ schema_version: '1', shortname: 'test' });
    assert.ok(result instanceof ValidationResult);
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
      validate: (_value, _path, _result) => { called = true; },
    });
    v.validate(new Concept({ id: '001', localizations: {} }));
    assert.equal(called, true);
  });
});

describe('ValidationError', () => {
  it('toString formats correctly', () => {
    const e = new ValidationError('path.to.field', 'bad value', 'warning');
    assert.equal(e.toString(), '[WARNING] path.to.field: bad value');
  });

  it('toJSON produces plain object', () => {
    const e = new ValidationError('path', 'msg', 'error');
    assert.deepEqual(e.toJSON(), { path: 'path', message: 'msg', severity: 'error' });
  });
});

describe('RelationshipTypeRule', () => {
  it('passes for known relationship types', () => {
    const rule = new RelationshipTypeRule();
    const result = new ValidationResult();
    const concept = new Concept({
      id: '001',
      related: [
        { type: 'broader', ref: { source: 'IEV', id: '103' } },
        { type: 'supersedes', content: 'old concept' },
      ],
      localizations: {
        eng: {
          related: [{ type: 'see', ref: { source: 'IEV', id: '100' } }],
          terms: [{ type: 'expression', designation: 'test' }],
        },
      },
    });
    rule.validate(concept, '', result);
    assert.equal(result.warnings.length, 0);
  });

  it('warns on unknown relationship type at concept level', () => {
    const rule = new RelationshipTypeRule();
    const result = new ValidationResult();
    const concept = new Concept({
      id: '001',
      related: [{ type: 'banana' }],
      localizations: {},
    });
    rule.validate(concept, '', result);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].severity, 'warning');
    assert.ok(result.warnings[0].message.includes('banana'));
  });

  it('warns on unknown relationship type at localization level', () => {
    const rule = new RelationshipTypeRule();
    const result = new ValidationResult();
    const concept = new Concept({
      id: '001',
      localizations: {
        eng: { related: [{ type: 'mystery_type' }], terms: [{ type: 'expression', designation: 'x' }] },
      },
    });
    rule.validate(concept, '', result);
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0].path.includes('localizations.eng'));
  });

  it('is included in validateConcept', () => {
    const concept = new Concept({
      id: '001',
      related: [{ type: 'unknown_rel' }],
      localizations: { eng: { terms: [{ type: 'expression', designation: 'x' }] } },
    });
    const result = validateConcept(concept);
    assert.ok(result.warnings.some(w => w.message.includes('unknown_rel')));
  });

  it('accepts designation types in terms[].related', () => {
    const rule = new RelationshipTypeRule();
    const result = new ValidationResult();
    const concept = new Concept({
      id: '001',
      localizations: {
        eng: {
          terms: [{
            type: 'expression',
            designation: 'LED',
            related: [{ type: 'abbreviated_form_for', target: 'Light Emitting Diode' }],
          }],
        },
      },
    });
    rule.validate(concept, '', result);
    assert.equal(result.warnings.length, 0);
  });

  it('warns on unknown type in terms[].related', () => {
    const rule = new RelationshipTypeRule();
    const result = new ValidationResult();
    const concept = new Concept({
      id: '001',
      localizations: {
        eng: {
          terms: [{
            type: 'expression',
            designation: 'test',
            related: [{ type: 'broader' }],
          }],
        },
      },
    });
    rule.validate(concept, '', result);
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0].path.includes('terms[0].related'));
  });
});
