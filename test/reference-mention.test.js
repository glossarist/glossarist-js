import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMention } from '../src/reference-mention.js';

describe('parseMention', () => {
  describe('cite: form — cite:key[,display]', () => {
    it('parses {{cite:source-id}}', () => {
      assert.deepEqual(parseMention('cite:source-id'), {
        kind: 'cite-ref',
        key: 'source-id',
        label: null,
        raw: 'cite:source-id',
      });
    });

    it('parses {{cite:source-id,display text}} — key first, display last', () => {
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

  describe('numeric form — id[,display]', () => {
    it('parses bare dot-separated numeric id', () => {
      assert.deepEqual(parseMention('3.1.1.1'), {
        kind: 'numeric',
        id: '3.1.1.1',
        label: null,
        raw: '3.1.1.1',
      });
    });

    it('parses bare dash-separated numeric id (IEV style)', () => {
      assert.deepEqual(parseMention('103-01-02'), {
        kind: 'numeric',
        id: '103-01-02',
        label: null,
        raw: '103-01-02',
      });
    });

    it('parses {{0.10, measuring instrument}} — id first, display last', () => {
      assert.deepEqual(parseMention('0.10, measuring instrument'), {
        kind: 'numeric',
        id: '0.10',
        label: 'measuring instrument',
        raw: '0.10, measuring instrument',
      });
    });

    it('parses {{0.03, indication}} — id first, display last', () => {
      assert.deepEqual(parseMention('0.03, indication'), {
        kind: 'numeric',
        id: '0.03',
        label: 'indication',
        raw: '0.03, indication',
      });
    });

    it('parses numeric id with quoted display text', () => {
      assert.deepEqual(parseMention('3.1.1.1,"entity, with comma"'), {
        kind: 'numeric',
        id: '3.1.1.1',
        label: 'entity, with comma',
        raw: '3.1.1.1,"entity, with comma"',
      });
    });

    it('rejects a single bare number (no separator)', () => {
      assert.equal(parseMention('103').kind, 'unresolved');
    });

    it('rejects trailing punctuation', () => {
      assert.equal(parseMention('3.1.1.1.').kind, 'unresolved');
    });
  });

  describe('designation form — designation[,display]', () => {
    it('parses {{entity data type value, single entity data type value}} — designation first, display last', () => {
      assert.deepEqual(parseMention('entity data type value, single entity data type value'), {
        kind: 'designation',
        id: 'entity data type value',
        label: 'single entity data type value',
        raw: 'entity data type value, single entity data type value',
      });
    });

    it('parses designation with display text', () => {
      assert.deepEqual(parseMention('foo, bar'), {
        kind: 'designation',
        id: 'foo',
        label: 'bar',
        raw: 'foo, bar',
      });
    });

    it('handles quoted display text in designation form', () => {
      assert.deepEqual(parseMention('foo,"bar, with comma"'), {
        kind: 'designation',
        id: 'foo',
        label: 'bar, with comma',
        raw: 'foo,"bar, with comma"',
      });
    });
  });

  describe('unresolved form', () => {
    it('returns unresolved for arbitrary text without comma', () => {
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
      assert.equal(parseMention('urn:iso:std:iso:14812:3.1.1.1').kind, 'unresolved');
    });
  });
});
