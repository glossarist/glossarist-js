import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { uuidV5, conceptUuid, localizedConceptUuid } from '../src/uuid.js';

describe('uuidV5', () => {
  it('produces deterministic UUIDs', () => {
    const ns = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const a = uuidV5(ns, '3.1.1.1');
    const b = uuidV5(ns, '3.1.1.1');
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces different UUIDs for different inputs', () => {
    const ns = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    assert.notEqual(uuidV5(ns, 'a'), uuidV5(ns, 'b'));
  });
});

describe('conceptUuid', () => {
  it('returns deterministic UUID for a concept ID', () => {
    const a = conceptUuid('3.1.1.1');
    const b = conceptUuid('3.1.1.1');
    assert.equal(a, b);
    assert.match(a, /^[-0-9a-f]{36}$/);
  });
});

describe('localizedConceptUuid', () => {
  it('returns different UUID than conceptUuid', () => {
    const conceptId = conceptUuid('3.1.1.1');
    const lcId = localizedConceptUuid('3.1.1.1', 'eng');
    assert.notEqual(conceptId, lcId);
  });

  it('is deterministic', () => {
    const a = localizedConceptUuid('3.1.1.1', 'eng');
    const b = localizedConceptUuid('3.1.1.1', 'eng');
    assert.equal(a, b);
  });
});
