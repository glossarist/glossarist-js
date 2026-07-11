import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Concept, LocalizedConcept } from '../src/models/index.js';
import {
  diffLocalizedConcepts,
  diffConcepts,
  ConceptDiff,
  LocalizedConceptDiff,
} from '../src/diff/index.js';

function makeLoc(data = {}) {
  return new LocalizedConcept({
    language_code: data.language_code ?? 'eng',
    terms: data.terms ?? [{ type: 'expression', designation: 'test term', normative_status: 'preferred' }],
    definition: data.definition ?? [{ content: 'test definition' }],
    notes: data.notes ?? [],
    examples: data.examples ?? [],
    sources: data.sources ?? [],
    dates: data.dates ?? [],
    ...data,
  });
}

function makeConcept(data = {}) {
  return new Concept({
    id: data.id ?? '1',
    localizations: { eng: data.loc ?? {} },
  });
}

describe('diffLocalizedConcepts — designations', () => {
  test('identical designations produce no changes', () => {
    const a = makeLoc();
    const b = makeLoc();
    assert.equal(diffLocalizedConcepts(a, b).designations.hasChanges, false);
  });

  test('added designation', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [
      { type: 'expression', designation: 'term', normative_status: 'preferred' },
      { type: 'expression', designation: 'synonym', normative_status: 'admitted' },
    ] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.added.length, 1);
    assert.equal(d.designations.added[0].value.designation, 'synonym');
  });

  test('removed designation', () => {
    const a = makeLoc({ terms: [
      { type: 'expression', designation: 'term', normative_status: 'preferred' },
      { type: 'expression', designation: 'old synonym', normative_status: 'admitted' },
    ] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.removed.length, 1);
    assert.equal(d.designations.removed[0].value.designation, 'old synonym');
  });

  test('designation status change (preferred → admitted) is a Changed entry', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'admitted' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.changed.length, 1);
    assert.equal(d.designations.changed[0].oldValue.normativeStatus, 'preferred');
    assert.equal(d.designations.changed[0].newValue.normativeStatus, 'admitted');
  });

  test('designation rename is add+remove, not change', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'adjustment', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'adjustment of a measuring system', normative_status: 'preferred' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.removed.length, 1);
    assert.equal(d.designations.added.length, 1);
    assert.equal(d.designations.changed.length, 0);
  });

  test('designation reordering is not a change', () => {
    const a = makeLoc({ terms: [
      { type: 'expression', designation: 'a', normative_status: 'preferred' },
      { type: 'expression', designation: 'b', normative_status: 'admitted' },
    ] });
    const b = makeLoc({ terms: [
      { type: 'expression', designation: 'b', normative_status: 'admitted' },
      { type: 'expression', designation: 'a', normative_status: 'preferred' },
    ] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.hasChanges, false);
  });

  test('same text different type are distinct designations', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'ISO', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [
      { type: 'expression', designation: 'ISO', normative_status: 'preferred' },
      { type: 'abbreviation', designation: 'ISO', normative_status: 'admitted' },
    ] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.added.length, 1);
  });

  test('usageInfo change on same designation is detected', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred', usage_info: 'archaic' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.designations.changed.length, 1);
    assert.equal(d.designations.changed[0].newValue.usageInfo, 'archaic');
  });
});

describe('diffLocalizedConcepts — definitions', () => {
  test('definition change carries word-level text diff', () => {
    const a = makeLoc({ definition: [{ content: 'old definition text' }] });
    const b = makeLoc({ definition: [{ content: 'new definition text' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.definitions.changed.length, 1);
    const changed = d.definitions.changed[0];
    assert.ok(changed.textDiff);
    assert.equal(changed.textDiff.removedText.trim(), 'old');
    assert.equal(changed.textDiff.addedText.trim(), 'new');
  });

  test('identical definitions produce no changes', () => {
    const a = makeLoc({ definition: [{ content: 'same definition' }] });
    const b = makeLoc({ definition: [{ content: 'same definition' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.definitions.hasChanges, false);
  });

  test('added definition', () => {
    const a = makeLoc({ definition: [] });
    const b = makeLoc({ definition: [{ content: 'new def' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.definitions.added.length, 1);
  });

  test('inserting a definition does not mark all as changed', () => {
    const a = makeLoc({ definition: [{ content: 'def B' }, { content: 'def C' }] });
    const b = makeLoc({ definition: [{ content: 'def A' }, { content: 'def B' }, { content: 'def C' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.definitions.added.length, 1);
    assert.equal(d.definitions.changed.length, 0);
  });
});

describe('diffLocalizedConcepts — notes and examples', () => {
  test('added note', () => {
    const a = makeLoc({ notes: [] });
    const b = makeLoc({ notes: [{ content: 'new note' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.notes.added.length, 1);
  });

  test('removed note', () => {
    const a = makeLoc({ notes: [{ content: 'old note' }] });
    const b = makeLoc({ notes: [] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.notes.removed.length, 1);
  });

  test('changed note carries word-level diff', () => {
    const a = makeLoc({ notes: [{ content: 'note v1 draft' }] });
    const b = makeLoc({ notes: [{ content: 'note v2 draft' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.notes.changed.length, 1);
    assert.equal(d.notes.changed[0].textDiff.removedText.trim(), 'v1');
    assert.equal(d.notes.changed[0].textDiff.addedText.trim(), 'v2');
  });

  test('added example', () => {
    const a = makeLoc({ examples: [] });
    const b = makeLoc({ examples: [{ content: 'example' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.examples.added.length, 1);
  });

  test('inserting note at beginning does not shift-match others', () => {
    const a = makeLoc({ notes: [{ content: 'note 1' }, { content: 'note 2' }] });
    const b = makeLoc({ notes: [{ content: 'intro' }, { content: 'note 1' }, { content: 'note 2' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.notes.added.length, 1);
    assert.equal(d.notes.changed.length, 0);
  });
});

describe('diffLocalizedConcepts — sources', () => {
  test('added source', () => {
    const a = makeLoc({ sources: [] });
    const b = makeLoc({ sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } } }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.sources.added.length, 1);
  });

  test('removed source', () => {
    const a = makeLoc({ sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } } }] });
    const b = makeLoc({ sources: [] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.sources.removed.length, 1);
  });

  test('same source in both is unchanged', () => {
    const src = { type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } } };
    const a = makeLoc({ sources: [src] });
    const b = makeLoc({ sources: [src] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.sources.hasChanges, false);
  });

  test('source modification is a changed entry', () => {
    const a = makeLoc({ sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } } }] });
    const b = makeLoc({ sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } }, modification: 'paraphrased' }] });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.sources.changed.length, 1);
  });
});

describe('diffLocalizedConcepts — metadata', () => {
  test('entry status change detected', () => {
    const a = makeLoc({ entry_status: 'valid' });
    const b = makeLoc({ entry_status: 'superseded' });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.metadata.changes.entryStatus.oldValue, 'valid');
    assert.equal(d.metadata.changes.entryStatus.newValue, 'superseded');
  });

  test('domain change detected', () => {
    const a = makeLoc({ domain: 'old' });
    const b = makeLoc({ domain: 'new' });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.metadata.changes.domain.oldValue, 'old');
    assert.equal(d.metadata.changes.domain.newValue, 'new');
  });

  test('identical metadata produces no changes', () => {
    const a = makeLoc({ entry_status: 'valid', domain: 'test' });
    const b = makeLoc({ entry_status: 'valid', domain: 'test' });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.metadata.hasChanges, false);
  });
});

describe('diffLocalizedConcepts — edge cases', () => {
  test('null both → empty diff', () => {
    const d = diffLocalizedConcepts(null, null);
    assert.equal(d.hasChanges, false);
  });

  test('null old → everything added', () => {
    const b = makeLoc({
      terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }],
      definition: [{ content: 'def' }],
      notes: [{ content: 'note' }],
      entry_status: 'valid',
    });
    const d = diffLocalizedConcepts(null, b);
    assert.equal(d.hasChanges, true);
    assert.equal(d.designations.added.length, 1);
    assert.equal(d.definitions.added.length, 1);
    assert.equal(d.notes.added.length, 1);
    assert.equal(d.metadata.changes.entryStatus.newValue, 'valid');
  });

  test('null new → everything removed', () => {
    const a = makeLoc({
      terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }],
      definition: [{ content: 'def' }],
    });
    const d = diffLocalizedConcepts(a, null);
    assert.equal(d.hasChanges, true);
    assert.equal(d.designations.removed.length, 1);
    assert.equal(d.definitions.removed.length, 1);
  });
});

describe('diffConcepts', () => {
  test('diffs two Concept objects by eng localization', () => {
    const oldC = makeConcept({
      loc: {
        terms: [{ type: 'expression', designation: 'adjustment', normative_status: 'preferred' }],
        definition: [{ content: 'old definition' }],
      },
    });
    const newC = makeConcept({
      id: '2',
      loc: {
        terms: [{ type: 'expression', designation: 'adjustment of a measuring system', normative_status: 'preferred' }],
        definition: [{ content: 'new definition' }],
      },
    });

    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.hasChanges, true);
    assert.equal(d.localization('eng').definitions.changed.length, 1);
    assert.equal(d.localization('eng').designations.removed.length, 1);
    assert.equal(d.localization('eng').designations.added.length, 1);
  });

  test('falls back to eng if requested language not found', () => {
    const oldC = makeConcept({ loc: {} });
    const newC = makeConcept({ id: '2', loc: {} });
    const d = diffConcepts(oldC, newC, 'fra');
    assert.equal(d.hasChanges, false);
    assert.ok(d.localizationLanguages.includes('eng'));
  });

  test('language=all diffs every language', () => {
    const oldC = new Concept({
      id: '1',
      localizations: {
        eng: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] },
        fra: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] },
      },
    });
    const newC = new Concept({
      id: '2',
      localizations: {
        eng: { terms: [{ type: 'expression', designation: 'y', normative_status: 'preferred' }] },
        fra: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] },
      },
    });
    const d = diffConcepts(oldC, newC, 'all');
    assert.ok(d.localizationLanguages.includes('eng'));
    assert.ok(d.localizationLanguages.includes('fra'));
    assert.equal(d.localization('eng').hasChanges, true);
    assert.equal(d.localization('fra').hasChanges, false);
  });

  test('both null → empty diff', () => {
    const d = diffConcepts(null, null);
    assert.equal(d.hasChanges, false);
  });

  test('records concept IDs', () => {
    const oldC = makeConcept({ id: '100' });
    const newC = makeConcept({ id: '200' });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.oldId, '100');
    assert.equal(d.newId, '200');
  });
});

describe('Concept.prototype.diff', () => {
  test('can be called as a method', () => {
    const oldC = makeConcept({
      loc: {
        terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }],
        definition: [{ content: 'old' }],
      },
    });
    const newC = makeConcept({
      id: '2',
      loc: {
        terms: [{ type: 'expression', designation: 'term', normative_status: 'preferred' }],
        definition: [{ content: 'new' }],
      },
    });

    const d = oldC.diff(newC, 'eng');
    assert.equal(d.hasChanges, true);
    assert.equal(d.localization('eng').definitions.changed.length, 1);
  });
});

describe('ConceptDiff walker', () => {
  test('walks every change with dotted path', () => {
    const oldC = makeConcept({
      loc: {
        terms: [{ type: 'expression', designation: 'old term', normative_status: 'preferred' }],
        definition: [{ content: 'old def' }],
        notes: [{ content: 'old note' }],
      },
    });
    const newC = makeConcept({
      id: '2',
      loc: {
        terms: [{ type: 'expression', designation: 'new term', normative_status: 'preferred' }],
        definition: [{ content: 'new def' }],
        notes: [{ content: 'old note' }, { content: 'new note' }],
      },
    });

    const d = diffConcepts(oldC, newC, 'eng');
    const entries = [...d.walk()];
    const paths = entries.map(e => e.path);

    assert.ok(paths.some(p => p.startsWith('localizations.eng.designations.added')));
    assert.ok(paths.some(p => p.startsWith('localizations.eng.designations.removed')));
    assert.ok(paths.some(p => p.startsWith('localizations.eng.definitions.changed')));
    assert.ok(paths.some(p => p.startsWith('localizations.eng.notes.added')));
    assert.ok(entries.every(e => e.language === 'eng'));
  });

  test('no changes yields empty walk', () => {
    const a = makeConcept();
    const b = makeConcept({ id: '2' });
    const d = diffConcepts(a, b, 'eng');
    assert.equal([...d.walk()].length, 0);
  });
});

describe('Serialization', () => {
  test('ConceptDiff round-trips through toJSON/fromJSON', () => {
    const oldC = makeConcept({
      loc: {
        terms: [{ type: 'expression', designation: 'old', normative_status: 'preferred' }],
        definition: [{ content: 'old def' }],
      },
    });
    const newC = makeConcept({
      id: '2',
      loc: {
        terms: [{ type: 'expression', designation: 'new', normative_status: 'preferred' }],
        definition: [{ content: 'new def' }],
      },
    });

    const d = diffConcepts(oldC, newC, 'eng');
    const json = d.toJSON();
    const restored = ConceptDiff.fromJSON(json);

    assert.equal(restored.hasChanges, true);
    assert.equal(restored.oldId, '1');
    assert.equal(restored.newId, '2');
    assert.equal(restored.localization('eng').designations.added.length, 1);
    assert.equal(restored.localization('eng').designations.removed.length, 1);
    assert.equal(restored.localization('eng').definitions.changed.length, 1);
    assert.ok(restored.localization('eng').definitions.changed[0].textDiff);
  });

  test('LocalizedConceptDiff round-trips', () => {
    const a = makeLoc({ definition: [{ content: 'a' }] });
    const b = makeLoc({ definition: [{ content: 'b' }] });
    const d = diffLocalizedConcepts(a, b);
    const restored = LocalizedConceptDiff.fromJSON(d.toJSON());
    assert.equal(restored.definitions.changed.length, 1);
  });

  test('ConceptDiff equals is symmetric', () => {
    const a = makeConcept({ loc: { definition: [{ content: 'old' }] } });
    const b = makeConcept({ id: '2', loc: { definition: [{ content: 'new' }] } });
    const d1 = diffConcepts(a, b, 'eng');
    const d2 = diffConcepts(a, b, 'eng');
    assert.equal(d1.equals(d2), true);
  });

  test('ConceptDiff clone produces equal instance', () => {
    const a = makeConcept({ loc: { definition: [{ content: 'old' }] } });
    const b = makeConcept({ id: '2', loc: { definition: [{ content: 'new' }] } });
    const d = diffConcepts(a, b, 'eng');
    const c = d.clone();
    assert.equal(d.equals(c), true);
    assert.notEqual(d, c);
  });
});

describe('Symmetry', () => {
  test('diff(a,b).added ≈ diff(b,a).removed', () => {
    const a = makeLoc({ terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] });
    const b = makeLoc({ terms: [
      { type: 'expression', designation: 'x', normative_status: 'preferred' },
      { type: 'expression', designation: 'y', normative_status: 'admitted' },
    ] });
    const forward = diffLocalizedConcepts(a, b);
    const backward = diffLocalizedConcepts(b, a);
    assert.equal(forward.designations.added.length, backward.designations.removed.length);
    assert.equal(forward.designations.removed.length, backward.designations.added.length);
  });
});
