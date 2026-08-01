// Verifies that ConceptRef supports the text-only inline form used for
// external-concept members in per-file hyperedge YAML:
//
//   { text: "(precision condition of measurement)" }
//
// Per TODO 14 (external-concepts-ellipsis-rendering), concept-browser's
// adapter layer needs to load members that use this inline form. The
// model must accept it and round-trip the text.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptRef } from '../../src/models/concept-ref.js';
import { PartitiveMember } from '../../src/models/partitive-member.js';

describe('ConceptRef text-only inline form', () => {
  it('constructs from { text } alone', () => {
    const ref = new ConceptRef({ text: '(precision condition of measurement)' });
    assert.equal(ref.source, null);
    assert.equal(ref.id, null);
    assert.equal(ref.text, '(precision condition of measurement)');
  });

  it('toString returns the text when no source/id', () => {
    const ref = new ConceptRef({ text: '(external label)' });
    assert.equal(ref.toString(), '(external label)');
  });

  it('toString combines source/id with text in parens', () => {
    const ref = new ConceptRef({ source: 'ISO', id: '9000', text: 'quality' });
    assert.equal(ref.toString(), 'ISO 9000 (quality)');
  });

  it('round-trips through toJSON', () => {
    const ref = new ConceptRef({ text: '(external)' });
    const json = ref.toJSON();
    assert.deepEqual(json, { text: '(external)' });
    const restored = ConceptRef.fromJSON(json);
    assert.equal(restored.text, '(external)');
  });

  it('identity is stable regardless of text', () => {
    const a = new ConceptRef({ source: 'ISO', id: '9000', text: 'one' });
    const b = new ConceptRef({ source: 'ISO', id: '9000', text: 'two' });
    assert.equal(a.identity(), b.identity());
  });
});

describe('PartitiveMember accepts text-only ref', () => {
  it('builds a member whose ref carries only text', () => {
    const member = new PartitiveMember({
      ref: new ConceptRef({ text: '(external concept)' }),
    });
    assert.equal(member.ref.text, '(external concept)');
    assert.equal(member.ref.source, null);
    assert.equal(member.ref.id, null);
  });

  it('member identity includes the text-only ref', () => {
    const member = new PartitiveMember({
      ref: { text: '(external)' },
    });
    const json = member.toJSON();
    assert.ok(json.ref);
    assert.equal((json.ref as { text?: string }).text, '(external)');
  });
});
