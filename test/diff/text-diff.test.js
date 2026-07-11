import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { diffText, TextDiff, TextHunk } from '../../src/diff/text-diff.js';

describe('diffText', () => {
  test('identical text produces only equal hunks', () => {
    const d = diffText('hello world', 'hello world');
    assert.equal(d.hasChanges, false);
    assert.equal(d.hunks.length, 1);
    assert.equal(d.hunks[0].type, 'equal');
    assert.equal(d.hunks[0].text, 'hello world');
  });

  test('empty to empty produces no hunks', () => {
    const d = diffText('', '');
    assert.equal(d.hasChanges, false);
    assert.deepEqual(d.hunks, []);
  });

  test('empty to text is one added hunk', () => {
    const d = diffText('', 'hello');
    assert.equal(d.hasChanges, true);
    assert.equal(d.hunks.length, 1);
    assert.equal(d.hunks[0].type, 'added');
    assert.equal(d.addedText, 'hello');
  });

  test('text to empty is one removed hunk', () => {
    const d = diffText('hello', '');
    assert.equal(d.hasChanges, true);
    assert.equal(d.hunks.length, 1);
    assert.equal(d.hunks[0].type, 'removed');
    assert.equal(d.removedText, 'hello');
  });

  test('single word change', () => {
    const d = diffText('old definition', 'new definition');
    assert.equal(d.hasChanges, true);
    assert.equal(d.addedText, 'new');
    assert.equal(d.removedText, 'old');
  });

  test('word inserted in middle', () => {
    const d = diffText('adjustment measuring', 'adjustment of a measuring');
    assert.equal(d.hasChanges, true);
    assert.equal(d.addedText.trim(), 'of a');
    assert.equal(d.removedText, '');
  });

  test('word deleted from middle', () => {
    const d = diffText('adjustment of a measuring', 'adjustment measuring');
    assert.equal(d.hasChanges, true);
    assert.equal(d.removedText.trim(), 'of a');
    assert.equal(d.addedText, '');
  });

  test('complete rewrite', () => {
    const d = diffText('aaa bbb ccc', 'xxx yyy zzz');
    assert.equal(d.hasChanges, true);
    assert.equal(d.addedText, 'xxxyyyzzz');
    assert.equal(d.removedText, 'aaabbbccc');
  });

  test('null inputs are coerced to empty', () => {
    const d = diffText(null, null);
    assert.equal(d.hasChanges, false);
  });

  test('undefined inputs are coerced to empty', () => {
    const d = diffText(undefined, 'hello');
    assert.equal(d.hasChanges, true);
    assert.equal(d.addedText, 'hello');
  });

  test('whitespace preserved in equal hunk', () => {
    const d = diffText('term  with  spaces', 'term  with  spaces');
    assert.equal(d.hunks.length, 1);
    assert.equal(d.hunks[0].text, 'term  with  spaces');
  });

  test('multiline text diff', () => {
    const d = diffText('line one\nline two\nline three', 'line one\nline TWO\nline three');
    assert.equal(d.hasChanges, true);
    assert.equal(d.removedText, 'two');
    assert.equal(d.addedText, 'TWO');
  });

  test('coalesces adjacent same-type hunks', () => {
    const d = diffText('aaa bbb ccc', 'xxx yyy zzz');
    const addedHunks = d.hunks.filter(h => h.type === 'added');
    for (const hunk of addedHunks) {
      assert.match(hunk.text, /^\S+$/);
    }
  });
});

describe('TextDiff', () => {
  test('round-trips through toJSON/fromJSON', () => {
    const d = diffText('old text', 'new text');
    const json = d.toJSON();
    const restored = TextDiff.fromJSON(json);
    assert.equal(restored.oldText, d.oldText);
    assert.equal(restored.newText, d.newText);
    assert.equal(restored.hunks.length, d.hunks.length);
    assert.equal(restored.hasChanges, true);
  });

  test('equals inherited from GlossaristModel', () => {
    const a = diffText('hello', 'world');
    const b = diffText('hello', 'world');
    assert.equal(a.equals(b), true);
  });

  test('clone produces equal but distinct instance', () => {
    const a = diffText('hello', 'world');
    const b = a.clone();
    assert.equal(a.equals(b), true);
    assert.notEqual(a, b);
  });
});

describe('TextHunk', () => {
  test('rejects invalid type', () => {
    assert.throws(() => new TextHunk({ type: 'invalid', text: 'x' }), /type must be/);
  });

  test('round-trips through toJSON/fromJSON', () => {
    const h = new TextHunk({ type: 'added', text: 'hello' });
    const json = h.toJSON();
    const restored = TextHunk.fromJSON(json);
    assert.equal(restored.type, 'added');
    assert.equal(restored.text, 'hello');
  });
});
