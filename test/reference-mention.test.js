import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMention } from '../src/reference-mention.js';

describe('parseMention', () => {
  describe('cite: form', () => {
    it('parses {{cite:source-id}}', () => {
      assert.deepEqual(parseMention('cite:source-id'), {
        kind: 'cite-ref',
        key: 'source-id',
        label: null,
        raw: 'cite:source-id',
      });
    });

    it('parses {{cite:source-id,display text}}', () => {
      assert.deepEqual(parseMention('cite:source-id,display text'), {
        kind: 'cite-ref',
        key: 'source-id',
        label: 'display text',
        raw: 'cite:source-id,display text',
      });
    });

    it('parses {{cite:source-id,"label, with, comma"}}', () => {
      assert.deepEqual(parseMention('cite:source-id,"label, with, comma"'), {
        kind: 'cite-ref',
        key: 'source-id',
        label: 'label, with, comma',
        raw: 'cite:source-id,"label, with, comma"',
      });
    });

    it('treats embedded comma in the key as the label separator (strict)', () => {
      // The parser sees 'cite:foo,bar' as key='foo' label='bar'.
      // If a key with a literal comma is needed, the author
      // should use a different separator (or rename the key).
      assert.deepEqual(parseMention('cite:foo,bar'), {
        kind: 'cite-ref',
        key: 'foo',
        label: 'bar',
        raw: 'cite:foo,bar',
      });
    });

    it('handles empty label', () => {
      assert.deepEqual(parseMention('cite:foo,'), {
        kind: 'cite-ref',
        key: 'foo',
        label: '',
        raw: 'cite:foo,',
      });
    });

    it('trims whitespace around the body', () => {
      assert.deepEqual(parseMention('  cite:foo  '), {
        kind: 'cite-ref',
        key: 'foo',
        label: null,
        raw: 'cite:foo',
      });
    });
  });

  describe('numeric form', () => {
    it('parses a dot-separated numeric id', () => {
      assert.deepEqual(parseMention('3.1.1.1'), {
        kind: 'numeric',
        id: '3.1.1.1',
        raw: '3.1.1.1',
      });
    });

    it('parses a dash-separated numeric id (IEV style)', () => {
      assert.deepEqual(parseMention('103-01-02'), {
        kind: 'numeric',
        id: '103-01-02',
        raw: '103-01-02',
      });
    });

    it('rejects a single bare number (no separator)', () => {
      // '103' has no separator; not a multi-part concept id.
      assert.equal(parseMention('103').kind, 'unresolved');
    });

    it('rejects a bare number with trailing punctuation', () => {
      assert.equal(parseMention('3.1.1.1.').kind, 'unresolved');
    });
  });

  describe('unresolved form', () => {
    it('returns unresolved for arbitrary text', () => {
      assert.deepEqual(parseMention('hello world'), {
        kind: 'unresolved',
        raw: 'hello world',
      });
    });

    it('returns unresolved for an empty body', () => {
      assert.deepEqual(parseMention(''), {
        kind: 'unresolved',
        raw: '',
      });
    });

    it('returns unresolved for a URN (not yet supported at parse layer)', () => {
      // The v3 plan's URI form is aspirational; v8 only supports
      // cite:key and numeric. URN-form mentions are unresolved
      // at this layer.
      assert.equal(parseMention('urn:iso:std:iso:14812:3.1.1.1').kind, 'unresolved');
    });
  });
});
