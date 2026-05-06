import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGcr } from '../src/gcr-reader.js';
import { createGcr } from '../src/gcr-writer.js';

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
});
