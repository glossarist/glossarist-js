import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LocalizedConcept } from '../../src/models/localized-concept.js';
import { Expression } from '../../src/models/designation.js';

describe('LocalizedConcept', () => {
  it('parses terms lazily', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'test' }],
      definition: [{ content: 'A test definition.' }],
      entry_status: 'valid',
    });

    assert.equal(lc.languageCode, 'eng');
    assert.equal(lc.entryStatus, 'valid');
    assert.ok(lc.terms[0] instanceof Expression);
    assert.equal(lc.terms[0].designation, 'test');
    assert.equal(lc.primaryDesignation, 'test');
    assert.equal(lc.primaryDefinition, 'A test definition.');
  });

  it('returns null primaryDesignation with no terms', () => {
    const lc = new LocalizedConcept({ language_code: 'eng' });
    assert.equal(lc.primaryDesignation, null);
  });

  it('returns null primaryDefinition with no definitions', () => {
    const lc = new LocalizedConcept({ language_code: 'eng' });
    assert.equal(lc.primaryDefinition, null);
  });

  it('definition getter aliases definitions', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      definition: [{ content: 'same array' }],
    });
    assert.strictEqual(lc.definition, lc.definitions);
  });

  it('parses sources lazily into ConceptSource instances', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      sources: [{ type: 'authoritative', origin: { ref: { source: 'ISO', id: '9000:2015' } } }],
    });
    assert.equal(lc.sources[0].type, 'authoritative');
    assert.equal(lc.sources[0].origin.ref.source, 'ISO');
    assert.equal(lc.sources[0].origin.ref.id, '9000:2015');
  });

  it('round-trips via toJSON/fromJSON', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'entity', normative_status: 'preferred' }],
      definition: [{ content: 'A thing.' }],
      notes: [{ content: 'A note.' }],
      examples: [{ content: 'An example.' }],
      entry_status: 'valid',
    });
    const json = lc.toJSON();
    const restored = LocalizedConcept.fromJSON(json);
    assert.ok(lc.equals(restored));
  });

  it('accepts both camelCase and snake_case keys', () => {
    const a = new LocalizedConcept({ language_code: 'eng', entry_status: 'valid' });
    const b = new LocalizedConcept({ languageCode: 'eng', entryStatus: 'valid' });
    assert.equal(a.languageCode, b.languageCode);
    assert.equal(a.entryStatus, b.entryStatus);
  });

  it('toJSON includes language_code', () => {
    const lc = new LocalizedConcept({ language_code: 'fra' });
    assert.equal(lc.toJSON().language_code, 'fra');
  });

  it('caches parsed terms across multiple accesses', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'cached' }],
    });
    const first = lc.terms;
    const second = lc.terms;
    assert.strictEqual(first, second);
  });
});
