import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { LocalizedConcept } from '../../src/models/localized-concept.js';
import { parseConceptYaml } from '../../src/gcr-reader.js';

describe('Concept model', () => {
  const makeConcept = () => parseConceptYaml([
    'termid: "001"',
    'term: first concept',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: first concept',
    '  definition:',
    '    - content: The first concept.',
    '  entry_status: valid',
    'fra:',
    '  terms:',
    '    - type: expression',
    '      designation: premier concept',
    '  definition:',
    '    - content: Le premier concept.',
  ].join('\n'));

  it('has id and termid (backward compat)', () => {
    const c = makeConcept();
    assert.equal(c.id, '001');
    assert.equal(c.termid, '001');
    assert.equal(c.term, 'first concept');
  });

  it('lists languages', () => {
    const c = makeConcept();
    assert.deepEqual(c.languages, ['eng', 'fra']);
  });

  it('returns raw localizations for backward compat', () => {
    const c = makeConcept();
    assert.ok(c.localizations.eng);
    assert.equal(c.localizations.eng.terms[0].designation, 'first concept');
    assert.equal(c.localizations.eng.entry_status, 'valid');
  });

  it('returns LocalizedConcept via localization()', () => {
    const c = makeConcept();
    const lc = c.localization('eng');
    assert.ok(lc instanceof LocalizedConcept);
    assert.equal(lc.languageCode, 'eng');
    assert.equal(lc.primaryDesignation, 'first concept');
    assert.equal(lc.primaryDefinition, 'The first concept.');
  });

  it('returns undefined for missing language', () => {
    const c = makeConcept();
    assert.equal(c.localization('zxx'), undefined);
  });

  it('hasLocalization', () => {
    const c = makeConcept();
    assert.equal(c.hasLocalization('eng'), true);
    assert.equal(c.hasLocalization('zxx'), false);
  });

  it('primaryDesignation and definition shortcuts', () => {
    const c = makeConcept();
    assert.equal(c.primaryDesignation('eng'), 'first concept');
    assert.equal(c.definition('eng'), 'The first concept.');
    assert.equal(c.primaryDesignation('fra'), 'premier concept');
  });

  it('setLocalization updates both raw and cache', () => {
    const c = makeConcept();
    const lc = new LocalizedConcept({
      language_code: 'deu',
      terms: [{ type: 'expression', designation: 'erstes Konzept' }],
      definition: [{ content: 'Das erste Konzept.' }],
    });
    c.setLocalization('deu', lc);
    assert.equal(c.hasLocalization('deu'), true);
    assert.equal(c.localization('deu').primaryDesignation, 'erstes Konzept');
    assert.equal(c.localizations.deu.terms[0].designation, 'erstes Konzept');
  });

  it('caches localization instances', () => {
    const c = makeConcept();
    const lc1 = c.localization('eng');
    const lc2 = c.localization('eng');
    assert.equal(lc1, lc2);
  });

  it('toJSON round-trips', () => {
    const c = makeConcept();
    const json = c.toJSON();
    assert.equal(json.id, '001');
    assert.ok(json.localizations.eng);
    assert.equal(json.localizations.eng.terms[0].designation, 'first concept');
    assert.equal(json.localizations.eng.terms[0].normative_status, 'preferred');

    const c2 = Concept.fromJSON(json);
    assert.equal(c2.id, '001');
    assert.equal(c2.primaryDesignation('eng'), 'first concept');
  });

  it('equals works', () => {
    const c1 = makeConcept();
    const c2 = makeConcept();
    assert.ok(c1.equals(c2));
  });

  it('clone produces equal instance', () => {
    const c = makeConcept();
    const c2 = c.clone();
    assert.ok(c.equals(c2));
    assert.notEqual(c, c2);
  });
});

describe('LocalizedConcept model', () => {
  it('parses terms lazily into Designation instances', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [
        { type: 'expression', designation: 'entity', normative_status: 'preferred' },
        { type: 'abbreviation', designation: 'ent' },
      ],
    });
    assert.equal(lc.terms.length, 2);
    assert.equal(lc.terms[0].designation, 'entity');
    assert.equal(lc.terms[0].normativeStatus, 'preferred');
    assert.equal(lc.terms[1].type, 'abbreviation');
  });

  it('definition is alias for definitions', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      definition: [{ content: 'A thing.' }],
    });
    assert.equal(lc.definitions, lc.definition);
    assert.equal(lc.primaryDefinition, 'A thing.');
  });

  it('parses sources as ConceptSource instances', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      sources: [{ type: 'authoritative', origin: { ref: 'ISO 9000' } }],
    });
    assert.equal(lc.sources.length, 1);
    assert.equal(lc.sources[0].type, 'authoritative');
    assert.equal(lc.sources[0].origin.ref, 'ISO 9000');
  });

  it('toJSON preserves data for round-trip', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'test' }],
      definition: [{ content: 'def' }],
      notes: [{ content: 'note1' }],
      entry_status: 'valid',
    });
    const json = lc.toJSON();
    assert.equal(json.language_code, 'eng');
    assert.equal(json.terms[0].designation, 'test');
    assert.equal(json.definition[0].content, 'def');
    assert.equal(json.entry_status, 'valid');

    const lc2 = LocalizedConcept.fromJSON(json);
    assert.ok(lc.equals(lc2));
  });

  it('handles empty data', () => {
    const lc = new LocalizedConcept();
    assert.equal(lc.languageCode, null);
    assert.deepEqual(lc.terms, []);
    assert.equal(lc.primaryDesignation, null);
    assert.equal(lc.primaryDefinition, null);
  });
});
