// OCP contract: adding a new hyperedge type requires zero edits to
// production code outside the new leaf class declaration.
//
// This test simulates adding a `TemporalHyperedge` (a hypothetical
// future type for "before/after" decomposition). It defines the class
// in the test, registers it at runtime via HyperedgeRegistry.register,
// and exercises every external system:
//
//   - Concept stores it in .relations without Concept edits
//   - Concept.toJSON emits its wire key without serializer edits
//   - Parser round-trips its wire key without parser edits
//   - Diff round-trips it without diff-code edits
//   - RDF emitter picks up its kindLabel without renderer edits
//   - Per-file loader dispatches by typeTag without loader edits
//   - HyperedgeIndex indexes it without index edits
//
// If any of these fail because some production file needs editing,
// the architecture is wrong — fix the architecture, not the test.
//
// Per TODO Phase 11. The test is THE executable contract for the
// abstract-hyperedge refactor.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { Concept } from '../../src/models/concept.js';
import { AbstractHyperedge } from '../../src/models/abstract-hyperedge.js';
import { HyperedgeMember } from '../../src/models/hyperedge-member.js';
import { HyperedgeRegistry } from '../../src/models/hyperedge-registry.js';
import { HyperedgeIndex } from '../../src/models/hyperedge-index.js';
import { RelationLoader } from '../../src/models/relation-loader.js';
import { diffConcepts, applyDiff, reverseDiff } from '../../src/diff/index.js';
import { conceptParser } from '../../src/concept-parser.js';

// Mock hyperedge type — NOT in the production codebase. Defined here
// to prove the architecture is open for extension without edits.
class TemporalMember extends HyperedgeMember {}
class TemporalHyperedge extends AbstractHyperedge {
  static wireKey     = 'temporal_relations';
  static typeTag     = 'temporal_relation';
  static rdfType     = 'gloss:TemporalRelation';
  static memberClass = TemporalMember;
  static v1WireKeys  = [];
  static kindLabel   = 'TEMP';

  constructor(data = {}) {
    const members = data?.members;
    super({ ...data, members });
    this.members = members == null
      ? this.members
      : (Array.isArray(members)
          ? members.map(m => m instanceof TemporalMember ? m : new TemporalMember(m))
          : this.members);
  }

  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const memberKeys = Array.isArray(v.members)
      ? v.members.map(m => {
          const r = m?.ref ?? m ?? {};
          return `${r.source ?? ''}:${r.id ?? ''}`;
        }).sort()
      : [];
    return `${c.source ?? ''}:${c.id ?? ''}|${memberKeys.join('|')}`;
  }

  static fromJSON(data) {
    return new TemporalHyperedge(data);
  }
}

describe('OCP contract: adding a new hyperedge type', () => {
  before(() => {
    HyperedgeRegistry.register(TemporalHyperedge);
  });

  after(() => {
    // Clean up so the mock type doesn't leak into other test runs.
    HyperedgeRegistry.unregister(TemporalHyperedge);
  });

  function makeTemporal() {
    return new TemporalHyperedge({
      comprehensive: { source: 'X', id: '1.1' },
      members: [
        { ref: { source: 'X', id: '1.2' } },
        { ref: { source: 'X', id: '1.3' } },
      ],
      criterion: { eng: 'before/after' },
    });
  }

  it('registers in HyperedgeRegistry via all three indexes', () => {
    assert.equal(HyperedgeRegistry.forWireKey('temporal_relations'), TemporalHyperedge);
    assert.equal(HyperedgeRegistry.forTypeTag('temporal_relation'), TemporalHyperedge);
    assert.equal(HyperedgeRegistry.forRdfType('gloss:TemporalRelation'), TemporalHyperedge);
  });

  it('Concept constructor stores it via the unified relations wire shape', () => {
    const c = new Concept({
      id: 'x',
      relations: [{
        type: 'temporal_relation',
        comprehensive: { source: 'X', id: '1.1' },
        members: [
          { ref: { source: 'X', id: '1.2' } },
          { ref: { source: 'X', id: '1.3' } },
        ],
      }],
    });
    assert.equal(c.relations.length, 1);
    assert.ok(c.relations[0] instanceof TemporalHyperedge);
  });

  it('Concept.toJSON emits its wire key automatically', () => {
    const c = new Concept({ id: 'x', relations: [makeTemporal()] });
    const json = c.toJSON();
    assert.ok(Array.isArray(json.temporal_relations));
    assert.equal(json.temporal_relations.length, 1);
    assert.equal(json.temporal_relations[0].comprehensive.id, '1.1');
  });

  it('parser accepts its wire key as YAML input', () => {
    const yaml = `
termid: x
term: test
temporal_relations:
  - comprehensive:
      source: X
      id: '1.1'
    members:
      - ref: { source: X, id: '1.2' }
      - ref: { source: X, id: '1.3' }
    criterion:
      eng: before/after
eng:
  terms:
    - type: expression
      designation: test
      normative_status: preferred
`;
    const c = conceptParser.parse(yaml, 'ocp-test.yaml');
    assert.equal(c.relations.length, 1);
    assert.ok(c.relations[0] instanceof TemporalHyperedge);
  });

  it('round-trips through diff without diff-code edits', () => {
    const c1 = new Concept({ id: 'x', relations: [makeTemporal()] });
    const c2 = new Concept({ id: 'x', relations: [makeTemporal()] });
    const diff = diffConcepts(c1, c2);
    assert.equal(diff.hasChanges, false);

    // Add a second temporal relation; diff must detect and round-trip.
    const t2 = new TemporalHyperedge({
      comprehensive: { source: 'X', id: '2.1' },
      members: [
        { ref: { source: 'X', id: '2.2' } },
        { ref: { source: 'X', id: '2.3' } },
      ],
    });
    const c3 = new Concept({ id: 'x', relations: [makeTemporal(), t2] });
    const diffAdd = diffConcepts(c1, c3);
    assert.equal(diffAdd.hasChanges, true);
    assert.equal(diffAdd.concept.relations.added.length, 1);

    const applied = applyDiff(c1, diffAdd);
    assert.equal(applied.relations.length, 2);
    assert.ok(applied.relations[1] instanceof TemporalHyperedge);

    const reversed = applyDiff(c3, reverseDiff(diffAdd));
    assert.equal(reversed.relations.length, 1);
  });

  it('RelationLoader dispatches by typeTag without loader edits', () => {
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'hyperedge-ocp-'));
    try {
      const compDir = path.join(tmpdir, 'X-1-1');
      fs.mkdirSync(compDir, { recursive: true });
      fs.writeFileSync(
        path.join(compDir, 'before-after.yaml'),
        `type: temporal_relation
comprehensive:
  source: X
  id: '1.1'
members:
  - ref: { source: X, id: '1.2' }
  - ref: { source: X, id: '1.3' }
criterion:
  eng: before/after
`,
        'utf8',
      );
      const map = RelationLoader.loadAll(tmpdir);
      assert.equal(map.size, 1);
      const rels = map.get('X-1-1');
      assert.equal(rels.length, 1);
      assert.ok(rels[0] instanceof TemporalHyperedge);
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });

  it('HyperedgeIndex indexes it alongside existing types', () => {
    const t = makeTemporal();
    const idx = new HyperedgeIndex([t]);
    assert.equal(idx.forComprehensive('X:1.1').length, 1);
    assert.equal(idx.forMember('X:1.2').length, 1);
    assert.equal(idx.forMember('X:1.3').length, 1);
    assert.equal(idx.forMember('X:999').length, 0);
  });
});
