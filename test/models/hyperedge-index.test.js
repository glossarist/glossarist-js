// Specs for HyperedgeIndex — directional queries over hyperedge sets.
//
// The OIML V 2-200:2010 inventory is the canonical use case:
//   - 5.1 measurement standard is comprehensive of 6 hyperedges
//   - 5.13 reference material is a member of one of 5.1's hyperedges
//     AND comprehensive of its own 2 hyperedges
//   - Both queries must be O(1)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { HyperedgeIndex, buildDatasetIndex } from '../../src/models/hyperedge-index.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import { Concept } from '../../src/models/concept.js';

function makeHyperedge(compId, memberIds, criterion = null) {
  return new PartitiveHyperedge({
    comprehensive: { source: 'OIML', id: compId },
    partitives: memberIds.map(id => ({ ref: { source: 'OIML', id } })),
    criterion: criterion ? { eng: criterion } : null,
  });
}

describe('HyperedgeIndex', () => {
  describe('forComprehensive', () => {
    it('returns hyperedges where the given concept is the "1" side', () => {
      const h1 = makeHyperedge('5.1', ['5.4', '5.5'], 'by realization medium');
      const h2 = makeHyperedge('5.1', ['5.13', '5.14'], 'by calibration role');
      const idx = new HyperedgeIndex([h1, h2]);
      assert.equal(idx.forComprehensive('OIML:5.1').length, 2);
    });

    it('returns empty for a concept that is not comprehensive anywhere', () => {
      const h = makeHyperedge('5.1', ['5.4', '5.5']);
      const idx = new HyperedgeIndex([h]);
      assert.deepEqual(idx.forComprehensive('OIML:999'), []);
    });
  });

  describe('forMember', () => {
    it('returns hyperedges where the given concept appears as a member', () => {
      const h1 = makeHyperedge('5.1', ['5.13', '5.14']);
      const h2 = makeHyperedge('5.13', ['5.13a', '5.13b']);
      const idx = new HyperedgeIndex([h1, h2]);
      // 5.13 is a member of h1 and comprehensive of h2
      const asMember = idx.forMember('OIML:5.13');
      assert.equal(asMember.length, 1);
      assert.equal(asMember[0], h1);
      const asComp = idx.forComprehensive('OIML:5.13');
      assert.equal(asComp.length, 1);
      assert.equal(asComp[0], h2);
    });

    it('member that appears in multiple hyperedges is in all of them', () => {
      const h1 = makeHyperedge('A', ['shared', 'x']);
      const h2 = makeHyperedge('B', ['shared', 'y']);
      const idx = new HyperedgeIndex([h1, h2]);
      assert.equal(idx.forMember('OIML:shared').length, 2);
    });
  });

  describe('comprehensives / members', () => {
    it('returns unique concepts that appear as comprehensive', () => {
      const h1 = makeHyperedge('A', ['x', 'y']);
      const h2 = makeHyperedge('A', ['z', 'w']); // same comp
      const h3 = makeHyperedge('B', ['x', 'z']);
      const idx = new HyperedgeIndex([h1, h2, h3]);
      const comps = idx.comprehensives().sort();
      assert.deepEqual(comps, ['OIML:A', 'OIML:B']);
    });

    it('returns unique concepts that appear as members', () => {
      const h1 = makeHyperedge('A', ['x', 'y']);
      const h2 = makeHyperedge('B', ['x', 'z']);
      const idx = new HyperedgeIndex([h1, h2]);
      const members = idx.members().sort();
      assert.deepEqual(members, ['OIML:x', 'OIML:y', 'OIML:z']);
    });
  });

  describe('empty / edge cases', () => {
    it('empty input produces empty index', () => {
      const idx = new HyperedgeIndex([]);
      assert.equal(idx.size, 0);
      assert.deepEqual(idx.comprehensives(), []);
      assert.deepEqual(idx.members(), []);
    });

    it('model constructor rejects empty comprehensive before index sees it', () => {
      // The defensive check lives in AbstractHyperedge. The index
      // never has to handle an empty comprehensive because the model
      // never allows one to exist.
      assert.throws(
        () => new PartitiveHyperedge({
          comprehensive: {},
          partitives: [{ ref: { source: 'A', id: '1' } }, { ref: { source: 'A', id: '2' } }],
        }),
        /non-empty ConceptRef/,
      );
    });
  });

  describe('buildDatasetIndex', () => {
    it('indexes across multiple Concepts\' relations arrays', () => {
      const c1 = new Concept({
        id: '5.1',
        partitive_relations: [{
          comprehensive: { source: 'OIML', id: '5.1' },
          partitives: [{ ref: { source: 'OIML', id: '5.4' } }, { ref: { source: 'OIML', id: '5.5' } }],
        }],
      });
      const c2 = new Concept({
        id: '5.13',
        partitive_relations: [{
          comprehensive: { source: 'OIML', id: '5.13' },
          partitives: [{ ref: { source: 'OIML', id: '5.13a' } }, { ref: { source: 'OIML', id: '5.13b' } }],
        }],
      });
      const idx = buildDatasetIndex([c1, c2]);
      assert.equal(idx.size, 2);
      assert.equal(idx.forComprehensive('OIML:5.1').length, 1);
      assert.equal(idx.forComprehensive('OIML:5.13').length, 1);
    });
  });
});
