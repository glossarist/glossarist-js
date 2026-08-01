// Per-emitter test for designation RDF emission.
// Covers all four subtypes (Expression, Abbreviation, Symbol, Letter,
// Graphical) plus the new boolean flag emission (TODO 24).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Designation, Abbreviation, Symbol, LetterSymbol, GraphicalSymbol } from '../../src/models/designation.js';
import { collectQuads, designationToQuads, skosLabelPredicate, skosxlLabelPredicate } from '../../src/rdf/index.js';

const GLOSS = 'https://www.glossarist.org/ontologies/';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const SKOSXL = 'http://www.w3.org/2008/05/skos-xl#';
const SUBJECT = 'https://example.org/c/eng';

function emitted(designation, index = 0, language = 'eng') {
  return collectQuads(designationToQuads(designation, { subjectUri: SUBJECT, language, index }));
}

function rdfType(quads, subjectValue) {
  return quads
    .filter(q => q.subject.value === subjectValue &&
                 q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
    .map(q => q.object.value);
}

describe('designationToQuads', () => {
  describe('Expression', () => {
    it('emits gloss:Expression + skosxl:Label types and literalForm', () => {
      const d = new Designation({ type: 'expression', designation: 'foo', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      assert.ok(desigSubject);
      const types = rdfType(quads, desigSubject);
      assert.ok(types.includes(`${GLOSS}Expression`));
      assert.ok(types.includes(`${SKOSXL}Label`));
      const literalForm = quads.find(q => q.predicate.value === `${SKOSXL}literalForm`);
      assert.ok(literalForm);
      assert.equal(literalForm.object.value, 'foo');
    });
  });

  describe('Abbreviation', () => {
    it('emits gloss:Abbreviation type', () => {
      const d = new Abbreviation({ type: 'abbreviation', designation: 'NASA', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const types = rdfType(quads, desigSubject);
      assert.ok(types.includes(`${GLOSS}Abbreviation`));
    });

    it('emits gloss:isAcronym "true"^^xsd:boolean when acronym flag is set', () => {
      const d = new Abbreviation({ type: 'abbreviation', designation: 'NASA', normative_status: 'preferred', acronym: true });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const flag = quads.find(q =>
        q.subject.value === desigSubject &&
        q.predicate.value === `${GLOSS}isAcronym`
      );
      assert.ok(flag, 'expected gloss:isAcronym quad');
      assert.equal(flag.object.value, 'true');
      assert.equal(flag.object.datatype.value, 'http://www.w3.org/2001/XMLSchema#boolean');
    });

    it('emits isInitialism and isTruncation flags', () => {
      const d = new Abbreviation({ type: 'abbreviation', designation: 'FBI', normative_status: 'preferred', initialism: true, truncation: false });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      assert.ok(quads.some(q => q.subject.value === desigSubject && q.predicate.value === `${GLOSS}isInitialism`));
      assert.ok(!quads.some(q => q.subject.value === desigSubject && q.predicate.value === `${GLOSS}isTruncation`),
        'falsy truncation must NOT be emitted');
    });

    it('does not emit any flag quad when no flags are set', () => {
      const d = new Abbreviation({ type: 'abbreviation', designation: 'abbr', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const flags = quads.filter(q =>
        q.subject.value === desigSubject &&
        [`${GLOSS}isAcronym`, `${GLOSS}isInitialism`, `${GLOSS}isTruncation`].includes(q.predicate.value)
      );
      assert.equal(flags.length, 0);
    });
  });

  describe('Symbol family', () => {
    it('emits gloss:Symbol type for plain symbol', () => {
      const d = new Symbol({ type: 'symbol', designation: 'Ω', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const types = rdfType(quads, desigSubject);
      assert.ok(types.includes(`${GLOSS}Symbol`));
    });

    it('emits gloss:LetterSymbol type for letter_symbol', () => {
      const d = new LetterSymbol({ type: 'letter_symbol', designation: 'A', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const types = rdfType(quads, desigSubject);
      assert.ok(types.includes(`${GLOSS}LetterSymbol`));
    });

    it('emits gloss:GraphicalSymbol type for graphical_symbol', () => {
      const d = new GraphicalSymbol({ type: 'graphical_symbol', designation: '☠', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const types = rdfType(quads, desigSubject);
      assert.ok(types.includes(`${GLOSS}GraphicalSymbol`));
    });
  });

  describe('normative status dispatch', () => {
    it('preferred → skos:prefLabel / skosxl:prefLabel', () => {
      const d = new Designation({ type: 'expression', designation: 'x', normative_status: 'preferred' });
      assert.equal(skosLabelPredicate(d), `${SKOS}prefLabel`);
      assert.equal(skosxlLabelPredicate(d), `${SKOSXL}prefLabel`);
    });

    it('admitted → skos:altLabel / skosxl:altLabel', () => {
      const d = new Designation({ type: 'expression', designation: 'x', normative_status: 'admitted' });
      assert.equal(skosLabelPredicate(d), `${SKOS}altLabel`);
      assert.equal(skosxlLabelPredicate(d), `${SKOSXL}altLabel`);
    });

    it('deprecated → skos:hiddenLabel / skosxl:hiddenLabel', () => {
      const d = new Designation({ type: 'expression', designation: 'x', normative_status: 'deprecated' });
      assert.equal(skosLabelPredicate(d), `${SKOS}hiddenLabel`);
      assert.equal(skosxlLabelPredicate(d), `${SKOSXL}hiddenLabel`);
    });

    it('unknown → fallback altLabel', () => {
      const d = new Designation({ type: 'expression', designation: 'x', normative_status: null });
      assert.equal(skosLabelPredicate(d), `${SKOS}altLabel`);
      assert.equal(skosxlLabelPredicate(d), `${SKOSXL}altLabel`);
    });
  });

  describe('OCP: subtype determines rdfClass without editing emitter', () => {
    it('a fresh subtype that extends Designation emits its own rdfClass', () => {
      class FakeEmoji extends Designation {
        rdfClass() { return 'FakeEmoji'; }
      }
      const d = new FakeEmoji({ type: 'fake-emoji', designation: '🎉', normative_status: 'preferred' });
      const quads = emitted(d);
      const desigSubject = quads.find(q => q.predicate.value === `${SKOSXL}prefLabel`)?.object?.value;
      const types = rdfType(quads, desigSubject);
      assert.ok(
        types.includes(`${GLOSS}FakeEmoji`),
        'a subtype that overrides rdfClass() should drive emission without touching gloss-designation.js',
      );
    });
  });
});
