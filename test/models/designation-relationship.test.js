import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DesignationRelationship,
  DESIGNATION_RELATIONSHIP_TYPES,
} from '../../src/models/designation-relationship.js';

describe('DesignationRelationship', () => {
  it('constructs with defaults', () => {
    const dr = new DesignationRelationship();
    assert.equal(dr.type, null);
    assert.equal(dr.content, null);
    assert.equal(dr.target, null);
  });

  it('constructs with data', () => {
    const dr = new DesignationRelationship({
      type: 'abbreviated_form_for',
      content: 'LED',
      target: 'Light Emitting Diode',
    });
    assert.equal(dr.type, 'abbreviated_form_for');
    assert.equal(dr.content, 'LED');
    assert.equal(dr.target, 'Light Emitting Diode');
  });

  it('round-trips via toJSON/fromJSON', () => {
    const dr = new DesignationRelationship({
      type: 'short_form_for',
      target: 'National Aeronautics and Space Administration',
    });
    const json = dr.toJSON();
    assert.equal(json.type, 'short_form_for');
    assert.equal(json.target, 'National Aeronautics and Space Administration');
    assert.equal(json.content, undefined);

    const restored = DesignationRelationship.fromJSON(json);
    assert.ok(dr.equals(restored));
  });

  it('omits null fields from toJSON', () => {
    const dr = new DesignationRelationship({ type: 'abbreviated_form_for' });
    const json = dr.toJSON();
    assert.deepEqual(json, { type: 'abbreviated_form_for' });
  });

  it('equals and clone work via GlossaristModel', () => {
    const dr = new DesignationRelationship({ type: 'abbreviated_form_for', content: 'LED' });
    const clone = dr.clone();
    assert.ok(dr.equals(clone));
    assert.notEqual(dr, clone);
  });
});

describe('DESIGNATION_RELATIONSHIP_TYPES', () => {
  it('contains expected values', () => {
    assert.ok(DESIGNATION_RELATIONSHIP_TYPES.includes('abbreviated_form_for'));
    assert.ok(DESIGNATION_RELATIONSHIP_TYPES.includes('short_form_for'));
    assert.equal(DESIGNATION_RELATIONSHIP_TYPES.length, 2);
  });

  it('is frozen', () => {
    assert.throws(() => DESIGNATION_RELATIONSHIP_TYPES.push('x'));
  });
});
