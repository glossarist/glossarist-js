import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonVerbalReference } from '../../src/models/non-verbal-reference.js';
import {
  FigureReference,
  TableReference,
  FormulaReference,
} from '../../src/models/non-verbal-references.js';

describe('NonVerbalReference', () => {
  describe('fromJSON input shapes', () => {
    it('accepts bare string', () => {
      const r = NonVerbalReference.fromJSON('fig-1');
      assert.equal(r.entityId, 'fig-1');
      assert.equal(r.display, null);
    });

    it('accepts { ref: id }', () => {
      const r = NonVerbalReference.fromJSON({ ref: 'fig-1' });
      assert.equal(r.entityId, 'fig-1');
    });

    it('accepts { id: id }', () => {
      const r = NonVerbalReference.fromJSON({ id: 'fig-1' });
      assert.equal(r.entityId, 'fig-1');
    });

    it('accepts { entity_id: id }', () => {
      const r = NonVerbalReference.fromJSON({ entity_id: 'fig-1' });
      assert.equal(r.entityId, 'fig-1');
    });

    it('accepts { entityId: id }', () => {
      const r = NonVerbalReference.fromJSON({ entityId: 'fig-1' });
      assert.equal(r.entityId, 'fig-1');
    });

    it('accepts display override', () => {
      const r = NonVerbalReference.fromJSON({ ref: 'fig-1', display: 'Figure 1' });
      assert.equal(r.entityId, 'fig-1');
      assert.equal(r.display, 'Figure 1');
    });

    it('dispatches to typed subclass when type is set', () => {
      const r = NonVerbalReference.fromJSON({ type: 'figure', ref: 'fig-1' });
      assert.ok(r instanceof FigureReference);
    });
  });

  describe('toJSON output shapes', () => {
    it('produces bare string when no display', () => {
      const r = new NonVerbalReference({ entityId: 'fig-1' });
      assert.equal(r.toJSON(), 'fig-1');
    });

    it('produces object when display is set', () => {
      const r = new NonVerbalReference({ entityId: 'fig-1', display: 'Figure 1' });
      assert.deepEqual(r.toJSON(), { ref: 'fig-1', display: 'Figure 1' });
    });
  });

  describe('round-trip', () => {
    it('bare string round-trips', () => {
      const r = new NonVerbalReference({ entityId: 'x' });
      const restored = NonVerbalReference.fromJSON(r.toJSON());
      assert.equal(restored.entityId, 'x');
      assert.equal(restored.display, null);
    });

    it('object with display round-trips', () => {
      const r = new NonVerbalReference({ entityId: 'x', display: 'X' });
      const restored = NonVerbalReference.fromJSON(r.toJSON());
      assert.equal(restored.entityId, 'x');
      assert.equal(restored.display, 'X');
    });
  });

  describe('dedupKey', () => {
    it('includes class name to avoid cross-type collision', () => {
      const fig = new FigureReference({ entityId: 'shared' });
      const tbl = new TableReference({ entityId: 'shared' });
      assert.notDeepEqual(fig.dedupKey, tbl.dedupKey);
    });

    it('is stable for same type + entity id', () => {
      const a = new FigureReference({ entityId: 'fig-a' });
      const b = new FigureReference({ entityId: 'fig-a' });
      assert.deepEqual(a.dedupKey, b.dedupKey);
    });

    it('includes FormulaReference distinctly', () => {
      const f = new FormulaReference({ entityId: 'eq-1' });
      assert.equal(f.dedupKey[0], 'FormulaReference');
      assert.equal(f.dedupKey[1], 'eq-1');
    });
  });
});

describe('Typed NonVerbalReference subclasses', () => {
  it('FigureReference extends NonVerbalReference', () => {
    assert.ok(new FigureReference({ entityId: 'x' }) instanceof NonVerbalReference);
  });

  it('TableReference extends NonVerbalReference', () => {
    assert.ok(new TableReference({ entityId: 'x' }) instanceof NonVerbalReference);
  });

  it('FormulaReference extends NonVerbalReference', () => {
    assert.ok(new FormulaReference({ entityId: 'x' }) instanceof NonVerbalReference);
  });
});
