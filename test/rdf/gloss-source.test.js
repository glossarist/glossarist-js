// Per-emitter test for the ConceptSource RDF emitter.
// Covers ConceptSource with/without Citation, with/without status/type,
// with/without modification, and the Citation#ref field emission.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptSource } from '../../src/models/concept-source.js';
import { Citation } from '../../src/models/citation.js';
import { collectQuads, conceptSourceToQuads } from '../../src/rdf/index.js';

const GLOSS = 'https://www.glossarist.org/ontologies/';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SUBJECT = 'https://example.org/c/eng';

function emitted(source, index = 0) {
  return collectQuads(conceptSourceToQuads(source, { subjectUri: SUBJECT, index }));
}

function findObject(quads, subjectValue, predicateSuffix) {
  return quads.find(q =>
    q.subject.value === subjectValue &&
    q.predicate.value === `${GLOSS}${predicateSuffix}`
  )?.object?.value;
}

describe('conceptSourceToQuads', () => {
  it('links via gloss:hasSource and reifies as ConceptSource', () => {
    const src = new ConceptSource({ status: 'authoritative', type: 'lineage' });
    const quads = emitted(src);
    const linkQuad = quads.find(q =>
      q.subject.value === SUBJECT &&
      q.predicate.value === `${GLOSS}hasSource`
    );
    assert.ok(linkQuad, 'expected gloss:hasSource link from parent');
    const srcSubject = linkQuad.object.value;
    const typeQuad = quads.find(q =>
      q.subject.value === srcSubject &&
      q.predicate.value === RDF_TYPE &&
      q.object.value === `${GLOSS}ConceptSource`
    );
    assert.ok(typeQuad, 'expected rdf:type gloss:ConceptSource');
  });

  it('emits sourceStatus and sourceType URIs from clean tokens', () => {
    const src = new ConceptSource({ status: 'authoritative', type: 'lineage' });
    const quads = emitted(src);
    const linkQuad = quads.find(q => q.subject.value === SUBJECT && q.predicate.value === `${GLOSS}hasSource`);
    const srcSubject = linkQuad.object.value;
    assert.equal(findObject(quads, srcSubject, 'sourceStatus'), `${GLOSS}srcstatus/authoritative`);
    assert.equal(findObject(quads, srcSubject, 'sourceType'), `${GLOSS}srctype/lineage`);
  });

  it('skips sourceStatus / sourceType when fields are absent', () => {
    const src = new ConceptSource({ id: 'ref-1' });
    const quads = emitted(src);
    assert.ok(!quads.some(q => q.predicate.value === `${GLOSS}sourceStatus`));
    assert.ok(!quads.some(q => q.predicate.value === `${GLOSS}sourceType`));
  });

  it('emits modification literal when set', () => {
    const src = new ConceptSource({ modification: 'phrased differently' });
    const quads = emitted(src);
    const modQuad = quads.find(q => q.predicate.value === `${GLOSS}modification`);
    assert.ok(modQuad);
    assert.equal(modQuad.object.value, 'phrased differently');
  });

  describe('with Citation origin', () => {
    it('links via gloss:sourceOrigin and reifies as Citation', () => {
      const origin = new Citation({ original: 'Foo, 2020' });
      const src = new ConceptSource({ status: 'authoritative', origin });
      const quads = emitted(src);

      const srcSubject = quads.find(q =>
        q.subject.value === SUBJECT && q.predicate.value === `${GLOSS}hasSource`
      ).object.value;

      const originLink = quads.find(q =>
        q.subject.value === srcSubject && q.predicate.value === `${GLOSS}sourceOrigin`
      );
      assert.ok(originLink, 'expected gloss:sourceOrigin link');
      const citSubject = originLink.object.value;

      const citType = quads.find(q =>
        q.subject.value === citSubject &&
        q.predicate.value === RDF_TYPE &&
        q.object.value === `${GLOSS}Citation`
      );
      assert.ok(citType, 'expected rdf:type gloss:Citation');
    });

    it('emits citationOriginal literal from origin.original', () => {
      const src = new ConceptSource({ origin: new Citation({ original: 'Original text' }) });
      const quads = emitted(src);
      const originalQuad = quads.find(q => q.predicate.value === `${GLOSS}citationOriginal`);
      assert.ok(originalQuad);
      assert.equal(originalQuad.object.value, 'Original text');
    });

    it('emits citationRef fields when citation.ref is set', () => {
      const src = new ConceptSource({
        origin: new Citation({
          ref: new Citation.Ref({ source: 'ISO', id: '1234', version: '2020' }),
        }),
      });
      const quads = emitted(src);
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}citationRefSource` && q.object.value === 'ISO'));
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}citationRefId` && q.object.value === '1234'));
      assert.ok(quads.some(q => q.predicate.value === `${GLOSS}citationRefVersion` && q.object.value === '2020'));
    });

    it('emits citationLink literal when origin.link is set', () => {
      const src = new ConceptSource({
        origin: new Citation({ link: 'https://example.org/ref' }),
      });
      const quads = emitted(src);
      const linkQuad = quads.find(q => q.predicate.value === `${GLOSS}citationLink`);
      assert.ok(linkQuad);
      assert.equal(linkQuad.object.value, 'https://example.org/ref');
    });

    it('does NOT emit citationOriginal / citationLink when origin has neither', () => {
      const src = new ConceptSource({
        origin: new Citation({ ref: new Citation.Ref({ source: 'X', id: '1' }) }),
      });
      const quads = emitted(src);
      assert.ok(!quads.some(q => q.predicate.value === `${GLOSS}citationOriginal`));
      assert.ok(!quads.some(q => q.predicate.value === `${GLOSS}citationLink`));
    });
  });

  it('produces deterministic source bnode IDs across runs for the same parent/index', () => {
    const src1 = new ConceptSource({ status: 'authoritative' });
    const src2 = new ConceptSource({ status: 'authoritative' });
    const q1 = emitted(src1, 0);
    const q2 = emitted(src2, 0);
    const id1 = q1.find(q => q.subject.value !== SUBJECT && q.predicate.value === RDF_TYPE).subject.value;
    const id2 = q2.find(q => q.subject.value !== SUBJECT && q.predicate.value === RDF_TYPE).subject.value;
    assert.equal(id1, id2, 'same parent+index must produce same bnode ID');
  });
});
