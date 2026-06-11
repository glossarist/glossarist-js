import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { Citation } from '../../src/models/citation.js';
import { ConceptReference } from '../../src/models/concept-reference.js';
import { ConceptSource } from '../../src/models/concept-source.js';
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

  it('languageCodes is alias for languages', () => {
    const c = makeConcept();
    assert.deepEqual(c.languageCodes, c.languages);
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

  it('toJSON preserves annotations through Concept round-trip', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'annotated' }],
      definition: [{ content: 'A concept with annotations.' }],
      annotations: [{ content: 'Usage note.' }],
    });
    const c = new Concept({ id: 'ann-001', localizations: { eng: lc.toJSON() } });
    const json = c.toJSON();
    assert.equal(json.localizations.eng.annotations[0].content, 'Usage note.');
    const c2 = Concept.fromJSON(json);
    assert.equal(c2.localization('eng').annotations[0].content, 'Usage note.');
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
      sources: [{ type: 'authoritative', origin: { ref: { source: 'ISO', id: '9000' } } }],
    });
    assert.equal(lc.sources.length, 1);
    assert.equal(lc.sources[0].type, 'authoritative');
    assert.ok(lc.sources[0].origin.ref instanceof Citation.Ref);
    assert.equal(lc.sources[0].origin.ref.source, 'ISO');
    assert.equal(lc.sources[0].origin.ref.id, '9000');
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

  it('preserves domain property', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'test' }],
      domain: 'section-103-01',
    });
    assert.equal(lc.domain, 'section-103-01');
    const json = lc.toJSON();
    assert.equal(json.domain, 'section-103-01');
  });
});

describe('ConceptReference model', () => {
  it('creates a domain reference', () => {
    const ref = ConceptReference.domain('area-103');
    assert.equal(ref.conceptId, 'area-103');
    assert.equal(ref.refType, 'domain');
    assert.ok(ref.isLocal);
  });

  it('serializes to JSON with snake_case keys', () => {
    const ref = ConceptReference.domain('section-103-01');
    const json = ref.toJSON();
    assert.deepEqual(json, { concept_id: 'section-103-01', ref_type: 'domain' });
  });

  it('round-trips through fromJSON', () => {
    const ref = ConceptReference.domain('area-103');
    const json = ref.toJSON();
    const ref2 = ConceptReference.fromJSON(json);
    assert.ok(ref.equals(ref2));
  });

  it('handles external references', () => {
    const ref = new ConceptReference({
      source: 'urn:iec:std:iec:60050',
      concept_id: '103-01-01',
      ref_type: 'domain',
    });
    assert.ok(ref.isExternal);
    assert.equal(ref.source, 'urn:iec:std:iec:60050');
  });

  it('handles URN references', () => {
    const ref = new ConceptReference({ urn: 'urn:iso:std:iso:4217' });
    assert.ok(ref.isExternal);
    assert.equal(ref.urn, 'urn:iso:std:iso:4217');
  });
});

describe('Concept domains', () => {
  it('accepts domains as ConceptReference objects', () => {
    const c = new Concept({
      id: '103-01-01',
      domains: [
        ConceptReference.domain('area-103'),
        ConceptReference.domain('section-103-01'),
      ],
    });
    assert.equal(c.domains.length, 2);
    assert.equal(c.domains[0].conceptId, 'area-103');
    assert.equal(c.domains[1].conceptId, 'section-103-01');
  });

  it('normalizes domains from plain objects', () => {
    const c = new Concept({
      id: '103-01-01',
      domains: [
        { concept_id: 'area-103', ref_type: 'domain' },
      ],
    });
    assert.equal(c.domains.length, 1);
    assert.ok(c.domains[0] instanceof ConceptReference);
    assert.equal(c.domains[0].conceptId, 'area-103');
  });

  it('normalizes legacy groups strings to ConceptReference', () => {
    const c = new Concept({
      id: '103-01-01',
      groups: ['area-103', 'section-103-01'],
    });
    assert.equal(c.domains.length, 2);
    assert.ok(c.domains[0] instanceof ConceptReference);
    assert.equal(c.domains[0].conceptId, 'area-103');
    assert.equal(c.domains[0].refType, 'domain');
    assert.equal(c.domains[1].conceptId, 'section-103-01');
  });

  it('prefers domains over groups', () => {
    const c = new Concept({
      id: '103-01-01',
      domains: [{ concept_id: 'area-103', ref_type: 'domain' }],
      groups: ['area-999'],
    });
    assert.equal(c.domains.length, 1);
    assert.equal(c.domains[0].conceptId, 'area-103');
  });

  it('defaults to empty domains', () => {
    const c = new Concept({ id: '001' });
    assert.deepEqual(c.domains, []);
  });

  it('serializes domains in toJSON', () => {
    const c = new Concept({
      id: '103-01-01',
      domains: [
        ConceptReference.domain('area-103'),
        ConceptReference.domain('section-103-01'),
      ],
    });
    const json = c.toJSON();
    assert.equal(json.domains.length, 2);
    assert.equal(json.domains[0].concept_id, 'area-103');
    assert.equal(json.domains[0].ref_type, 'domain');
  });

  it('omits empty domains from toJSON', () => {
    const c = new Concept({ id: '001' });
    const json = c.toJSON();
    assert.equal(json.domains, undefined);
  });

  it('round-trips through fromJSON with domains', () => {
    const c = new Concept({
      id: '103-01-01',
      domains: [ConceptReference.domain('area-103')],
    });
    const json = c.toJSON();
    const c2 = Concept.fromJSON(json);
    assert.equal(c2.domains.length, 1);
    assert.equal(c2.domains[0].conceptId, 'area-103');
  });
});

describe('Concept tags', () => {
  it('stores tags from constructor data', () => {
    const c = new Concept({
      id: '103-01-01',
      tags: ['iec', 'electromagnetism'],
    });
    assert.deepEqual(c.tags, ['iec', 'electromagnetism']);
  });

  it('includes tags in toJSON when present', () => {
    const c = new Concept({
      id: '103-01-01',
      tags: ['iec', 'electromagnetism'],
    });
    const json = c.toJSON();
    assert.deepEqual(json.tags, ['iec', 'electromagnetism']);
  });

  it('omits tags from toJSON when empty', () => {
    const c = new Concept({ id: '103-01-01' });
    const json = c.toJSON();
    assert.equal(json.tags, undefined);
  });

  it('round-trips through fromJSON preserving tags', () => {
    const c = new Concept({
      id: '103-01-01',
      tags: ['iec', 'fundamental'],
    });
    const json = c.toJSON();
    const c2 = Concept.fromJSON(json);
    assert.deepEqual(c2.tags, ['iec', 'fundamental']);
  });

  it('defaults tags to empty array', () => {
    const c = new Concept({ id: '103-01-01' });
    assert.deepEqual(c.tags, []);
  });
});

describe('Concept.findSourceById', () => {
  it('returns null when no source has the id', () => {
    const c = new Concept({
      id: 'c1',
      localizations: { eng: { terms: [{ designation: 'foo' }] } },
    });
    assert.equal(c.findSourceById('anything'), null);
  });

  it('finds a concept-level source by id', () => {
    const source = new ConceptSource({
      id: 'iso-7301-3-2',
      origin: new Citation({ ref: { source: 'ISO', id: '7301', version: '2024' } }),
    });
    const c = new Concept({
      id: 'c1',
      sources: [source],
      localizations: { eng: { terms: [{ designation: 'foo' }] } },
    });
    assert.equal(c.findSourceById('iso-7301-3-2'), source);
  });

  it('finds a localization-level source by id', () => {
    const source = new ConceptSource({
      id: 'iso-7301-3-2',
      origin: new Citation({ ref: { source: 'ISO', id: '7301', version: '2024' } }),
    });
    const c = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          sources: [source],
        },
      },
    });
    assert.equal(c.findSourceById('iso-7301-3-2'), source);
  });

  it('finds a designation-level source by id', () => {
    const source = new ConceptSource({
      id: 'smith-2020',
      origin: new Citation({ ref: { source: 'DOI', id: '10.1234/abc' } }),
    });
    const c = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{
            designation: 'foo',
            sources: [source],
          }],
        },
      },
    });
    assert.equal(c.findSourceById('smith-2020'), source);
  });

  it('skips sources without an id', () => {
    const sourceWithoutId = new ConceptSource({
      origin: new Citation({ ref: { source: 'ISO', id: '7301' } }),
    });
    const c = new Concept({
      id: 'c1',
      sources: [sourceWithoutId],
      localizations: { eng: { terms: [{ designation: 'foo' }] } },
    });
    assert.equal(c.findSourceById('ISO 7301'), null);
  });

  it('returns null for non-string id', () => {
    const c = new Concept({ id: 'c1' });
    assert.equal(c.findSourceById(null), null);
    assert.equal(c.findSourceById(undefined), null);
    assert.equal(c.findSourceById(''), null);
    assert.equal(c.findSourceById(123), null);
  });

  it('returns the first match when ids collide (validator catches this; lookup is forgiving)', () => {
    const a = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'A' } }) });
    const b = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'B' } }) });
    const c = new Concept({
      id: 'c1',
      sources: [a, b],
      localizations: { eng: { terms: [{ designation: 'x' }] } },
    });
    assert.equal(c.findSourceById('foo'), a);
  });
});
