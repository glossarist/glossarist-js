import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssetIndex } from '../../src/validators/asset-index.js';

describe('AssetIndex', () => {
  it('registers and checks paths', () => {
    const idx = new AssetIndex();
    idx.register('images/foo.svg');
    idx.register('/images/bar.png');
    assert.equal(idx.has('images/foo.svg'), true);
    assert.equal(idx.has('images/bar.png'), true);
    assert.equal(idx.has('images/missing.svg'), false);
  });

  it('normalizes leading slash', () => {
    const idx = new AssetIndex();
    idx.register('/images/x.png');
    assert.equal(idx.has('images/x.png'), true);
    assert.equal(idx.has('/images/x.png'), true);
  });

  it('paths returns sorted array', () => {
    const idx = new AssetIndex();
    idx.register('images/b.png');
    idx.register('images/a.png');
    assert.deepEqual(idx.paths, ['images/a.png', 'images/b.png']);
  });

  it('size tracks count', () => {
    const idx = new AssetIndex();
    assert.equal(idx.size, 0);
    idx.register('images/x.png');
    idx.register('images/y.png');
    assert.equal(idx.size, 2);
  });

  it('is iterable', () => {
    const idx = new AssetIndex();
    idx.register('images/a.png');
    idx.register('images/b.png');
    const paths = [...idx];
    assert.equal(paths.length, 2);
  });

  it('ignores null/undefined paths', () => {
    const idx = new AssetIndex();
    idx.register(null);
    idx.register(undefined);
    assert.equal(idx.size, 0);
    assert.equal(idx.has(null), false);
    assert.equal(idx.has(undefined), false);
  });

  it('deduplicates identical paths', () => {
    const idx = new AssetIndex();
    idx.register('images/x.png');
    idx.register('images/x.png');
    idx.register('/images/x.png');
    assert.equal(idx.size, 1);
  });
});
