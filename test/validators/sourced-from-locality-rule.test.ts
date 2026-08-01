import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import { SourcedFromLocalityRule } from '../../src/validators/sourced-from-locality-rule.js';
import { ValidationResult } from '../../src/validators/validation-result.js';

describe('SourcedFromLocalityRule', () => {
  it('has the correct rule name and error severity', () => {
    const rule = new SourcedFromLocalityRule();
    assert.equal(rule.name, 'sourced-from-locality');
    assert.equal(rule.severity, 'error');
  });

  it('passes when no sources exist', () => {
    const concept = new Concept({ id: '1' });
    const result = new ValidationResult();
    new SourcedFromLocalityRule().validate(concept, '', result);
    assert.equal(result.errors.length, 0);
  });

  it('passes when sources have no sourced_from', () => {
    const concept = new Concept({
      id: '1',
      sources: [new ConceptSource({ type: 'authoritative' })],
    });
    const result = new ValidationResult();
    new SourcedFromLocalityRule().validate(concept, '', result);
    assert.equal(result.errors.length, 0);
  });

  it('passes when sourced_from has locality', () => {
    const concept = new Concept({
      id: '1',
      sources: [new ConceptSource({
        type: 'lineage',
        sourced_from: [{
          ref: { source: 'ISO', id: '9000' },
          locality: { type: 'clause', reference_from: '3.1' },
        }],
      })],
    });
    const result = new ValidationResult();
    new SourcedFromLocalityRule().validate(concept, '', result);
    assert.equal(result.errors.length, 0);
  });

  it('errors when sourced_from has no locality', () => {
    const concept = new Concept({
      id: '1',
      sources: [new ConceptSource({
        type: 'lineage',
        sourced_from: [{
          ref: { source: 'ISO', id: '9000' },
        }],
      })],
    });
    const result = new ValidationResult();
    new SourcedFromLocalityRule().validate(concept, '', result);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /no locality/);
    assert.match(result.errors[0].path, /sources\[0\]\.sourced_from\[0\]\.locality/);
  });

  it('errors when locality object is empty', () => {
    const concept = new Concept({
      id: '1',
      sources: [new ConceptSource({
        type: 'lineage',
        sourced_from: [{
          ref: { source: 'ISO', id: '9000' },
          locality: {},
        }],
      })],
    });
    const result = new ValidationResult();
    new SourcedFromLocalityRule().validate(concept, '', result);
    assert.equal(result.errors.length, 1);
  });

  it('checks localization-level sources too', () => {
    const concept = new Concept({
      id: '1',
      localizations: {
        eng: {
          language_code: 'eng',
          sources: [{
            type: 'lineage',
            sourced_from: [{ ref: { source: 'ISO', id: '9000' } }],
          }],
        },
      },
    });
    const result = new ValidationResult();
    new SourcedFromLocalityRule().validate(concept, '', result);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].path, /localizations\.eng\.sources/);
  });
});
