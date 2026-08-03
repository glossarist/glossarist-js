import { describe, it, expect } from 'vitest';
import { RelatedConcept, ConceptRef } from '../../src/models/index.js';

describe('RelatedConcept.target — cross-dataset resolved concept URI', () => {
  it('accepts a target field in the constructor', () => {
    const rc = new RelatedConcept({
      type: 'superseded_by',
      target: 'https://example.com/cie-2020/concept/17-21-097',
    });
    expect(rc.target).toBe('https://example.com/cie-2020/concept/17-21-097');
  });

  it('defaults target to null when not provided', () => {
    const rc = new RelatedConcept({ type: 'see' });
    expect(rc.target).toBeNull();
  });

  it('round-trips target through toJSON/fromJSON', () => {
    const rc = new RelatedConcept({
      type: 'supersedes',
      target: 'https://example.com/dataset/concept/42',
      ref: new ConceptRef({ source: 'ISO', id: '704' }),
    });
    const json = rc.toJSON();
    expect(json.target).toBe('https://example.com/dataset/concept/42');

    const restored = RelatedConcept.fromJSON(json);
    expect(restored.target).toBe('https://example.com/dataset/concept/42');
  });

  it('omits target from toJSON when null (clean serialization)', () => {
    const rc = new RelatedConcept({ type: 'see' });
    const json = rc.toJSON();
    expect(json.target).toBeUndefined();
  });

  it('preserves target alongside ref (both can coexist)', () => {
    const rc = new RelatedConcept({
      type: 'superseded_by',
      target: 'https://example.com/cie-2020/concept/17-21-097',
      ref: { source: 'CIE S 017:2020', id: '17-21-097' },
    });
    expect(rc.target).toBe('https://example.com/cie-2020/concept/17-21-097');
    expect(rc.ref).toBeInstanceOf(ConceptRef);
    expect(rc.ref?.source).toBe('CIE S 017:2020');
    expect(rc.ref?.id).toBe('17-21-097');
  });
});
