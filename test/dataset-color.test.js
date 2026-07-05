// Tests for the DatasetColor spec + Register color field (TODO 31).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Register,
  resolveColor,
  isColorPair,
  validateColor,
  COLOR_MODES,
} from '../src/models/index.js';

describe('resolveColor', () => {
  it('returns the single hex for any mode when spec is a string', () => {
    assert.equal(resolveColor('#ff0000', 'light'), '#ff0000');
    assert.equal(resolveColor('#ff0000', 'dark'), '#ff0000');
  });

  it('returns the matching hex when spec is a pair', () => {
    const pair = { light: '#eeeeee', dark: '#111111' };
    assert.equal(resolveColor(pair, 'light'), '#eeeeee');
    assert.equal(resolveColor(pair, 'dark'), '#111111');
  });

  it('returns null when the pair is missing the requested mode', () => {
    assert.equal(resolveColor({ light: '#eee' }, 'dark'), null);
    assert.equal(resolveColor({ dark: '#111' }, 'light'), null);
  });

  it('returns null for null/undefined input', () => {
    assert.equal(resolveColor(null, 'light'), null);
    assert.equal(resolveColor(undefined, 'dark'), null);
  });
});

describe('isColorPair', () => {
  it('true for { light, dark } object', () => {
    assert.equal(isColorPair({ light: '#fff', dark: '#000' }), true);
  });

  it('false for string spec', () => {
    assert.equal(isColorPair('#ffffff'), false);
  });

  it('false for null', () => {
    assert.equal(isColorPair(null), false);
  });
});

describe('validateColor', () => {
  it('returns null for a valid hex string', () => {
    assert.equal(validateColor('#abc'), null);
    assert.equal(validateColor('#aabbcc'), null);
    assert.equal(validateColor('#aabbccff'), null);
  });

  it('returns null for a valid pair', () => {
    assert.equal(validateColor({ light: '#fff', dark: '#000' }), null);
  });

  it('rejects non-hex strings', () => {
    assert.match(validateColor('red'), /not a valid hex color/);
  });

  it('rejects pair with no modes', () => {
    assert.match(validateColor({}), /at least one of/);
  });

  it('rejects pair with bad hex', () => {
    assert.match(validateColor({ light: 'red', dark: '#000' }), /color\.light: /);
  });
});

describe('COLOR_MODES', () => {
  it('exposes light and dark', () => {
    assert.deepEqual([...COLOR_MODES], ['light', 'dark']);
  });
});

describe('Register#color + resolvedColor', () => {
  it('accepts a single hex string', () => {
    const reg = new Register({ id: 'x', color: '#3366ff' });
    assert.equal(reg.color, '#3366ff');
    assert.equal(reg.resolvedColor('light'), '#3366ff');
    assert.equal(reg.resolvedColor('dark'), '#3366ff');
  });

  it('accepts a { light, dark } pair', () => {
    const reg = new Register({
      id: 'x',
      color: { light: '#3366ff', dark: '#ff5d5d' },
    });
    assert.equal(reg.resolvedColor('light'), '#3366ff');
    assert.equal(reg.resolvedColor('dark'), '#ff5d5d');
  });

  it('returns null when no color is set', () => {
    const reg = new Register({ id: 'x' });
    assert.equal(reg.color, null);
    assert.equal(reg.resolvedColor('light'), null);
  });

  it('round-trips string color through toJSON', () => {
    const reg = new Register({ id: 'x', color: '#3366ff' });
    assert.equal(reg.toJSON().color, '#3366ff');
  });

  it('round-trips pair color through toJSON (deep copy)', () => {
    const original = { light: '#3366ff', dark: '#ff5d5d' };
    const reg = new Register({ id: 'x', color: original });
    const out = reg.toJSON().color;
    assert.deepEqual(out, original);
    assert.notEqual(out, original, 'toJSON must deep-copy the pair');
  });
});
