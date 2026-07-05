// Tests for the group emitter.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupToQuads, collectQuads } from '../../src/rdf/index.js';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const DCAT = 'http://www.w3.org/ns/dcat#';
const DCTERMS = 'http://purl.org/dc/terms/';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const PROV = 'http://www.w3.org/ns/prov#';

const G = 'https://example.org/groups/viml';

describe('groupToQuads', () => {
  describe('lineage kind', () => {
    const input = {
      groupId: 'viml',
      groupIri: G,
      kind: 'lineage',
      title: 'VIML Lineage',
      description: 'Editions of VIML',
      memberIris: ['https://example.org/viml-2022', 'https://example.org/viml-2013'],
      currentMemberIri: 'https://example.org/viml-2022',
    };

    it('emits both dcat:DatasetSeries and skos:ConceptScheme types', () => {
      const quads = collectQuads(groupToQuads(input));
      const types = quads
        .filter(q => q.subject.value === G && q.predicate.value === RDF_TYPE)
        .map(q => q.object.value);
      assert.ok(types.includes(`${DCAT}DatasetSeries`));
      assert.ok(types.includes(`${SKOS}ConceptScheme`));
    });

    it('uses dcat:hasVersion for each member', () => {
      const quads = collectQuads(groupToQuads(input));
      const versions = quads
        .filter(q => q.subject.value === G && q.predicate.value === `${DCAT}hasVersion`)
        .map(q => q.object.value);
      assert.deepEqual(versions.sort(), ['https://example.org/viml-2013', 'https://example.org/viml-2022'].sort());
    });

    it('emits dcat:hasCurrentVersion for the current member', () => {
      const quads = collectQuads(groupToQuads(input));
      assert.ok(quads.some(q =>
        q.subject.value === G &&
        q.predicate.value === `${DCAT}hasCurrentVersion` &&
        q.object.value === 'https://example.org/viml-2022'
      ));
    });

    it('does NOT emit dcat:dataset for lineage members', () => {
      const quads = collectQuads(groupToQuads(input));
      assert.ok(!quads.some(q => q.predicate.value === `${DCAT}dataset`));
    });
  });

  describe('topic / family / collection kinds', () => {
    for (const kind of ['topic', 'family', 'collection']) {
      it(`${kind} kind emits dcat:Catalog + skos:ConceptScheme`, () => {
        const quads = collectQuads(groupToQuads({
          groupId: 'x', groupIri: G, kind, title: 'X', memberIris: ['https://example.org/d1'],
        }));
        const types = quads
          .filter(q => q.subject.value === G && q.predicate.value === RDF_TYPE)
          .map(q => q.object.value);
        assert.ok(types.includes(`${DCAT}Catalog`));
        assert.ok(types.includes(`${SKOS}ConceptScheme`));
      });

      it(`${kind} kind uses dcat:dataset for members`, () => {
        const quads = collectQuads(groupToQuads({
          groupId: 'x', groupIri: G, kind, title: 'X', memberIris: ['https://example.org/d1', 'https://example.org/d2'],
        }));
        const datasets = quads
          .filter(q => q.subject.value === G && q.predicate.value === `${DCAT}dataset`)
          .map(q => q.object.value);
        assert.deepEqual(datasets.sort(), ['https://example.org/d1', 'https://example.org/d2'].sort());
      });
    }
  });

  describe('default kind', () => {
    it('emits no quads (default groups are presentation-only)', () => {
      const quads = collectQuads(groupToQuads({
        groupId: 'x', groupIri: G, kind: 'default', title: 'X', memberIris: [],
      }));
      assert.equal(quads.length, 0);
    });
  });

  describe('optional metadata', () => {
    it('emits description, subject, themes, keywords, publisher, contact, sourceRepo', () => {
      const quads = collectQuads(groupToQuads({
        groupId: 'viml',
        groupIri: G,
        kind: 'lineage',
        title: 'VIML',
        description: 'Editions',
        subject: 'legal metrology',
        themes: ['https://example.org/themes/metrology'],
        keywords: ['metrology', 'vim'],
        publisher: 'https://example.org/publisher/oiml',
        contact: 'https://example.org/contact/oiml',
        sourceRepo: 'https://github.com/oimlsmart/vocab',
        memberIris: [],
      }));
      assert.ok(quads.some(q => q.predicate.value === `${DCTERMS}description` && q.object.value === 'Editions'));
      assert.ok(quads.some(q => q.predicate.value === `${DCTERMS}subject` && q.object.value === 'legal metrology'));
      assert.ok(quads.some(q => q.predicate.value === `${DCAT}theme` && q.object.value === 'https://example.org/themes/metrology'));
      const keywords = quads.filter(q => q.predicate.value === `${DCAT}keyword`).map(q => q.object.value);
      assert.deepEqual(keywords.sort(), ['metrology', 'vim'].sort());
      assert.ok(quads.some(q => q.predicate.value === `${DCTERMS}publisher` && q.object.value === 'https://example.org/publisher/oiml'));
      assert.ok(quads.some(q => q.predicate.value === `${DCAT}contactPoint` && q.object.value === 'https://example.org/contact/oiml'));
      assert.ok(quads.some(q => q.predicate.value === `${PROV}wasDerivedFrom` && q.object.value === 'https://github.com/oimlsmart/vocab'));
    });

    it('skips optional fields when not provided', () => {
      const quads = collectQuads(groupToQuads({
        groupId: 'x', groupIri: G, kind: 'lineage', title: 'X', memberIris: [],
      }));
      assert.ok(!quads.some(q => q.predicate.value === `${DCTERMS}description`));
      assert.ok(!quads.some(q => q.predicate.value === `${DCTERMS}subject`));
      assert.ok(!quads.some(q => q.predicate.value === `${DCAT}theme`));
      assert.ok(!quads.some(q => q.predicate.value === `${DCAT}keyword`));
      assert.ok(!quads.some(q => q.predicate.value === `${DCTERMS}publisher`));
      assert.ok(!quads.some(q => q.predicate.value === `${DCAT}contactPoint`));
      assert.ok(!quads.some(q => q.predicate.value === `${PROV}wasDerivedFrom`));
    });
  });
});
