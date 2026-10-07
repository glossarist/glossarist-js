import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidInputError } from '../../src/errors.js';
import { BibliographyEntry } from '../../src/models/bibliography-entry.js';
import { BibliographyData } from '../../src/models/bibliography-data.js';

describe('BibliographyEntry', () => {
  it('stores all typed fields', () => {
    const e = new BibliographyEntry({
      id: 'ref_1', reference: 'ISO 704', title: 'Terminology',
      link: 'https://example.com', type: 'standard',
    });
    assert.equal(e.id, 'ref_1');
    assert.equal(e.reference, 'ISO 704');
    assert.equal(e.title, 'Terminology');
    assert.equal(e.link, 'https://example.com');
    assert.equal(e.type, 'standard');
  });

  it('defaults to null', () => {
    const e = new BibliographyEntry();
    assert.equal(e.id, null);
    assert.equal(e.reference, null);
    assert.equal(e.title, null);
    assert.equal(e.link, null);
    assert.equal(e.type, null);
  });

  it('round-trips through toJSON/fromJSON', () => {
    const e = new BibliographyEntry({ id: 'ref_1', reference: 'ISO 704' });
    const restored = BibliographyEntry.fromJSON(e.toJSON());
    assert.equal(restored.id, 'ref_1');
    assert.equal(restored.reference, 'ISO 704');
  });

  it('omits null fields from toJSON', () => {
    const e = new BibliographyEntry({ id: 'x' });
    assert.deepEqual(e.toJSON(), { id: 'x' });
  });
});

describe('BibliographyData', () => {
  it('parses V3 YAML format', () => {
    const yamlStr = `
bibliography:
- id: ref_1
  reference: ISO 704
- id: ref_2
  reference: IEC 60050
`;
    const bib = BibliographyData.fromYAML(yamlStr);
    assert.equal(bib.entries.length, 2);
    assert.ok(bib.entries[0] instanceof BibliographyEntry);
    assert.equal(bib.entries[0].id, 'ref_1');
    assert.equal(bib.entries[0].reference, 'ISO 704');
  });

  it('find by id', () => {
    const bib = new BibliographyData({
      bibliography: [{ id: 'ref_1' }, { id: 'ref_2' }],
    });
    assert.equal(bib.find('ref_1').id, 'ref_1');
    assert.equal(bib.find('missing'), null);
  });

  it('keys returns entry ids', () => {
    const bib = new BibliographyData({
      bibliography: [{ id: 'a' }, { id: 'b' }],
    });
    assert.deepEqual(bib.keys, ['a', 'b']);
  });

  it('toJSON produces wrapper key', () => {
    const bib = new BibliographyData({
      bibliography: [{ id: 'x', reference: 'ISO' }],
    });
    assert.deepEqual(bib.toJSON(), {
      bibliography: [{ id: 'x', reference: 'ISO' }],
    });
  });

  it('empty bibliography produces empty array under wrapper key', () => {
    const bib = new BibliographyData({});
    assert.deepEqual(bib.toJSON(), { bibliography: [] });
  });

  it('round-trips through YAML', () => {
    const yamlStr = 'bibliography:\n- id: ref_1\n  reference: ISO 704\n';
    const bib = BibliographyData.fromYAML(yamlStr);
    const roundTripped = BibliographyData.fromYAML(bib.toYAML());
    assert.equal(roundTripped.entries[0].id, 'ref_1');
    assert.equal(roundTripped.entries[0].reference, 'ISO 704');
  });

  it('entries are lazily wrapped', () => {
    const bib = new BibliographyData({
      bibliography: [{ id: 'x' }],
    });
    assert.ok(bib.entries[0] instanceof BibliographyEntry);
    assert.strictEqual(bib.entries, bib.entries);
  });

  it('accepts entries key as alternative to bibliography', () => {
    const bib = new BibliographyData({
      entries: [{ id: 'x', reference: 'ISO' }],
    });
    assert.equal(bib.entries[0].id, 'x');
  });

  it('accepts a bare array of entries', () => {
    const bib = new BibliographyData([{ id: 'a' }, { id: 'b' }]);
    assert.equal(bib.entries.length, 2);
    assert.equal(bib.entries[0].id, 'a');
    assert.equal(bib.entries[1].id, 'b');
  });

  it('treats null/undefined as empty', () => {
    assert.equal(new BibliographyData(null).entries.length, 0);
    assert.equal(new BibliographyData(undefined).entries.length, 0);
  });
});

describe('BibliographyData.fromRelaton', () => {
  const isoRecord = [
    'id: ISO704',
    'type: standard',
    'title:',
    '- content: Terminology work — Principles and methods',
    '  type: main',
    'docidentifier:',
    '- content: ISO 704:2022',
    '  type: ISO',
    '  primary: true',
    'source:',
    '- content: https://www.iso.org/standard/704',
    '  type: src',
  ].join('\n');

  it('imports a single Relaton record', async () => {
    const data = await BibliographyData.fromRelaton(isoRecord);
    assert.equal(data.entries.length, 1);
    const entry = data.entries[0]!;
    assert.equal(entry.id, 'ISO 704:2022');
    assert.equal(entry.reference, 'ISO 704:2022');
    assert.equal(entry.title, 'Terminology work — Principles and methods');
    assert.equal(entry.link, 'https://www.iso.org/standard/704');
    assert.equal(entry.type, 'standard');
  });

  it('imports multi-document Relaton YAML', async () => {
    const twoDocs = `---\n${isoRecord}\n---\nid: ISO1087-1\ntype: standard\ndocidentifier:\n- content: ISO 1087-1:2019\n  type: ISO\n  primary: true\n`;
    const data = await BibliographyData.fromRelaton(twoDocs);
    assert.equal(data.entries.length, 2);
    assert.equal(data.entries[1]!.id, 'ISO 1087-1:2019');
    assert.equal(data.entries[1]!.title, null);
  });

  it('round-trips imported entries through toYAML/fromYAML', async () => {
    const data = await BibliographyData.fromRelaton(isoRecord);
    const restored = BibliographyData.fromYAML(data.toYAML());
    assert.deepEqual(restored.entries[0]!.toJSON(), data.entries[0]!.toJSON());
  });

  it('throws InvalidInputError on an invalid record', async () => {
    await assert.rejects(
      () => BibliographyData.fromRelaton('type: not-a-real-type'),
      InvalidInputError,
    );
  });
});
