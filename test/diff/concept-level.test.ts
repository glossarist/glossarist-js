import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Concept, LocalizedConcept } from '../../src/models/index.js';
import {
  diffLocalizedConcepts,
  diffConcepts,
  ConceptDiff,
  ConceptLevelDiff,
  DiffStats,
  Change,
  Added,
  Removed,
  Changed,
} from '../../src/diff/index.js';

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

describe('Concept-level diff', () => {
  test('detects added concept-level source', () => {
    const oldC = makeConcept({});
    const newC = makeConcept({
      id: '2',
      sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } } }],
    });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.sources.added.length, 1);
  });

  test('detects removed concept-level source', () => {
    const oldC = makeConcept({
      sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '9001' } } }],
    });
    const newC = makeConcept({ id: '2' });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.sources.removed.length, 1);
  });

  test('detects concept-level date change', () => {
    const oldC = makeConcept({ dates: [{ type: 'accepted', date: '2020-01-01' }] });
    const newC = makeConcept({ id: '2', dates: [{ type: 'accepted', date: '2021-06-15' }] });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.dates.changed.length, 1);
    assert.equal(d.concept.dates.changed[0].textDiff.oldText, '2020-01-01');
    assert.equal(d.concept.dates.changed[0].textDiff.newText, '2021-06-15');
  });

  test('detects added related concept', () => {
    const oldC = makeConcept({});
    const newC = makeConcept({
      id: '2',
      relatedConcepts: [{ type: 'see', ref: { source: 'ISO', id: '12345' } }],
    });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.relatedConcepts.added.length, 1);
  });

  test('detects group membership change', () => {
    const oldC = makeConcept({ groups: ['group-a'] });
    const newC = makeConcept({ id: '2', groups: ['group-a', 'group-b'] });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.groups.added.length, 1);
    assert.equal(d.concept.groups.added[0].value, 'group-b');
  });

  test('detects tag removal', () => {
    const oldC = makeConcept({ tags: ['draft', 'reviewed'] });
    const newC = makeConcept({ id: '2', tags: ['reviewed'] });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.tags.removed.length, 1);
    assert.equal(d.concept.tags.removed[0].value, 'draft');
  });

  test('detects concept-level status change in metadata', () => {
    const oldC = makeConcept({ status: 'draft' });
    const newC = makeConcept({ id: '2', status: 'final' });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.metadata.changes.status.oldValue, 'draft');
    assert.equal(d.concept.metadata.changes.status.newValue, 'final');
  });

  test('detects URI change in metadata', () => {
    const oldC = makeConcept({ uri: 'https://example.com/v1' });
    const newC = makeConcept({ id: '2', uri: 'https://example.com/v2' });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.metadata.changes.uri.oldValue, 'https://example.com/v1');
    assert.equal(d.concept.metadata.changes.uri.newValue, 'https://example.com/v2');
  });

  test('concept-level hasChanges is true when only concept fields change', () => {
    const oldC = makeConcept({ tags: ['old'] });
    const newC = makeConcept({ id: '2', tags: ['new'] });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.hasChanges, true);
    assert.equal(d.hasChanges, true);
  });

  test('concept-level hasChanges is false when nothing changes', () => {
    const oldC = makeConcept({ tags: ['same'], status: 'same' });
    const newC = makeConcept({ id: '2', tags: ['same'], status: 'same' });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.equal(d.concept.hasChanges, false);
  });

  test('concept-level diff walker produces prefixed paths', () => {
    const oldC = makeConcept({});
    const newC = makeConcept({ id: '2', tags: ['new-tag'] });
    const d = diffConcepts(oldC, newC, 'eng');
    const paths = [...d.walk()].map(e => e.path);
    assert.ok(paths.some(p => p.startsWith('concept.tags.added')));
  });
});

describe('Language set diff', () => {
  test('detects added language', () => {
    const oldC = new Concept({ id: '1', localizations: { eng: {} } });
    const newC = new Concept({
      id: '2',
      localizations: {
        eng: {},
        fra: { terms: [{ type: 'expression', designation: 'terme', normative_status: 'preferred' }] },
      },
    });
    const d = diffConcepts(oldC, newC, 'all');
    assert.equal(d.languages.added.length, 1);
    assert.equal(d.languages.added[0].value, 'fra');
  });

  test('detects removed language', () => {
    const oldC = new Concept({
      id: '1',
      localizations: {
        eng: {},
        fra: { terms: [{ type: 'expression', designation: 'terme', normative_status: 'preferred' }] },
      },
    });
    const newC = new Concept({ id: '2', localizations: { eng: {} } });
    const d = diffConcepts(oldC, newC, 'all');
    assert.equal(d.languages.removed.length, 1);
    assert.equal(d.languages.removed[0].value, 'fra');
  });

  test('no language changes when same set', () => {
    const oldC = new Concept({ id: '1', localizations: { eng: {}, fra: {} } });
    const newC = new Concept({ id: '2', localizations: { eng: {}, fra: {} } });
    const d = diffConcepts(oldC, newC, 'all');
    assert.equal(d.languages.hasChanges, false);
  });

  test('language set diff contributes to hasChanges', () => {
    const oldC = new Concept({ id: '1', localizations: { eng: {} } });
    const newC = new Concept({ id: '2', localizations: { eng: {}, deu: {} } });
    const d = diffConcepts(oldC, newC, 'all');
    assert.equal(d.hasChanges, true);
  });

  test('language diff appears in walker', () => {
    const oldC = new Concept({ id: '1', localizations: { eng: {} } });
    const newC = new Concept({ id: '2', localizations: { eng: {}, deu: {} } });
    const d = diffConcepts(oldC, newC, 'all');
    const paths = [...d.walk()].map(e => e.path);
    assert.ok(paths.some(p => p.startsWith('languages.added')));
  });
});

describe('Diff statistics', () => {
  test('counts zero for identical concepts', () => {
    const a = makeConcept();
    const b = makeConcept({ id: '2' });
    const d = diffConcepts(a, b, 'eng');
    assert.equal(d.stats.added, 0);
    assert.equal(d.stats.removed, 0);
    assert.equal(d.stats.changed, 0);
    assert.equal(d.stats.total, 0);
  });

  test('counts additions across sections', () => {
    const oldC = makeConcept({ loc: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] } });
    const newC = makeConcept({
      id: '2',
      tags: ['new-tag'],
      loc: {
        terms: [
          { type: 'expression', designation: 'x', normative_status: 'preferred' },
          { type: 'expression', designation: 'y', normative_status: 'admitted' },
        ],
        notes: [{ content: 'a note' }],
      },
    });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.ok(d.stats.added >= 3, `expected >= 3 additions, got ${d.stats.added}`);
  });

  test('counts removals', () => {
    const oldC = makeConcept({
      tags: ['remove-me'],
      loc: {
        terms: [
          { type: 'expression', designation: 'x', normative_status: 'preferred' },
          { type: 'expression', designation: 'extra', normative_status: 'admitted' },
        ],
      },
    });
    const newC = makeConcept({
      id: '2',
      loc: { terms: [{ type: 'expression', designation: 'x', normative_status: 'preferred' }] },
    });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.ok(d.stats.removed >= 2, `expected >= 2 removals, got ${d.stats.removed}`);
  });

  test('counts changes', () => {
    const oldC = makeConcept({
      status: 'draft',
      loc: { definition: [{ content: 'old text' }] },
    });
    const newC = makeConcept({
      id: '2',
      status: 'final',
      loc: { definition: [{ content: 'new text' }] },
    });
    const d = diffConcepts(oldC, newC, 'eng');
    assert.ok(d.stats.changed >= 2, `expected >= 2 changes, got ${d.stats.changed}`);
  });

  test('stats round-trips through toJSON/fromJSON', () => {
    const s = new DiffStats({ added: 3, removed: 2, changed: 1 });
    const restored = DiffStats.fromJSON(s.toJSON());
    assert.equal(restored.added, 3);
    assert.equal(restored.removed, 2);
    assert.equal(restored.changed, 1);
    assert.equal(restored.total, 6);
  });
});

describe('Change.fromJSON polymorphic dispatch', () => {
  test('dispatches to Added by type field', () => {
    const c = Change.fromJSON({ type: 'added', value: 'x' });
    assert.ok(c instanceof Added);
    assert.equal(c.value, 'x');
  });

  test('dispatches to Removed by type field', () => {
    const c = Change.fromJSON({ type: 'removed', value: 'y' });
    assert.ok(c instanceof Removed);
    assert.equal(c.value, 'y');
  });

  test('dispatches to Changed by type field', () => {
    const c = Change.fromJSON({ type: 'changed', old_value: 'a', new_value: 'b' });
    assert.ok(c instanceof Changed);
    assert.equal(c.oldValue, 'a');
    assert.equal(c.newValue, 'b');
  });

  test('throws on unknown type', () => {
    assert.throws(() => Change.fromJSON({ type: 'bogus' }), /Unknown change type/);
  });
});

describe('Walker path consistency', () => {
  test('metadata paths are prefixed with metadata.', () => {
    const oldC = makeConcept({ loc: { definition: [{ content: 'x' }], entry_status: 'valid' } });
    const newC = makeConcept({ id: '2', loc: { definition: [{ content: 'x' }], entry_status: 'superseded' } });
    const d = diffConcepts(oldC, newC, 'eng');
    const paths = [...d.walk()].map(e => e.path);
    assert.ok(
      paths.some(p => p === 'localizations.eng.metadata.entryStatus'),
      `expected metadata path, got: ${paths.join(', ')}`,
    );
  });

  test('concept metadata paths are prefixed with concept.metadata.', () => {
    const oldC = makeConcept({ status: 'draft' });
    const newC = makeConcept({ id: '2', status: 'final' });
    const d = diffConcepts(oldC, newC, 'eng');
    const paths = [...d.walk()].map(e => e.path);
    assert.ok(
      paths.some(p => p === 'concept.metadata.status'),
      `expected concept.metadata path, got: ${paths.join(', ')}`,
    );
  });

  test('list paths follow section.type[index] pattern', () => {
    const oldC = makeConcept({ loc: { terms: [{ type: 'expression', designation: 'a', normative_status: 'preferred' }] } });
    const newC = makeConcept({
      id: '2',
      loc: { terms: [
        { type: 'expression', designation: 'a', normative_status: 'preferred' },
        { type: 'expression', designation: 'b', normative_status: 'admitted' },
      ] },
    });
    const d = diffConcepts(oldC, newC, 'eng');
    const paths = [...d.walk()].map(e => e.path);
    assert.ok(
      paths.some(p => /^localizations\.eng\.designations\.added\[\d+\]$/.test(p)),
      `expected designations.added path, got: ${paths.join(', ')}`,
    );
  });

  test('walker yields language field on localization entries only', () => {
    const oldC = makeConcept({ tags: ['x'] });
    const newC = makeConcept({ id: '2', tags: ['y'] });
    const d = diffConcepts(oldC, newC, 'eng');
    for (const entry of d.walk()) {
      if (entry.path.startsWith('concept.')) {
        assert.equal(entry.language, undefined);
      }
    }
  });
});

describe('ConceptLevelDiff serialization', () => {
  test('round-trips through toJSON/fromJSON', () => {
    const oldC = makeConcept({
      tags: ['a'],
      sources: [{ type: 'lineage', origin: { ref: { source: 'ISO', id: '1' } } }],
      status: 'draft',
    });
    const newC = makeConcept({
      id: '2',
      tags: ['a', 'b'],
      sources: [
        { type: 'lineage', origin: { ref: { source: 'ISO', id: '1' } } },
        { type: 'lineage', origin: { ref: { source: 'IEC', id: '2' } } },
      ],
      status: 'final',
    });
    const d = diffConcepts(oldC, newC, 'eng');
    const json = d.concept.toJSON();
    const restored = ConceptLevelDiff.fromJSON(json);

    assert.equal(restored.tags.added.length, 1);
    assert.equal(restored.sources.added.length, 1);
    assert.equal(restored.metadata.changes.status.newValue, 'final');
    assert.equal(restored.hasChanges, true);
  });
});

describe('ConceptDiff serialization with concept-level data', () => {
  test('round-trips with concept, languages, and localizations', () => {
    const oldC = new Concept({
      id: '1',
      tags: ['old'],
      localizations: { eng: { definition: [{ content: 'old' }] } },
    });
    const newC = new Concept({
      id: '2',
      tags: ['new'],
      localizations: {
        eng: { definition: [{ content: 'new' }] },
        fra: { definition: [{ content: 'nouveau' }] },
      },
    });
    const d = diffConcepts(oldC, newC, 'all');
    const json = d.toJSON();
    const restored = ConceptDiff.fromJSON(json);

    assert.equal(restored.oldId, '1');
    assert.equal(restored.newId, '2');
    assert.equal(restored.concept.tags.removed[0].value, 'old');
    assert.equal(restored.concept.tags.added[0].value, 'new');
    assert.equal(restored.languages.added[0].value, 'fra');
    assert.equal(restored.localization('eng').definitions.changed.length, 1);
    assert.equal(restored.localization('fra').definitions.added.length, 1);
    assert.equal(restored.hasChanges, true);
  });

  test('equals works on full concept diff', () => {
    const oldC = makeConcept({ tags: ['a'] });
    const newC = makeConcept({ id: '2', tags: ['b'] });
    const d1 = diffConcepts(oldC, newC, 'eng');
    const d2 = diffConcepts(oldC, newC, 'eng');
    assert.equal(d1.equals(d2), true);
  });
});

describe('diffTextList identity correctness', () => {
  test('same content different sources is a change', () => {
    const a = makeLoc({
      definition: [{ content: 'same text', sources: [{ ref: { source: 'A' } }] }],
    });
    const b = makeLoc({
      definition: [{ content: 'same text', sources: [{ ref: { source: 'B' } }] }],
    });
    const d = diffLocalizedConcepts(a, b);
    assert.equal(d.definitions.changed.length, 1);
  });
});
