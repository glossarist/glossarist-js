import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { ManagedConceptCollection } from '../src/managed-concept-collection.js';
import { conceptParser } from '../src/concept-parser.js';

const TMP = path.join(import.meta.dirname, 'tmp-mcc');

describe('ManagedConceptCollection', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('starts with empty concepts', () => {
    const mcc = new ManagedConceptCollection();
    assert.equal(mcc.concepts.length, 0);
    assert.equal(mcc.register, null);
  });

  it('add inserts a concept', () => {
    const mcc = new ManagedConceptCollection();
    const c = conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: alpha');
    mcc.add(c);
    assert.equal(mcc.concepts.length, 1);
    assert.equal(mcc.concepts.byId('001').id, '001');
  });

  it('add replaces existing concept by id', () => {
    const mcc = new ManagedConceptCollection();
    const c1 = conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: v1');
    const c2 = conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: v2');
    mcc.add(c1);
    mcc.add(c2);
    assert.equal(mcc.concepts.length, 1);
    assert.equal(mcc.concepts.byId('001').primaryDesignation('eng'), 'v2');
  });

  it('remove deletes a concept', () => {
    const mcc = new ManagedConceptCollection();
    mcc.add(conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: a'));
    mcc.add(conceptParser.parse('termid: "002"\neng:\n  terms:\n    - designation: b'));
    mcc.remove('001');
    assert.equal(mcc.concepts.length, 1);
    assert.equal(mcc.concepts.byId('001'), undefined);
  });

  it('setRegister stores register data', () => {
    const mcc = new ManagedConceptCollection();
    mcc.setRegister({ schema_version: '1', shortname: 'test' });
    assert.equal(mcc.register.shortname, 'test');
  });

  it('loadFromDirectory and saveToDirectory round-trip', () => {
    const dir = path.join(TMP, 'concepts');
    fs.mkdirSync(dir, { recursive: true });

    const c1 = conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: alpha');
    const c2 = conceptParser.parse('termid: "002"\neng:\n  terms:\n    - designation: beta');

    const mcc = new ManagedConceptCollection();
    mcc.add(c1);
    mcc.add(c2);
    mcc.setRegister({ schema_version: '1', shortname: 'round-trip' });
    mcc.saveToDirectory(dir);

    const mcc2 = new ManagedConceptCollection();
    mcc2.loadFromDirectory(dir);
    assert.equal(mcc2.concepts.length, 2);
    assert.equal(mcc2.concepts.byId('001').primaryDesignation('eng'), 'alpha');
    assert.equal(mcc2.concepts.byId('002').primaryDesignation('eng'), 'beta');
    assert.equal(mcc2.register.shortname, 'round-trip');
  });

  it('loadFromGcr reads GCR packages', async () => {
    const gcrPath = path.join(import.meta.dirname, 'fixtures', 'canonical.gcr');
    const mcc = new ManagedConceptCollection();
    await mcc.loadFromGcr(fs.readFileSync(gcrPath));
    assert.equal(mcc.concepts.length, 3);
    assert.ok(mcc.concepts.byId('001'));
  });

  it('saveToGcr produces a valid GCR buffer', async () => {
    const mcc = new ManagedConceptCollection();
    mcc.add(conceptParser.parse('termid: "100"\neng:\n  terms:\n    - designation: test'));
    const buf = await mcc.saveToGcr({ metadata: { shortname: 'test' } });

    assert.ok(buf instanceof Uint8Array);
    assert.ok(buf.length > 0);

    const { loadGcr } = await import('../src/gcr-reader.js');
    const pkg = await loadGcr(buf);
    const ids = await pkg.conceptIds();
    assert.ok(ids.includes('100'));
  });

  it('methods are chainable', () => {
    const mcc = new ManagedConceptCollection();
    const result = mcc
      .add(conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: a'))
      .setRegister({ schema_version: '1' })
      .remove('001');
    assert.ok(result instanceof ManagedConceptCollection);
  });

  it('setBibliography stores BibliographyData', () => {
    const mcc = new ManagedConceptCollection();
    const yaml = 'bibliography:\n  - id: ISO-9000\n    reference: ISO 9000\n    title: Quality management';
    mcc.setBibliography(yaml);
    assert.ok(mcc.bibliography);
    assert.equal(mcc.bibliography.find('ISO-9000').reference, 'ISO 9000');
  });

  it('setImages stores Map of image files', () => {
    const mcc = new ManagedConceptCollection();
    const images = new Map([['images/diagram.png', new Uint8Array([1, 2, 3])]]);
    mcc.setImages(images);
    assert.equal(mcc.images.get('images/diagram.png')[0], 1);
  });

  it('setImages converts plain object to Map', () => {
    const mcc = new ManagedConceptCollection();
    mcc.setImages({ 'logo.png': new Uint8Array([0]) });
    assert.ok(mcc.images instanceof Map);
    assert.ok(mcc.images.has('logo.png'));
  });
});
