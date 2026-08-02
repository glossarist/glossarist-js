import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMention, extractMentionsFromText } from '../src/reference-mention.js';

describe('parseMention — new kinds (P1)', () => {
  describe('link: form', () => {
    it('parses {{link:URL}} without label', () => {
      assert.deepEqual(parseMention('link:https://example.com/page'), {
        kind: 'link-ref',
        uri: 'https://example.com/page',
        label: null,
        raw: 'link:https://example.com/page',
      });
    });
    it('parses {{link:URL, label}}', () => {
      assert.deepEqual(parseMention('link:https://example.com, click here'), {
        kind: 'link-ref',
        uri: 'https://example.com',
        label: 'click here',
        raw: 'link:https://example.com, click here',
      });
    });
    it('handles quoted label', () => {
      const r = parseMention('link:https://example.com, "my link"');
      assert.equal(r.kind, 'link-ref');
      assert.equal(r.uri, 'https://example.com');
      assert.equal(r.label, 'my link');
    });
  });

  describe('image: form', () => {
    it('parses {{image:src}} without alt', () => {
      assert.deepEqual(parseMention('image:diagram.png'), {
        kind: 'image-ref',
        src: 'diagram.png',
        alt: null,
        raw: 'image:diagram.png',
      });
    });
    it('parses {{image:src, alt text}}', () => {
      assert.deepEqual(parseMention('image:diagram.png, The diagram'), {
        kind: 'image-ref',
        src: 'diagram.png',
        alt: 'The diagram',
        raw: 'image:diagram.png, The diagram',
      });
    });
    it('uses alt field (not label) for the second part', () => {
      const r = parseMention('image:foo.png, alt text');
      assert.equal(r.kind, 'image-ref');
      assert.equal(r.alt, 'alt text');
      assert.equal(r.label, undefined);
    });
  });

  describe('bib: form', () => {
    it('parses {{bib:id}} without label', () => {
      assert.deepEqual(parseMention('bib:ref_1'), {
        kind: 'bib-ref',
        id: 'ref_1',
        label: null,
        raw: 'bib:ref_1',
      });
    });
    it('parses {{bib:id, label}}', () => {
      assert.deepEqual(parseMention('bib:ref_1, ISO 704'), {
        kind: 'bib-ref',
        id: 'ref_1',
        label: 'ISO 704',
        raw: 'bib:ref_1, ISO 704',
      });
    });
    it('uses id field (not key) for the identifier', () => {
      const r = parseMention('bib:my_ref');
      assert.equal(r.kind, 'bib-ref');
      assert.equal(r.id, 'my_ref');
      assert.equal(r.key, undefined);
    });
  });
});

describe('extractMentionsFromText — {{...}} canonical (P2)', () => {
  it('extracts a single {{cite:foo}} mention', () => {
    const results = [...extractMentionsFromText('See {{cite:foo}} for details.')];
    assert.equal(results.length, 1);
    assert.equal(results[0]!.result.kind, 'cite-ref');
    assert.equal(results[0]!.result.key, 'foo');
    assert.equal(results[0]!.fullMatch, '{{cite:foo}}');
    assert.equal(results[0]!.start, 4);
    assert.equal(results[0]!.end, 16);
  });

  it('extracts multiple mentions', () => {
    const results = [...extractMentionsFromText('{{cite:a}} and {{link:https://x.com}}')];
    assert.equal(results.length, 2);
    assert.equal(results[0]!.result.kind, 'cite-ref');
    assert.equal(results[1]!.result.kind, 'link-ref');
  });

  it('extracts link and image mentions', () => {
    const results = [...extractMentionsFromText('{{link:https://x.com}} {{image:foo.png}}')];
    assert.equal(results.length, 2);
    assert.equal(results[0]!.result.kind, 'link-ref');
    assert.equal(results[1]!.result.kind, 'image-ref');
  });
});

describe('extractMentionsFromText — <<...>> deprecation (P2)', () => {
  it('extracts <<target, caption>> and fires onDeprecated', () => {
    const warnings: Array<{ message: string; source: string }> = [];
    const results = [...extractMentionsFromText('See <<foo, bar>>.', {
      onDeprecated: (message, source) => warnings.push({ message, source }),
    })];
    assert.equal(results.length, 1);
    assert.equal(results[0]!.fullMatch, '<<foo, bar>>');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!.message, /Deprecated syntax/);
    assert.equal(warnings[0]!.source, '<<foo, bar>>');
  });

  it('re-parses <<target>> as cite-ref by default', () => {
    const results = [...extractMentionsFromText('<<iso-9000>>')];
    assert.equal(results.length, 1);
    assert.equal(results[0]!.result.kind, 'cite-ref');
    assert.equal(results[0]!.result.key, 'iso-9000');
  });

  it('re-parses <<fig:target>> as fig-ref', () => {
    const results = [...extractMentionsFromText('See <<fig:diagram1>>.')];
    assert.equal(results.length, 1);
    assert.equal(results[0]!.result.kind, 'fig-ref');
    assert.equal(results[0]!.result.key, 'diagram1');
  });

  it('re-parses <<table:target>> as table-ref', () => {
    const results = [...extractMentionsFromText('See <<table:t1, caption>>.')];
    assert.equal(results.length, 1);
    assert.equal(results[0]!.result.kind, 'table-ref');
    assert.equal(results[0]!.result.key, 't1');
    assert.equal(results[0]!.result.label, 'caption');
  });

  it('does not fire onDeprecated for {{...}} syntax', () => {
    const warnings: string[] = [];
    const results = [...extractMentionsFromText('{{cite:foo}}', {
      onDeprecated: (msg) => warnings.push(msg),
    })];
    void results;
    assert.equal(warnings.length, 0);
  });

  it('handles mixed {{...}} and <<...>> in the same text', () => {
    const warnings: string[] = [];
    const results = [...extractMentionsFromText('{{cite:a}} <<b>>', {
      onDeprecated: (msg) => warnings.push(msg),
    })];
    assert.equal(results.length, 2);
    assert.equal(results[0]!.result.kind, 'cite-ref');
    assert.equal(results[1]!.result.kind, 'cite-ref');
    assert.equal(warnings.length, 1);
  });
});
