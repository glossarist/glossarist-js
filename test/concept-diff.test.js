import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Concept, LocalizedConcept, Designation } from '../src/models/index.js';
import { diffLocalizedConcepts, diffConcepts } from '../src/concept-diff.js';

function makeLoc(data = {}) {
  return new LocalizedConcept({
    language_code: 'eng',
    terms: data.terms ?? [{ type: 'expression', designation: 'test term', normative_status: 'preferred' }],
    definition: data.definition ?? [{ content: 'test definition' }],
    notes: data.notes ?? [],
    examples: data.examples ?? [],
    ...data,
  });
}

function makeConcept(data = {}) {
  return new Concept({
    id: data.id ?? '1',
    localizations: { eng: data.loc ?? {} },
  });
}

describe('diffLocalizedConcepts', () => {
  test('identical concepts have no changes', () => {
    const a = makeLoc();
    const b = makeLoc();
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, false);
  });

  test('detects definition change', () => {
    const a = makeLoc({ definition: [{ content: 'old def' }] });
    const b = makeLoc({ definition: [{ content: 'new def' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.definition.changed, true);
    assert.equal(diff.definition.oldContent, 'old def');
    assert.equal(diff.definition.newContent, 'new def');
  });

  test('detects added designation', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [
      { type: 'expression', designation: 'term', normative_status: 'preferred' },
      { type: 'expression', designation: 'synonym', normative_status: 'admitted' },
    ] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.designations.added.length, 1);
    assert.equal(diff.designations.added[0].designation, 'synonym');
  });

  test('detects removed designation', () => {
    const a = makeLoc({ terms: [
      { type: 'expression', designation: 'term', normative_status: 'preferred' },
      { type: 'expression', designation: 'old synonym', normative_status: 'admitted' },
    ] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.designations.removed.length, 1);
    assert.equal(diff.designations.removed[0].designation, 'old synonym');
  });

  test('detects designation status change (preferred → admitted)', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'admitted' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.designations.changed.length, 1);
    assert.equal(diff.designations.changed[0].type, 'status-changed');
    assert.equal(diff.designations.changed[0].old.normativeStatus, 'preferred');
    assert.equal(diff.designations.changed[0].new.normativeStatus, 'admitted');
  });

  test('detects designation text change (preferred term renamed)', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'adjustment', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'adjustment of a measuring system', normative_status: 'preferred' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.designations.removed.length, 1);
    assert.equal(diff.designations.added.length, 1);
  });

  test('detects added note', () => {
    const a = makeLoc({ notes: [] });
    const b = makeLoc({ notes: [{ content: 'new note' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.deepEqual(diff.notes.added, ['new note']);
  });

  test('detects removed note', () => {
    const a = makeLoc({ notes: [{ content: 'old note' }] });
    const b = makeLoc({ notes: [] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.deepEqual(diff.notes.removed, ['old note']);
  });

  test('detects changed note (positional)', () => {
    const a = makeLoc({ notes: [{ content: 'note v1' }] });
    const b = makeLoc({ notes: [{ content: 'note v2' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.notes.changed.length, 1);
    assert.equal(diff.notes.changed[0].old, 'note v1');
    assert.equal(diff.notes.changed[0].new, 'note v2');
  });

  test('detects added example', () => {
    const a = makeLoc({ examples: [] });
    const b = makeLoc({ examples: [{ content: 'new example' }] });
    const diff = diffLocalizedConcepts(a, b);
    assert.equal(diff.hasChanges, true);
    assert.deepEqual(diff.examples.added, ['new example']);
  });

  test('handles null old concept', () => {
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'new term', normative_status: 'preferred' }] });
    const diff = diffLocalizedConcepts(null, b);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.designations.added.length, 1);
  });

  test('handles null new concept', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'old term', normative_status: 'preferred' }] });
    const diff = diffLocalizedConcepts(a, null);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.designations.removed.length, 1);
  });

  test('handles both null', () => {
    const diff = diffLocalizedConcepts(null, null);
    assert.equal(diff.hasChanges, false);
  });
});

describe('diffConcepts', () => {
  test('diffs two Concept objects by eng localization', () => {
    const oldC = makeConcept({ loc: {
      terms: [{ type: 'expression', designation: 'adjustment', normative_status: 'preferred' }],
      definition: [{ content: 'old definition' }],
    } });
    const newC = makeConcept({ id: '2', loc: {
      terms: [{ type: 'expression', designation: 'adjustment of a measuring system', normative_status: 'preferred' }],
      definition: [{ content: 'new definition' }],
    } });

    const diff = diffConcepts(oldC, newC, 'eng');
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.definition.changed, true);
    assert.equal(diff.designations.removed.length, 1);
    assert.equal(diff.designations.added.length, 1);
  });

  test('falls back to eng if requested language not found', () => {
    const oldC = makeConcept({ loc: {} });
    const newC = makeConcept({ id: '2', loc: {} });
    const diff = diffConcepts(oldC, newC, 'fra');
    assert.equal(diff.hasChanges, false);
  });
});

describe('Concept.prototype.diff', () => {
  test('can be called as a method', () => {
    const oldC = makeConcept({ loc: {
      terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }],
      definition: [{ content: 'old' }],
    } });
    const newC = makeConcept({ id: '2', loc: {
      terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }],
      definition: [{ content: 'new' }],
    } });

    const diff = oldC.diff(newC, 'eng');
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.definition.changed, true);
  });
});
