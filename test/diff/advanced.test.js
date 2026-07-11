import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/index.js';
import { ConceptCollection } from '../../src/concept-collection.js';
import {
  diffConcepts,
  diffConceptCollections,
  diffText,
  applyDiff,
  reverseDiff,
  renderConceptDiff,
  renderCollectionDiff,
  renderTextDiff,
  ConceptDiff,
  ConceptCollectionDiff,
} from '../../src/diff/index.js';

function makeConcept(data = {}) {
  return new Concept({
    id: data.id ?? '1',
    localizations: { eng: data.loc ?? {} },
    sources: data.sources,
    dates: data.dates,
    relatedConcepts: data.relatedConcepts,
    groups: data.groups,
    sections: data.sections,
    tags: data.tags,
    status: data.status,
    term: data.term,
    uri: data.uri,
  });
}

describe('Similarity score', () => {
  test('identical concepts have similarity 1.0', () => {
    const a = makeConcept({ loc: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] } });
    const b = makeConcept({ id: '2', loc: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] } });
    assert.equal(diffConcepts(a, b, 'eng').similarity, 1.0);
  });

  test('more changes → lower similarity', () => {
    const a = makeConcept({ loc: {
      terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }],
      definition: [{ content: 'def' }],
    } });
    const oneChange = makeConcept({ id: '2', loc: {
      terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }],
      definition: [{ content: 'changed' }],
    } });
    const manyChange = makeConcept({ id: '3', loc: {
      terms: [{ type: 'expression', designation: 'other', normative_status: 'admitted' }],
      definition: [{ content: 'totally different' }],
      notes: [{ content: 'new note' }],
    } });
    const s1 = diffConcepts(a, oneChange, 'eng').similarity;
    const s2 = diffConcepts(a, manyChange, 'eng').similarity;
    assert.ok(s1 > s2, `one change (${s1}) should be more similar than many changes (${s2})`);
    assert.ok(s1 < 1.0);
    assert.ok(s2 < s1);
  });

  test('similarity round-trips through serialization', () => {
    const a = makeConcept({ loc: { definition: [{ content: 'old' }] } });
    const b = makeConcept({ id: '2', loc: { definition: [{ content: 'new' }] } });
    const d = diffConcepts(a, b, 'eng');
    const restored = ConceptDiff.fromJSON(d.toJSON());
    assert.equal(restored.similarity, d.similarity);
  });

  test('LocalizedConceptDiff has similarity', () => {
    const a = makeConcept({ loc: { definition: [{ content: 'old' }] } });
    const b = makeConcept({ id: '2', loc: { definition: [{ content: 'new' }] } });
    const d = diffConcepts(a, b, 'eng');
    assert.ok(d.localization('eng').similarity < 1.0);
  });
});

describe('ConceptCollectionDiff', () => {
  test('identical collections have no changes', () => {
    const a = makeConcept({ id: '1' });
    const b = makeConcept({ id: '1' });
    const d = diffConceptCollections([a], [b]);
    assert.equal(d.hasChanges, false);
    assert.equal(d.matched.length, 1);
    assert.equal(d.added.length, 0);
    assert.equal(d.removed.length, 0);
  });

  test('detects added concept', () => {
    const old = [makeConcept({ id: '1' })];
    const newCol = [makeConcept({ id: '1' }), makeConcept({ id: '2' })];
    const d = diffConceptCollections(old, newCol);
    assert.equal(d.added.length, 1);
    assert.equal(d.added[0].value, '2');
    assert.equal(d.removed.length, 0);
  });

  test('detects removed concept', () => {
    const old = [makeConcept({ id: '1' }), makeConcept({ id: '2' })];
    const newCol = [makeConcept({ id: '1' })];
    const d = diffConceptCollections(old, newCol);
    assert.equal(d.removed.length, 1);
    assert.equal(d.removed[0].value, '2');
    assert.equal(d.added.length, 0);
  });

  test('detects changed matched concept', () => {
    const old = [makeConcept({ id: '1', loc: { definition: [{ content: 'old' }] } })];
    const newCol = [makeConcept({ id: '1', loc: { definition: [{ content: 'new' }] } })];
    const d = diffConceptCollections(old, newCol);
    assert.equal(d.matched.length, 1);
    assert.equal(d.changedIds.length, 1);
    assert.ok(d.conceptDiff('1').hasChanges);
    assert.ok(d.similarity < 1.0);
  });

  test('skipUnchanged omits diff for identical concepts', () => {
    const a = makeConcept({ id: '1', loc: { definition: [{ content: 'same' }] } });
    const b = makeConcept({ id: '1', loc: { definition: [{ content: 'same' }] } });
    const d = diffConceptCollections([a], [b], { skipUnchanged: true });
    assert.equal(d.matched.length, 1);
    assert.equal(d.changedIds.length, 0);
    assert.equal(d.conceptDiff('1'), null);
  });

  test('counts are correct', () => {
    const old = [makeConcept({ id: '1' }), makeConcept({ id: '2' }), makeConcept({ id: '3' })];
    const newCol = [makeConcept({ id: '2' }), makeConcept({ id: '3' }), makeConcept({ id: '4' })];
    const d = diffConceptCollections(old, newCol);
    assert.equal(d.oldCount, 3);
    assert.equal(d.newCount, 3);
    assert.equal(d.matched.length, 2);
    assert.equal(d.added.length, 1);
    assert.equal(d.removed.length, 1);
  });

  test('collection similarity averages per-concept', () => {
    const old = [makeConcept({ id: '1', loc: { definition: [{ content: 'a' }] } })];
    const newCol = [makeConcept({ id: '1', loc: { definition: [{ content: 'b' }] } })];
    const d = diffConceptCollections(old, newCol);
    const conceptSim = d.conceptDiff('1').similarity;
    assert.equal(d.similarity, conceptSim);
  });

  test('round-trips through serialization', () => {
    const old = [
      makeConcept({ id: '1', loc: { definition: [{ content: 'old' }] } }),
      makeConcept({ id: '0', loc: { definition: [{ content: 'gone' }] } }),
    ];
    const newCol = [
      makeConcept({ id: '1', loc: { definition: [{ content: 'new' }] } }),
      makeConcept({ id: '2', loc: { definition: [{ content: 'fresh' }] } }),
    ];
    const d = diffConceptCollections(old, newCol);
    const json = d.toJSON();
    const restored = ConceptCollectionDiff.fromJSON(json);
    assert.equal(restored.oldCount, 2);
    assert.equal(restored.newCount, 2);
    assert.equal(restored.added.length, 1);
    assert.equal(restored.removed.length, 1);
    assert.equal(restored.conceptDiff('1').hasChanges, true);
  });

  test('accepts ConceptCollection', () => {
    const old = new ConceptCollection([makeConcept({ id: '1' })]);
    const newCol = new ConceptCollection([makeConcept({ id: '1' }), makeConcept({ id: '2' })]);
    const d = diffConceptCollections(old, newCol);
    assert.equal(d.added.length, 1);
  });

  test('walker yields collection-level and per-concept entries', () => {
    const old = [makeConcept({ id: '1' })];
    const newCol = [makeConcept({ id: '2' })];
    const d = diffConceptCollections(old, newCol);
    const paths = [...d.walk()].map(e => e.path);
    assert.ok(paths.some(p => p.startsWith('removed[')));
    assert.ok(paths.some(p => p.startsWith('added[')));
  });
});

describe('applyDiff (forward patch)', () => {
  test('applyDiff produces concept matching new', () => {
    const old = makeConcept({ loc: {
      terms: [{ type: 'expression', designation: 'old', normative_status: 'preferred' }],
      definition: [{ content: 'old def' }],
    } });
    const next = makeConcept({ id: '1', loc: {
      terms: [{ type: 'expression', designation: 'new', normative_status: 'preferred' }],
      definition: [{ content: 'new def' }],
      notes: [{ content: 'a note' }],
    } });

    const d = diffConcepts(old, next, 'eng');
    const patched = applyDiff(old, d);

    assert.equal(patched.localization('eng').terms[0].designation, 'new');
    assert.equal(patched.localization('eng').definitions[0].content, 'new def');
    assert.equal(patched.localization('eng').notes[0].content, 'a note');
    assert.deepEqual(patched.toJSON(), next.toJSON());
  });

  test('applyDiff handles removed items', () => {
    const old = makeConcept({ loc: {
      terms: [
        { type: 'expression', designation: 'keep', normative_status: 'preferred' },
        { type: 'expression', designation: 'remove', normative_status: 'admitted' },
      ],
    } });
    const next = makeConcept({ id: '1', loc: {
      terms: [{ type: 'expression', designation: 'keep', normative_status: 'preferred' }],
    } });

    const d = diffConcepts(old, next, 'eng');
    const patched = applyDiff(old, d);
    assert.equal(patched.localization('eng').terms.length, 1);
    assert.equal(patched.localization('eng').terms[0].designation, 'keep');
  });

  test('applyDiff handles metadata changes', () => {
    const old = makeConcept({ status: 'draft' });
    const next = makeConcept({ id: '1', status: 'final' });
    const d = diffConcepts(old, next, 'eng');
    const patched = applyDiff(old, d);
    assert.equal(patched.status, 'final');
  });

  test('applyDiff handles language changes', () => {
    const old = makeConcept({ loc: { definition: [{ content: 'x' }] } });
    const next = new Concept({
      id: '1',
      localizations: {
        eng: { definition: [{ content: 'x' }] },
        fra: { definition: [{ content: 'y' }] },
      },
    });
    const d = diffConcepts(old, next, 'all');
    const patched = applyDiff(old, d);
    assert.ok(patched.hasLocalization('fra'));
  });

  test('applyDiff does not mutate the original', () => {
    const old = makeConcept({ loc: { definition: [{ content: 'original' }] } });
    const next = makeConcept({ id: '1', loc: { definition: [{ content: 'changed' }] } });
    const d = diffConcepts(old, next, 'eng');
    applyDiff(old, d);
    assert.equal(old.localization('eng').definitions[0].content, 'original');
  });
});

describe('reverseDiff', () => {
  test('reverseDiff swaps added and removed', () => {
    const old = makeConcept({ loc: { terms: [{ type: 'expression', designation: 'a', normative_status: 'preferred' }] } });
    const next = makeConcept({ id: '1', loc: { terms: [
      { type: 'expression', designation: 'a', normative_status: 'preferred' },
      { type: 'expression', designation: 'b', normative_status: 'admitted' },
    ] } });
    const d = diffConcepts(old, next, 'eng');
    const r = reverseDiff(d);
    assert.equal(r.localization('eng').designations.added.length, 0);
    assert.equal(r.localization('eng').designations.removed.length, 1);
  });

  test('reverseDiff swaps old and new IDs', () => {
    const old = makeConcept({ id: '100' });
    const next = makeConcept({ id: '200' });
    const d = diffConcepts(old, next, 'eng');
    const r = reverseDiff(d);
    assert.equal(r.oldId, '200');
    assert.equal(r.newId, '100');
  });

  test('applyDiff(newConcept, reverseDiff(d)) ≈ oldConcept', () => {
    const old = makeConcept({ loc: {
      terms: [{ type: 'expression', designation: 'old term', normative_status: 'preferred' }],
      definition: [{ content: 'old def' }],
    } });
    const next = makeConcept({ id: '1', loc: {
      terms: [{ type: 'expression', designation: 'new term', normative_status: 'preferred' }],
      definition: [{ content: 'new def' }],
      notes: [{ content: 'note' }],
    } });

    const d = diffConcepts(old, next, 'eng');
    const reversed = reverseDiff(d);
    const restored = applyDiff(next, reversed);
    assert.deepEqual(restored.toJSON(), old.toJSON());
  });

  test('reverseDiff of TextDiff flips hunk types', () => {
    const old = makeConcept({ loc: { definition: [{ content: 'hello world' }] } });
    const next = makeConcept({ id: '1', loc: { definition: [{ content: 'hello earth' }] } });
    const d = diffConcepts(old, next, 'eng');
    const change = d.localization('eng').definitions.changed[0];
    const reversedTd = reverseDiff(d).localization('eng').definitions.changed[0].textDiff;

    assert.equal(reversedTd.oldText, change.textDiff.newText);
    assert.equal(reversedTd.newText, change.textDiff.oldText);
    const addedText = reversedTd.hunks.filter(h => h.type === 'added').map(h => h.text).join('');
    assert.ok(addedText.includes('world'));
  });
});

describe('Diff Renderer', () => {
  test('renderConceptDiff produces text output', () => {
    const old = makeConcept({ loc: { definition: [{ content: 'old' }] } });
    const next = makeConcept({ id: '1', loc: { definition: [{ content: 'new' }] } });
    const d = diffConcepts(old, next, 'eng');
    const text = renderConceptDiff(d);
    assert.ok(text.includes('Concept'));
    assert.ok(text.includes('similar'));
  });

  test('renderConceptDiff shows "no changes" for identical', () => {
    const a = makeConcept({});
    const b = makeConcept({ id: '2' });
    const d = diffConcepts(a, b, 'eng');
    const text = renderConceptDiff(d);
    assert.match(text, /no changes/i);
  });

  test('renderConceptDiff shows similarity percentage', () => {
    const old = makeConcept({ loc: { definition: [{ content: 'a' }] } });
    const next = makeConcept({ id: '1', loc: { definition: [{ content: 'b' }] } });
    const d = diffConcepts(old, next, 'eng');
    const text = renderConceptDiff(d);
    assert.match(text, /\d+%/);
  });

  test('renderConceptDiff shows added/removed/changed sections', () => {
    const old = makeConcept({ loc: {
      terms: [{ type: 'expression', designation: 'old term', normative_status: 'preferred' }],
    } });
    const next = makeConcept({ id: '1', loc: {
      terms: [{ type: 'expression', designation: 'new term', normative_status: 'preferred' }],
      notes: [{ content: 'a note' }],
    } });
    const d = diffConcepts(old, next, 'eng');
    const text = renderConceptDiff(d);
    assert.match(text, /Designations:/);
    assert.match(text, /Notes:/);
    assert.ok(text.includes('new term'));
    assert.ok(text.includes('old term'));
  });

  test('renderConceptDiff supports ANSI colors', () => {
    const old = makeConcept({ loc: { definition: [{ content: 'old' }] } });
    const next = makeConcept({ id: '1', loc: { definition: [{ content: 'new' }] } });
    const d = diffConcepts(old, next, 'eng');
    const text = renderConceptDiff(d, { colors: true });
    assert.ok(text.includes('\x1b['));
  });

  test('renderCollectionDiff shows summary', () => {
    const old = [makeConcept({ id: '1' }), makeConcept({ id: '2' })];
    const next = [makeConcept({ id: '2' }), makeConcept({ id: '3' })];
    const d = diffConceptCollections(old, next);
    const text = renderCollectionDiff(d);
    assert.match(text, /Matched:/);
    assert.match(text, /Added:/);
    assert.match(text, /Removed:/);
    assert.ok(text.includes('3'));
  });

  test('renderTextDiff shows word-level hunks', () => {
    const td = diffText('hello world', 'hello earth');
    const text = renderTextDiff(td);
    assert.ok(text.includes('hello'));
    assert.ok(text.includes('world'));
    assert.ok(text.includes('earth'));
  });

  test('renderTextDiff supports ANSI colors', () => {
    const td = diffText('old', 'new');
    const text = renderTextDiff(td, { colors: true });
    assert.ok(text.includes('\x1b[31m') || text.includes('\x1b[32m'));
  });
});
