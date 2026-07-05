// Per-emitter test for the detailed-definition RDF emitter.
// Covers all link-predicate roles (definition, note, example, scoped
// example, annotation) and the direct-SKOS counterpart behavior.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
import { collectQuads, detailedDefinitionToQuads } from '../../src/rdf/index.js';

const SUBJECT = 'https://glossarist.org/iso/concept/1.1/eng';
const GLOSS = 'https://www.glossarist.org/ontologies/';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';

function emittedWith(definition, role, language = 'eng') {
  return collectQuads(detailedDefinitionToQuads(definition, {
    subjectUri: SUBJECT,
    language,
    index: 0,
    role,
  }));
}

describe('detailedDefinitionToQuads', () => {
  describe('definition role', () => {
    it('links via gloss:hasDefinition and reifies as DetailedDefinition', () => {
      const def = new DetailedDefinition({ content: 'A data unit that cannot be subdivided.' });
      const quads = emittedWith(def, 'hasDefinition');
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}hasDefinition`));
      const typeQuad = quads.find(q =>
        q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
        q.object.value === `${GLOSS}DetailedDefinition`
      );
      assert.ok(typeQuad, 'expected rdf:type gloss:DetailedDefinition');
    });

    it('emits rdf:value with the content text and language tag', () => {
      const def = new DetailedDefinition({ content: 'Sample.' });
      const quads = emittedWith(def, 'hasDefinition');
      const value = quads.find(q => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value');
      assert.ok(value);
      assert.equal(value.object.value, 'Sample.');
      assert.equal(value.object.language, 'eng');
    });

    it('emits a direct skos:definition literal alongside the reified form', () => {
      const def = new DetailedDefinition({ content: 'Plain SKOS literal.' });
      const quads = emittedWith(def, 'hasDefinition');
      const direct = quads.find(q => q.predicate.value === `${SKOS}definition`);
      assert.ok(direct, 'expected direct skos:definition');
      assert.equal(direct.object.value, 'Plain SKOS literal.');
    });
  });

  describe('note role', () => {
    it('links via gloss:hasNote and direct skos:scopeNote', () => {
      const def = new DetailedDefinition({ content: 'Note 1.' });
      const quads = emittedWith(def, 'hasNote');
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}hasNote`));
      const direct = quads.find(q => q.predicate.value === `${SKOS}scopeNote`);
      assert.ok(direct);
    });
  });

  describe('example role', () => {
    it('links via gloss:hasExample and direct skos:example', () => {
      const def = new DetailedDefinition({ content: 'e.g. foo' });
      const quads = emittedWith(def, 'hasExample');
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}hasExample`));
      const direct = quads.find(q => q.predicate.value === `${SKOS}example`);
      assert.ok(direct);
    });
  });

  describe('annotation role', () => {
    it('links via gloss:hasAnnotation but has no direct SKOS counterpart', () => {
      const def = new DetailedDefinition({ content: 'annotated' });
      const quads = emittedWith(def, 'hasAnnotation');
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}hasAnnotation`));
      const direct = quads.filter(q => q.predicate.value.startsWith(SKOS));
      assert.equal(direct.length, 0, 'annotation must not emit a direct SKOS literal');
    });
  });

  describe('scoped example role (nested examples)', () => {
    it('links via gloss:hasScopedExample and direct skos:example', () => {
      const inner = new DetailedDefinition({ content: 'A scoped example.' });
      const quads = emittedWith(inner, 'hasScopedExample');
      assert.ok(
        quads.some(q => q.predicate.value === `${GLOSS}hasScopedExample`),
        'nested examples must use gloss:hasScopedExample',
      );
      const direct = quads.find(q => q.predicate.value === `${SKOS}example`);
      assert.ok(direct, 'scoped example must also produce direct skos:example');
    });

    it('recurses from a definition with examples using hasScopedExample', () => {
      const nested = new DetailedDefinition({ content: 'inner example' });
      const parent = new DetailedDefinition({
        content: 'parent definition',
        examples: [nested],
      });
      const quads = emittedWith(parent, 'hasDefinition');

      const scopedLink = quads.find(q => q.predicate.value === `${GLOSS}hasScopedExample`);
      assert.ok(scopedLink, 'parent definition should link to its nested example via hasScopedExample');

      const plainExampleLink = quads.find(q => q.predicate.value === `${GLOSS}hasExample`);
      assert.ok(!plainExampleLink, 'scoped (nested) example must NOT be emitted via top-level hasExample');

      const innerContent = quads.find(q =>
        q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value' &&
        q.object.value === 'inner example'
      );
      assert.ok(innerContent, 'inner example content must be present in the quad stream');
    });
  });

  describe('content-less definitions', () => {
    it('omits rdf:value when content is empty but still reifies the bnode', () => {
      const def = new DetailedDefinition({});
      const quads = emittedWith(def, 'hasDefinition');
      const typeQuad = quads.find(q =>
        q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
        q.object.value === `${GLOSS}DetailedDefinition`
      );
      assert.ok(typeQuad, 'expected rdf:type gloss:DetailedDefinition even without content');
      const value = quads.find(q => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value');
      assert.ok(!value, 'rdf:value must not be emitted when content is empty');
    });
  });

  describe('unknown role', () => {
    it('throws', () => {
      const def = new DetailedDefinition({ content: 'x' });
      assert.throws(
        () => emittedWith(def, 'bogus'),
        /Unknown detailed-definition role/,
      );
    });
  });
});
