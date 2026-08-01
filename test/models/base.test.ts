import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GlossaristModel } from '../../src/models/base.js';
import { Citation } from '../../src/models/citation.js';

describe('GlossaristModel', () => {
  it('throws on toJSON if not overridden', () => {
    const m = new GlossaristModel();
    assert.throws(() => m.toJSON(), /must implement toJSON/);
  });

  it('throws on fromJSON if not overridden', () => {
    assert.throws(() => GlossaristModel.fromJSON({}), /must implement fromJSON/);
  });

  it('equals returns false for different types', () => {
    const a = new Citation({ source: 'test' });
    assert.ok(!a.equals(new GlossaristModel()));
  });

  it('equals returns false for non-instance', () => {
    const a = new Citation({ source: 'test' });
    assert.ok(!a.equals(null));
    assert.ok(!a.equals({ source: 'test' }));
  });

  it('clone produces an equal model', () => {
    const a = new Citation({ source: 'ISO 9000', clause: '3.1.1' });
    const b = a.clone();
    assert.ok(a.equals(b));
    assert.ok(!(a === b));
  });

  it('round-trip invariant: fromJSON(toJSON()) equals original', () => {
    const a = new Citation({ source: 'ISO 9000', id: 'iso-9000', version: '2015' });
    const b = Citation.fromJSON(a.toJSON());
    assert.ok(a.equals(b));
  });
});
