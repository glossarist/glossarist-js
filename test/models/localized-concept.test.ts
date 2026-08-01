import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LocalizedConcept } from '../../src/models/localized-concept.js';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
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

  it('parses annotations lazily into DetailedDefinition instances', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      annotations: [
        { content: 'An annotation.' },
        { content: 'Another annotation.', sources: [{ ref: { source: 'ISO', id: '9000' } }] },
      ],
    });
    assert.equal(lc.annotations.length, 2);
    assert.ok(lc.annotations[0] instanceof DetailedDefinition);
    assert.equal(lc.annotations[0].content, 'An annotation.');
    assert.equal(lc.annotations[1].sources.length, 1);
  });

  it('annotations default to empty array', () => {
    const lc = new LocalizedConcept({ language_code: 'eng' });
    assert.deepEqual(lc.annotations, []);
  });

  it('annotations round-trip via toJSON/fromJSON', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'test' }],
      annotations: [{ content: 'Note on usage.' }],
    });
    const json = lc.toJSON();
    assert.equal(json.annotations[0].content, 'Note on usage.');
    const restored = LocalizedConcept.fromJSON(json);
    assert.ok(lc.equals(restored));
    assert.equal(restored.annotations[0].content, 'Note on usage.');
  });

  it('caches parsed annotations across multiple accesses', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      annotations: [{ content: 'cached annotation' }],
    });
    const first = lc.annotations;
    const second = lc.annotations;
    assert.strictEqual(first, second);
  });

  it('omits annotations from toJSON when empty', () => {
    const lc = new LocalizedConcept({ language_code: 'eng' });
    assert.equal(lc.toJSON().annotations, undefined);
  });

  it('walkTexts yields every slot in canonical order with rooted paths', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      definition: [{ content: 'def' }],
      notes: [{ content: 'note' }],
      examples: [{ content: 'ex' }],
      annotations: [{ content: 'ann' }],
    });
    const out = [...lc.walkTexts('localizations.eng')];
    assert.deepEqual(out, [
      { text: 'def', source: 'localizations.eng.definitions[0].content' },
      { text: 'note', source: 'localizations.eng.notes[0].content' },
      { text: 'ex', source: 'localizations.eng.examples[0].content' },
      { text: 'ann', source: 'localizations.eng.annotations[0].content' },
    ]);
  });

  it('walkTexts recurses into nested examples inside any slot', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      notes: [{
        content: 'outer note',
        examples: [
          { content: 'scoped example inside note' },
        ],
      }],
    });
    const out = [...lc.walkTexts('localizations.eng')];
    assert.deepEqual(out, [
      { text: 'outer note', source: 'localizations.eng.notes[0].content' },
      { text: 'scoped example inside note', source: 'localizations.eng.notes[0].examples[0].content' },
    ]);
  });

  it('walkTexts yields nothing for an empty localized concept', () => {
    const lc = new LocalizedConcept({ language_code: 'eng' });
    assert.deepEqual([...lc.walkTexts('localizations.eng')], []);
  });
});
