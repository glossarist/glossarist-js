import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchLocalizedString,
  localizedStringIsEmpty,
  localizedStringIsPresent,
} from '../../src/models/localized-string.js';

describe('LocalizedString utility', () => {
  describe('fetchLocalizedString', () => {
    it('returns the direct language value', () => {
      assert.equal(fetchLocalizedString({ eng: 'Hello' }, 'eng'), 'Hello');
    });

    it('returns the requested language when present', () => {
      const hash = { eng: 'Hello', fra: 'Bonjour' };
      assert.equal(fetchLocalizedString(hash, 'fra'), 'Bonjour');
    });

    it('falls back to eng when requested language missing', () => {
      assert.equal(fetchLocalizedString({ eng: 'Hello' }, 'deu'), 'Hello');
    });

    it('returns null when no match and no fallback', () => {
      assert.equal(fetchLocalizedString({ eng: 'Hello' }, 'deu', null), null);
    });

    it('returns null for null hash', () => {
      assert.equal(fetchLocalizedString(null, 'eng'), null);
    });

    it('returns null for empty hash', () => {
      assert.equal(fetchLocalizedString({}, 'eng'), null);
    });

    it('supports custom fallback language', () => {
      const hash = { fra: 'Bonjour' };
      assert.equal(fetchLocalizedString(hash, 'deu', 'fra'), 'Bonjour');
    });
  });

  describe('localizedStringIsEmpty', () => {
    it('null is empty', () => {
      assert.equal(localizedStringIsEmpty(null), true);
    });

    it('empty object is empty', () => {
      assert.equal(localizedStringIsEmpty({}), true);
    });

    it('populated hash is not empty', () => {
      assert.equal(localizedStringIsEmpty({ eng: 'x' }), false);
    });
  });

  describe('localizedStringIsPresent', () => {
    it('is the inverse of isEmpty', () => {
      assert.equal(localizedStringIsPresent(null), false);
      assert.equal(localizedStringIsPresent({}), false);
      assert.equal(localizedStringIsPresent({ eng: 'x' }), true);
    });
  });
});
