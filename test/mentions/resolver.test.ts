import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveMention,
  resolveAll,
} from '../../src/mentions/resolver.js';
import type { Mention } from '../../src/mentions/parser.js';

function mkMention(kind: string, targetType: string, fields: Record<string, string>): Mention {
  return {
    kind: kind as Mention['kind'],
    target: { type: targetType as Mention['target']['type'], ...fields } as Mention['target'],
    label: null,
    raw: '{{test}}',
    start: 0,
    end: 0,
  };
}

describe('resolveMention', () => {
  it('resolves concept via dataset_qualified', () => {
    const concept = { id: 'c1' };
    const m = mkMention('concept', 'dataset_qualified', { dataset: 'DS', id: 'c1' });
    const result = resolveMention(m, {
      resolveConcept: (ref) => 'dataset' in ref && ref.dataset === 'DS' && 'id' in ref && ref.id === 'c1' ? concept : null,
    });
    assert.equal(result.status, 'resolved');
    assert.equal(result.concept, concept);
  });

  it('returns unresolved when concept not found', () => {
    const m = mkMention('concept', 'dataset_qualified', { dataset: 'DS', id: 'missing' });
    const result = resolveMention(m, {
      resolveConcept: () => null,
    });
    assert.equal(result.status, 'unresolved');
  });

  it('resolves link as external (always)', () => {
    const m = mkMention('link', 'url', { url: 'https://example.com' });
    const result = resolveMention(m, {});
    assert.equal(result.status, 'external');
    assert.equal(result.url, 'https://example.com');
  });

  it('resolves image URL as external_image', () => {
    const m = mkMention('image', 'url', { url: 'https://example.com/img.png' });
    const result = resolveMention(m, {});
    assert.equal(result.status, 'external_image');
  });

  it('resolves image path as local_image', () => {
    const m = mkMention('image', 'path', { path: 'figures/wave.svg' });
    const result = resolveMention(m, {});
    assert.equal(result.status, 'local_image');
  });

  it('resolves bib via resolveBibEntry', () => {
    const entry = { id: 'ref1' };
    const m = mkMention('bib', 'entity_id', { id: 'ref1' });
    const result = resolveMention(m, {
      resolveBibEntry: (id) => id === 'ref1' ? entry : null,
    });
    assert.equal(result.status, 'resolved');
    assert.equal(result.entry, entry);
  });

  it('resolves fig via resolveEntity', () => {
    const entity = { id: 'fig1' };
    const m = mkMention('fig', 'entity_id', { id: 'fig1' });
    const result = resolveMention(m, {
      resolveEntity: (_kind, id) => id === 'fig1' ? entity : null,
    });
    assert.equal(result.status, 'resolved');
    assert.equal(result.entity, entity);
  });

  it('resolves concept URN', () => {
    const concept = { id: 'urn-c' };
    const m = mkMention('concept', 'urn', { urn: 'urn:iso:std:iso:704' });
    const result = resolveMention(m, {
      resolveConcept: (ref) => 'urn' in ref && ref.urn === 'urn:iso:std:iso:704' ? concept : null,
    });
    assert.equal(result.status, 'resolved');
    assert.equal(result.concept, concept);
  });
});

describe('resolveAll', () => {
  it('resolves a list of mentions', () => {
    const mentions: Mention[] = [
      mkMention('link', 'url', { url: 'https://x.com' }),
      mkMention('bib', 'entity_id', { id: 'r1' }),
    ];
    const results = resolveAll(mentions, {
      resolveBibEntry: () => ({ id: 'r1' }),
    });
    assert.equal(results.length, 2);
    assert.equal(results[0]!.status, 'external');
    assert.equal(results[1]!.status, 'resolved');
  });
});
