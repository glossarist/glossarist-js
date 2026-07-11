import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ListDiff,
  diffList,
  diffSet,
} from '../../src/diff/list-diff.js';
import {
  Added,
  Removed,
  Changed,
  deserializeChange,
} from '../../src/diff/change.js';
import { TextDiff } from '../../src/diff/text-diff.js';

describe('Added', () => {
  test('type is added', () => {
    assert.equal(new Added({ value: 'x' }).type, 'added');
  });

  test('toJSON round-trips', () => {
    const a = new Added({ value: 'x', path: 'terms' });
    const json = a.toJSON();
    assert.equal(json.type, 'added');
    assert.equal(json.value, 'x');
    assert.equal(json.path, 'terms');
    const restored = Added.fromJSON(json);
    assert.equal(restored.value, 'x');
    assert.equal(restored.path, 'terms');
  });
});

describe('Removed', () => {
  test('type is removed', () => {
    assert.equal(new Removed({ value: 'x' }).type, 'removed');
  });

  test('toJSON round-trips', () => {
    const r = new Removed({ value: 'x' });
    const restored = Removed.fromJSON(r.toJSON());
    assert.equal(restored.value, 'x');
  });
});

describe('Changed', () => {
  test('type is changed', () => {
    assert.equal(new Changed({ oldValue: 'a', newValue: 'b' }).type, 'changed');
  });

  test('carries optional textDiff', () => {
    const td = new TextDiff({ oldText: 'a', newText: 'b', hunks: [] });
    const c = new Changed({ oldValue: 'a', newValue: 'b', textDiff: td });
    assert.equal(c.textDiff, td);
  });

  test('toJSON round-trips with text_diff', () => {
    const td = new TextDiff({ oldText: 'a', newText: 'b', hunks: [] });
    const c = new Changed({ oldValue: 'a', newValue: 'b', textDiff: td });
    const json = c.toJSON();
    assert.equal(json.type, 'changed');
    assert.equal(json.old_value, 'a');
    assert.equal(json.new_value, 'b');
    assert.ok(json.text_diff);
    const restored = Changed.fromJSON(json);
    assert.equal(restored.oldValue, 'a');
    assert.equal(restored.newValue, 'b');
    assert.ok(restored.textDiff instanceof TextDiff);
  });

  test('accepts snake_case keys in constructor', () => {
    const c = new Changed({ old_value: 'a', new_value: 'b' });
    assert.equal(c.oldValue, 'a');
    assert.equal(c.newValue, 'b');
  });
});

describe('deserializeChange', () => {
  test('dispatches by type', () => {
    assert.ok(deserializeChange({ type: 'added', value: 'x' }) instanceof Added);
    assert.ok(deserializeChange({ type: 'removed', value: 'x' }) instanceof Removed);
    assert.ok(deserializeChange({ type: 'changed', old_value: 'a', new_value: 'b' }) instanceof Changed);
  });

  test('throws on unknown type', () => {
    assert.throws(() => deserializeChange({ type: 'bogus' }), /Unknown change type/);
  });
});

describe('ListDiff', () => {
  test('hasChanges is false for empty diff', () => {
    const ld = new ListDiff({});
    assert.equal(ld.hasChanges, false);
    assert.equal(ld.count, 0);
  });

  test('entries yields all groups', () => {
    const ld = new ListDiff({
      added: [new Added({ value: 'a' })],
      removed: [new Removed({ value: 'b' })],
      changed: [new Changed({ oldValue: 'c', newValue: 'd' })],
    });
    const all = [...ld.entries()];
    assert.equal(all.length, 3);
    assert.equal(ld.count, 3);
    assert.equal(ld.hasChanges, true);
  });

  test('toJSON/fromJSON round-trips', () => {
    const ld = new ListDiff({
      added: [new Added({ value: 'a' })],
      removed: [new Removed({ value: 'b' })],
      changed: [new Changed({ oldValue: 'c', newValue: 'd' })],
    });
    const json = ld.toJSON();
    const restored = ListDiff.fromJSON(json);
    assert.equal(restored.added.length, 1);
    assert.equal(restored.removed.length, 1);
    assert.equal(restored.changed.length, 1);
    assert.equal(restored.hasChanges, true);
  });
});

describe('diffList (ordered LCS)', () => {
  test('identical lists produce no changes', () => {
    const d = diffList(['a', 'b'], ['a', 'b']);
    assert.equal(d.hasChanges, false);
  });

  test('item appended', () => {
    const d = diffList(['a', 'b'], ['a', 'b', 'c']);
    assert.equal(d.added.length, 1);
    assert.equal(d.removed.length, 0);
  });

  test('item removed from end', () => {
    const d = diffList(['a', 'b', 'c'], ['a', 'b']);
    assert.equal(d.removed.length, 1);
    assert.equal(d.added.length, 0);
  });

  test('item inserted at beginning does not mark all as changed', () => {
    const d = diffList(['b', 'c'], ['a', 'b', 'c']);
    assert.equal(d.added.length, 1);
    assert.equal(d.removed.length, 0);
    assert.equal(d.changed.length, 0);
  });

  test('item at same position with different content is "changed"', () => {
    const d = diffList(['old'], ['new']);
    assert.equal(d.changed.length, 1);
    assert.equal(d.changed[0].oldValue, 'old');
    assert.equal(d.changed[0].newValue, 'new');
  });

  test('changed string carries textDiff', () => {
    const d = diffList(['old text'], ['new text'], {
      identityKey: s => s,
      textKey: s => s,
    });
    assert.equal(d.changed.length, 1);
    assert.ok(d.changed[0].textDiff);
    assert.equal(d.changed[0].textDiff.oldText, 'old text');
    assert.equal(d.changed[0].textDiff.newText, 'new text');
  });

  test('empty lists produce no changes', () => {
    assert.equal(diffList([], []).hasChanges, false);
  });

  test('empty to populated is all added', () => {
    const d = diffList([], ['a', 'b']);
    assert.equal(d.added.length, 2);
  });

  test('populated to empty is all removed', () => {
    const d = diffList(['a', 'b'], []);
    assert.equal(d.removed.length, 2);
  });

  test('default identityKey uses JSON.stringify for objects', () => {
    const d = diffList([{ a: 1 }], [{ a: 1 }]);
    assert.equal(d.hasChanges, false);
  });
});

describe('diffSet (unordered identity match)', () => {
  test('identical sets produce no changes', () => {
    const d = diffSet(
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'a' }, { id: 'b' }],
      { identityKey: x => x.id },
    );
    assert.equal(d.hasChanges, false);
  });

  test('added item detected', () => {
    const d = diffSet(
      [{ id: 'a' }],
      [{ id: 'a' }, { id: 'b' }],
      { identityKey: x => x.id },
    );
    assert.equal(d.added.length, 1);
    assert.equal(d.added[0].value.id, 'b');
  });

  test('removed item detected', () => {
    const d = diffSet(
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'a' }],
      { identityKey: x => x.id },
    );
    assert.equal(d.removed.length, 1);
    assert.equal(d.removed[0].value.id, 'b');
  });

  test('same identity but different content is "changed"', () => {
    const d = diffSet(
      [{ id: 'a', status: 'preferred' }],
      [{ id: 'a', status: 'admitted' }],
      { identityKey: x => x.id },
    );
    assert.equal(d.changed.length, 1);
    assert.equal(d.changed[0].oldValue.status, 'preferred');
    assert.equal(d.changed[0].newValue.status, 'admitted');
  });

  test('reordering does not produce changes', () => {
    const d = diffSet(
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'b' }, { id: 'a' }],
      { identityKey: x => x.id },
    );
    assert.equal(d.hasChanges, false);
  });

  test('textKey attaches word-level diff on changed items', () => {
    const d = diffSet(
      [{ id: 'a', text: 'hello world' }],
      [{ id: 'a', text: 'hello earth' }],
      { identityKey: x => x.id, textKey: x => x.text },
    );
    assert.equal(d.changed.length, 1);
    assert.ok(d.changed[0].textDiff);
    assert.equal(d.changed[0].textDiff.removedText.trim(), 'world');
    assert.equal(d.changed[0].textDiff.addedText.trim(), 'earth');
  });
});
