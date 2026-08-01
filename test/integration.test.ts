import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { loadGcr } from '../src/gcr-reader.js';

// These tests use real GCR packages from /tmp if available
const ISOTC204 = '/tmp/isotc204-release.gcr';
const IEV = '/tmp/iev-release.gcr';

describe('Real GCR: isotc204 (managed concept format)', { skip: !fs.existsSync(ISOTC204) }, () => {
  let pkg;

  it('loads the package', async () => {
    pkg = await loadGcr(fs.readFileSync(ISOTC204));
    assert.ok(pkg);
  });

  it('reads metadata', async () => {
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'isotc204');
    assert.equal(meta.concept_count, 312);
    assert.ok(meta.languages.includes('eng'));
  });

  it('lists concept IDs', async () => {
    const ids = await pkg.conceptIds();
    assert.equal(ids.length, 312);
    assert.ok(ids.includes('3.1.1.1'));
  });

  it('reads a specific concept', async () => {
    const c = await pkg.concept('3.1.1.1');
    assert.equal(c.termid, '3.1.1.1');
    assert.ok(c.localization('eng'));
    assert.equal(c.localization('eng').terms[0].designation, 'entity');
    assert.ok(c.localization('eng').definition[0].content);
  });
});

describe('Real GCR: IEV (canonical format)', { skip: !fs.existsSync(IEV) }, () => {
  let pkg;

  it('loads the package', async () => {
    pkg = await loadGcr(fs.readFileSync(IEV));
    assert.ok(pkg);
  });

  it('reads metadata', async () => {
    const meta = await pkg.metadata();
    assert.ok(meta.title);
    assert.ok(meta.title.includes('IEV'));
  });

  it('lists concept IDs', async () => {
    const ids = await pkg.conceptIds();
    assert.ok(ids.length > 20000);
    assert.ok(ids.includes('551-12-39'));
  });

  it('reads a multi-lang concept', async () => {
    const c = await pkg.concept('551-12-39');
    assert.equal(c.termid, '551-12-39');
    assert.ok(c.localization('eng'));
    assert.ok(c.localization('fra'));
    assert.equal(c.localization('eng').terms[0].designation, 'double converter');
    assert.equal(c.localization('fra').terms[0].designation, 'convertisseur double');
  });
});
