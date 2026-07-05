import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/index.js';
import { Designation } from '../../src/models/designation.js';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
import { conceptToQuads, collectQuads, conceptUri } from '../../src/rdf/index.js';

function buildConcept(overrides = {}) {
  return new Concept({
    id: '3.1.1',
    status: 'valid',
    localizations: {
      eng: {
        language_code: 'eng',
        terms: [new Designation({ type: 'expression', designation: 'atomic data unit', normative_status: 'preferred' })],
        definition: [new DetailedDefinition({ content: 'A data unit that cannot be subdivided.' })],
        sources: [],
        entry_status: 'valid',
        ...overrides,
      },
    },
  });
}

function findQuads(quads, predicate) {
  return quads.filter(q => q.predicate.value === predicate);
}

describe('conceptToQuads', () => {
  it('emits the concept subject URI under uriBase/registerId/concept/<id>', () => {
    const concept = buildConcept();
    const quads = collectQuads(conceptToQuads(concept, { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const expected = 'https://glossarist.org/iso/concept/3.1.1';
    assert.equal(conceptUri(concept, { registerId: 'iso', uriBase: 'https://glossarist.org' }), expected);
    assert.ok(quads.some(q => q.subject.value === expected));
  });

  it('strips trailing slashes from uriBase', () => {
    const concept = buildConcept();
    const uri = conceptUri(concept, { registerId: 'iso', uriBase: 'https://glossarist.org/////' });
    assert.equal(uri, 'https://glossarist.org/iso/concept/3.1.1');
  });

  it('types every concept as both gloss:Concept and skos:Concept', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const subject = 'https://glossarist.org/iso/concept/3.1.1';
    const types = quads
      .filter(q => q.subject.value === subject && q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      .map(q => q.object.value);
    assert.ok(types.includes('https://www.glossarist.org/ontologies/Concept'));
    assert.ok(types.includes('http://www.w3.org/2004/02/skos/core#Concept'));
  });

  it('links the localized concept via gloss:hasLocalization', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const links = findQuads(quads, 'https://www.glossarist.org/ontologies/hasLocalization');
    assert.equal(links.length, 1);
    assert.equal(links[0].object.value, 'https://glossarist.org/iso/concept/3.1.1/eng');
  });

  it('emits gloss:identifier with the concept id as a literal', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const ids = findQuads(quads, 'https://www.glossarist.org/ontologies/identifier');
    assert.equal(ids.length, 1);
    assert.equal(ids[0].object.value, '3.1.1');
  });
});

describe('conceptToQuads — localized concept', () => {
  it('emits BOTH skosxl:prefLabel (reified) AND skos:prefLabel (direct literal)', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const lcSubject = 'https://glossarist.org/iso/concept/3.1.1/eng';

    const skosPref = findQuads(quads, 'http://www.w3.org/2004/02/skos/core#prefLabel');
    assert.equal(skosPref.length, 1);
    assert.equal(skosPref[0].subject.value, lcSubject);
    assert.equal(skosPref[0].object.value, 'atomic data unit');
    assert.equal(skosPref[0].object.language, 'eng');

    const skosxlPref = findQuads(quads, 'http://www.w3.org/2008/05/skos-xl#prefLabel');
    assert.equal(skosxlPref.length, 1);
    assert.equal(skosxlPref[0].subject.value, lcSubject);
  });

  it('emits skos:definition as a direct literal alongside gloss:hasDefinition', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const lcSubject = 'https://glossarist.org/iso/concept/3.1.1/eng';

    const direct = findQuads(quads, 'http://www.w3.org/2004/02/skos/core#definition');
    assert.equal(direct.length, 1);
    assert.equal(direct[0].subject.value, lcSubject);
    assert.equal(direct[0].object.value, 'A data unit that cannot be subdivided.');
    assert.equal(direct[0].object.language, 'eng');

    const reified = findQuads(quads, 'https://www.glossarist.org/ontologies/hasDefinition');
    assert.equal(reified.length, 1);
  });

  it('emits dcterms:language on the localized concept', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const langs = findQuads(quads, 'http://purl.org/dc/terms/language');
    assert.equal(langs.length, 1);
    assert.equal(langs[0].object.value, 'eng');
  });

  it('emits gloss:isLocalizationOf pointing back to the parent concept', () => {
    const quads = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const links = findQuads(quads, 'https://www.glossarist.org/ontologies/isLocalizationOf');
    assert.equal(links.length, 1);
    assert.equal(links[0].subject.value, 'https://glossarist.org/iso/concept/3.1.1/eng');
    assert.equal(links[0].object.value, 'https://glossarist.org/iso/concept/3.1.1');
  });
});

describe('conceptToQuads — determinism', () => {
  it('produces byte-equivalent quad arrays across calls for the same input', () => {
    const a = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    const b = collectQuads(conceptToQuads(buildConcept(), { registerId: 'iso', uriBase: 'https://glossarist.org' }));
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.equal(a[i].toString(), b[i].toString());
    }
  });
});
