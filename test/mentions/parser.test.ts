import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMentions, parseMentionStrict, InvalidMentionError } from '../../src/mentions/parser.js';

describe('parseMentionStrict — valid mentions', () => {
  it('parses concept:DATASET:ID', () => {
    const m = parseMentionStrict('concept:IEV:702-02-07');
    assert.equal(m.kind, 'concept');
    assert.equal(m.target.type, 'dataset_qualified');
    assert.equal(m.target.dataset, 'IEV');
    assert.equal(m.target.id, '702-02-07');
  });

  it('parses concept:URN', () => {
    const m = parseMentionStrict('concept:urn:iec:std:iec:60050:702-02-07');
    assert.equal(m.kind, 'concept');
    assert.equal(m.target.type, 'urn');
  });

  it('parses cite:DATASET:ID with label', () => {
    const m = parseMentionStrict('cite:IEV:702-02-07, IEV 702-02-07');
    assert.equal(m.kind, 'cite');
    assert.equal(m.target.dataset, 'IEV');
    assert.equal(m.target.id, '702-02-07');
    assert.equal(m.label, 'IEV 702-02-07');
  });

  it('parses fig:plain_id', () => {
    const m = parseMentionStrict('fig:diagram_3, Figure 3');
    assert.equal(m.kind, 'fig');
    assert.equal(m.target.type, 'entity_id');
    assert.equal(m.target.id, 'diagram_3');
  });

  it('parses bib:plain_id', () => {
    const m = parseMentionStrict('bib:ref_1, ISO 704:2022');
    assert.equal(m.kind, 'bib');
    assert.equal(m.target.type, 'entity_id');
  });

  it('parses link:URL', () => {
    const m = parseMentionStrict('link:https://example.com, Example');
    assert.equal(m.kind, 'link');
    assert.equal(m.target.type, 'url');
  });

  it('parses image:path', () => {
    const m = parseMentionStrict('image:figures/wave.svg, Sine wave');
    assert.equal(m.kind, 'image');
    assert.equal(m.target.type, 'path');
  });

  it('parses DATASET:ID with internal colons (last colon splits)', () => {
    const m = parseMentionStrict('cite:ISO:10241-1:2011');
    assert.equal(m.target.dataset, 'ISO:10241-1');
    assert.equal(m.target.id, '2011');
  });

  it('accepts bare numeric ID as implicit concept (same-dataset)', () => {
    const m = parseMentionStrict('17-12, achromatic stimulus');
    assert.equal(m.kind, 'concept');
    assert.equal(m.target.type, 'entity_id');
    assert.equal(m.target.id, '17-12');
    assert.equal(m.label, 'achromatic stimulus');
  });

  it('accepts designation text as implicit concept (same-dataset)', () => {
    const m = parseMentionStrict('measurement unit');
    assert.equal(m.kind, 'concept');
    assert.equal(m.target.type, 'entity_id');
    assert.equal(m.target.id, 'measurement unit');
  });

  it('accepts concept:bare_id as same-dataset reference', () => {
    const m = parseMentionStrict('concept:112-01-10');
    assert.equal(m.kind, 'concept');
    assert.equal(m.target.type, 'entity_id');
  });
});

describe('parseMentionStrict — invalid mentions throw errors', () => {
  it('rejects cite:bare_id (must be DATASET:ID)', () => {
    assert.throws(
      () => parseMentionStrict('cite:sourceId1'),
      (e: Error) => e instanceof InvalidMentionError && e.message.includes('cite target must be'),
    );
  });

  it('rejects bib:URN (bib accepts plain ID only)', () => {
    assert.throws(
      () => parseMentionStrict('bib:urn:iso:std:iso:704'),
      (e: Error) => e instanceof InvalidMentionError && e.message.includes('bib target must be'),
    );
  });

  it('rejects bib:DATASET:ID', () => {
    assert.throws(
      () => parseMentionStrict('bib:IEV:702-02-07'),
      (e: Error) => e instanceof InvalidMentionError && e.message.includes('bib target must be'),
    );
  });

  it('rejects link:bare_text (must be URL)', () => {
    assert.throws(
      () => parseMentionStrict('link:/internal/page'),
      (e: Error) => e instanceof InvalidMentionError && e.message.includes('link target must be'),
    );
  });
});

describe('parseMentions — text segmentation', () => {
  it('splits text and mentions into segments', () => {
    const segments = parseMentions('A {{concept:IEV:702-02-07}} reference.');
    assert.equal(segments.length, 3);
    assert.equal(segments[0].kind, 'text');
    assert.equal(segments[1].kind, 'concept');
    assert.equal(segments[2].kind, 'text');
  });

  it('throws on first invalid mention in text', () => {
    assert.throws(
      () => parseMentions('See {{link:/not-a-url}} for details.'),
      InvalidMentionError,
    );
  });
});
