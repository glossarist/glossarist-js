// Round-trip property test for diffConcepts / applyDiff / reverseDiff.
//
// For every (oldConcept, newConcept) pair:
//   applyDiff(old, diffConcepts(old, new)) must deep-equal new
//   applyDiff(new, reverseDiff(diffConcepts(old, new))) must deep-equal old
//
// Adding a new diffable field without wiring applyDiff breaks the
// forward property immediately. Breaking reverseDiff breaks the
// reverse property. Together they guard the invariant N3
// (TODO.hyperedges-v2/00-master-plan.md).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';
import {
  diffConcepts,
  applyDiff,
  reverseDiff,
} from '../../src/diff/index.js';
import { canonicalJson } from '../../src/diff/canonical-json.js';

function assertConceptsEqual(a, b, label) {
  const aJson = canonicalJson(a.toJSON());
  const bJson = canonicalJson(b.toJSON());
  assert.equal(aJson, bJson,
    `concepts differ after round-trip (${label})\n` +
    `  expected: ${bJson}\n` +
    `  actual:   ${aJson}`);
}

function makeConcept(overrides = {}) {
  const data = {
    id: overrides.id ?? '1',
    term: overrides.term ?? null,
    localizations: overrides.localizations ?? {
      eng: {
        language_code: 'eng',
        terms: [{
          type: 'expression',
          designation: 'example',
          normative_status: 'preferred',
        }],
        definition: [{ content: 'A concept used as an example.' }],
        entry_status: 'valid',
      },
    },
    ...overrides,
  };
  delete data.id;
  delete data.term;
  delete data.localizations;
  return new Concept({
    id: overrides.id ?? '1',
    term: overrides.term ?? null,
    localizations: overrides.localizations ?? {
      eng: {
        language_code: 'eng',
        terms: [{
          type: 'expression',
          designation: 'example',
          normative_status: 'preferred',
        }],
        definition: [{ content: 'A concept used as an example.' }],
        entry_status: 'valid',
      },
    },
    ...data,
  });
}

describe('diff round-trip property', () => {
  const cases = [
    {
      name: 'identical',
      old: makeConcept(),
      new: makeConcept(),
    },
    {
      name: 'add a partitive relation',
      old: makeConcept(),
      new: makeConcept({
        partitiveRelations: [new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
          completeness: 'complete',
        })],
      }),
    },
    {
      name: 'remove a partitive relation',
      old: makeConcept({
        partitiveRelations: [new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
          completeness: 'complete',
        })],
      }),
      new: makeConcept(),
    },
    {
      name: 'change relation plurality',
      old: makeConcept({
        partitiveRelations: [new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
          completeness: 'complete',
          plurality: { is_shared: true },
        })],
      }),
      new: makeConcept({
        partitiveRelations: [new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
          completeness: 'complete',
          plurality: { is_shared: true, is_uncertain: true },
        })],
      }),
    },
    {
      name: 'change relation completeness',
      old: makeConcept({
        partitiveRelations: [new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
          completeness: 'complete',
        })],
      }),
      new: makeConcept({
        partitiveRelations: [new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
          completeness: 'partial',
        })],
      }),
    },
    {
      name: 'add a related concept',
      old: makeConcept(),
      new: makeConcept({
        relatedConcepts: [{
          type: 'see',
          ref: { source: 'IEV', id: '103-01' },
          content: 'see also',
        }],
      }),
    },
    {
      name: 'change status metadata',
      old: makeConcept({ status: 'valid' }),
      new: makeConcept({ status: 'superseded' }),
    },
    {
      name: 'add a source',
      old: makeConcept(),
      new: makeConcept({
        sources: [{
          type: 'authoritative',
          status: 'identical',
          origin: {
            ref: { source: 'ISO', id: '9000' },
          },
        }],
      }),
    },
    {
      name: 'change a definition',
      old: makeConcept({
        localizations: {
          eng: {
            language_code: 'eng',
            terms: [{ type: 'expression', designation: 'old' }],
            definition: [{ content: 'old definition' }],
            entry_status: 'valid',
          },
        },
      }),
      new: makeConcept({
        localizations: {
          eng: {
            language_code: 'eng',
            terms: [{ type: 'expression', designation: 'new' }],
            definition: [{ content: 'new definition' }],
            entry_status: 'valid',
          },
        },
      }),
    },
    {
      name: 'change tags',
      old: makeConcept({ tags: ['a', 'b'] }),
      new: makeConcept({ tags: ['a', 'c'] }),
    },
  ];

  for (const { name, old: oldC, new: newC } of cases) {
    it(`forward: applyDiff reproduces new (${name})`, () => {
      const diff = diffConcepts(oldC, newC);
      const reconstructed = applyDiff(oldC, diff);
      assertConceptsEqual(reconstructed, newC, name);
    });

    it(`reverse: applyDiff(new, reverseDiff) reproduces old (${name})`, () => {
      const diff = diffConcepts(oldC, newC);
      const reversed = reverseDiff(diff);
      const restored = applyDiff(newC, reversed);
      assertConceptsEqual(restored, oldC, name);
    });
  }
});
