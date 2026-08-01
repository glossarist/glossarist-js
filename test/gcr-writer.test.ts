import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGcr } from '../src/gcr-reader.js';
import { createGcr, GcrWriter } from '../src/gcr-writer.js';
import { GcrMetadata } from '../src/models/gcr-metadata.js';
import { Concept } from '../src/models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

describe('GcrWriter', () => {
  it('creates a GCR that can be re-read', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    const concepts = await pkg.allConcepts();
    const meta = await pkg.metadata();

    const newBuf = await createGcr(concepts, meta);
    assert.ok(newBuf instanceof Uint8Array);
    assert.ok(newBuf.length > 0);

    const pkg2 = await loadGcr(newBuf);
    const meta2 = await pkg2.metadata();
    assert.equal(meta2.shortname, 'test-canonical');

    const concepts2 = await pkg2.allConcepts();
    assert.equal(concepts2.length, 3);
    assert.equal(concepts2[0].primaryDesignation('eng'), 'first concept');
    assert.equal(concepts2[1].primaryDesignation('eng'), 'second concept');
  });

  it('writes managed format when specified', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'managed.gcr'));
    const pkg = await loadGcr(buf);
    const concepts = await pkg.allConcepts();

    const newBuf = await createGcr(concepts, { shortname: 'roundtrip', schema_version: '1' });
    const pkg2 = await loadGcr(newBuf);

    const ids = await pkg2.conceptIds();
    assert.deepEqual(ids, ['3.1.1.1', '3.1.1.2']);

    const c = await pkg2.concept('3.1.1.1');
    assert.equal(c.primaryDesignation('eng'), 'entity');
  });

  it('throws on invalid input', async () => {
    await assert.rejects(() => createGcr(null), /requires/);
  });

  it('accepts GcrMetadata instance and auto-fills statistics', async () => {
    const meta = new GcrMetadata({
      shortname: 'meta-model',
      version: '1.0',
    });
    const concepts = [
      new Concept({ id: '001', localizations: {
        eng: { terms: [{ type: 'expression', designation: 'a' }], definition: [{ content: 'def' }], entry_status: 'valid' },
      }}),
    ];

    const buf = await GcrWriter.createBuffer({ concepts, metadata: meta });
    const pkg = await loadGcr(buf);
    const readMeta = await pkg.metadata();
    assert.ok(readMeta instanceof GcrMetadata);
    assert.equal(readMeta.shortname, 'meta-model');
    assert.equal(readMeta.version, '1.0');
    assert.equal(readMeta.conceptCount, 1);
    assert.ok(readMeta.statistics);
    assert.equal(readMeta.statistics.totalConcepts, 1);
  });

  it('round-trips GcrMetadata with all fields through writer/reader', async () => {
    const meta = new GcrMetadata({
      shortname: 'full-rt',
      version: '2.0',
      title: 'Full Round-Trip',
      description: 'Test description',
      owner: 'ISO',
      tags: ['a', 'b'],
      languages: ['eng'],
      homepage: 'https://example.com',
      license: 'MIT',
      compiled_formats: ['tbx'],
    });

    const buf = await GcrWriter.createBuffer({ concepts: [], metadata: meta });
    const pkg = await loadGcr(buf);
    const read = await pkg.metadata();
    assert.equal(read.shortname, 'full-rt');
    assert.equal(read.description, 'Test description');
    assert.equal(read.owner, 'ISO');
    assert.deepEqual(read.tags, ['a', 'b']);
    assert.equal(read.homepage, 'https://example.com');
    assert.equal(read.license, 'MIT');
    assert.deepEqual(read.compiledFormats, ['tbx']);
  });
});
