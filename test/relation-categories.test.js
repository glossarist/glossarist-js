// Tests for relation categories + color resolution (TODO 32).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RELATIONSHIP_TYPES,
  RELATION_CATEGORIES,
  categoryOf,
  categoryDefinition,
  uncategorizedTypes,
  duplicatedTypes,
  resolveRelationColor,
  categoryColorPair,
  RELATION_COLOR_DEFAULTS,
} from '../src/models/index.js';

describe('MECE coverage', () => {
  it('every RELATIONSHIP_TYPE has a category', () => {
    const uncategorized = uncategorizedTypes();
    assert.deepEqual(uncategorized, [], `uncategorized types: ${uncategorized.join(', ')}`);
  });

  it('no type appears in two categories', () => {
    const dups = duplicatedTypes();
    assert.deepEqual(dups, [], `duplicated types: ${JSON.stringify(dups)}`);
  });

  it('categoryOf returns null for an unknown type', () => {
    assert.equal(categoryOf('not_a_real_type'), null);
  });
});

describe('categoryOf', () => {
  it('maps lifecycle types to "lifecycle"', () => {
    assert.equal(categoryOf('supersedes'), 'lifecycle');
    assert.equal(categoryOf('superseded_by'), 'lifecycle');
    assert.equal(categoryOf('deprecates'), 'lifecycle');
  });

  it('maps SKOS hierarchical types to "hierarchical"', () => {
    assert.equal(categoryOf('broader'), 'hierarchical');
    assert.equal(categoryOf('narrower_generic'), 'hierarchical');
  });

  it('maps ISO 19135 concept-instance types to "conceptInstance"', () => {
    assert.equal(categoryOf('has_part'), 'conceptInstance');
    assert.equal(categoryOf('is_part_of'), 'conceptInstance');
  });

  it('maps SKOS mapping types to "mapping"', () => {
    assert.equal(categoryOf('equivalent'), 'mapping');
    assert.equal(categoryOf('close_match'), 'mapping');
  });
});

describe('categoryDefinition', () => {
  it('returns label/description/types for a known category', () => {
    const def = categoryDefinition('lifecycle');
    assert.ok(def.label);
    assert.ok(def.description);
    assert.ok(Array.isArray(def.types));
    assert.ok(def.types.includes('supersedes'));
  });

  it('returns null for an unknown category', () => {
    assert.equal(categoryDefinition('not_real'), null);
  });
});

describe('resolveRelationColor', () => {
  it('returns the category default when no override given', () => {
    assert.equal(
      resolveRelationColor('supersedes', { mode: 'light' }),
      RELATION_COLOR_DEFAULTS.byCategory.lifecycle.light,
    );
    assert.equal(
      resolveRelationColor('supersedes', { mode: 'dark' }),
      RELATION_COLOR_DEFAULTS.byCategory.lifecycle.dark,
    );
  });

  it('returns the per-type override when provided', () => {
    const overrides = {
      byType: { supersedes: { light: '#ff0000', dark: '#ff5d5d' } },
    };
    assert.equal(resolveRelationColor('supersedes', { overrides, mode: 'light' }), '#ff0000');
    assert.equal(resolveRelationColor('supersedes', { overrides, mode: 'dark' }), '#ff5d5d');
  });

  it('returns the per-category override when no per-type override', () => {
    const overrides = {
      byCategory: { lifecycle: { light: '#aaaaaa', dark: '#bbbbbb' } },
    };
    assert.equal(resolveRelationColor('deprecates', { overrides, mode: 'dark' }), '#bbbbbb');
  });

  it('per-type override wins over per-category override', () => {
    const overrides = {
      byType: { supersedes: { light: '#111', dark: '#222' } },
      byCategory: { lifecycle: { light: '#aaa', dark: '#bbb' } },
    };
    assert.equal(resolveRelationColor('supersedes', { overrides, mode: 'light' }), '#111');
  });

  it('returns null for an unknown type', () => {
    assert.equal(resolveRelationColor('not_a_real_type'), null);
  });

  it('falls back to string shape when override is a single hex', () => {
    const overrides = { byType: { supersedes: '#abc' } };
    assert.equal(resolveRelationColor('supersedes', { overrides, mode: 'dark' }), '#abc');
  });
});

describe('categoryColorPair', () => {
  it('returns the { light, dark } pair for a known category', () => {
    const pair = categoryColorPair('lifecycle');
    assert.equal(pair.light, RELATION_COLOR_DEFAULTS.byCategory.lifecycle.light);
    assert.equal(pair.dark, RELATION_COLOR_DEFAULTS.byCategory.lifecycle.dark);
  });

  it('overrides win over defaults', () => {
    const pair = categoryColorPair('lifecycle', {
      byCategory: { lifecycle: { light: '#xxx' } },
    });
    assert.equal(pair.light, '#xxx');
    assert.equal(pair.dark, RELATION_COLOR_DEFAULTS.byCategory.lifecycle.dark);
  });

  it('returns null for an unknown category', () => {
    assert.equal(categoryColorPair('not_real'), null);
  });
});

describe('RELATION_CATEGORIES shape', () => {
  it('exposes exactly nine categories', () => {
    const keys = Object.keys(RELATION_CATEGORIES);
    assert.deepEqual(
      [...keys].sort(),
      ['associative', 'comparative', 'conceptInstance', 'hierarchical',
       'lexical', 'lifecycle', 'mapping', 'spatiotemporal', 'versioning'],
    );
    assert.equal(keys.length, 9);
  });

  it('every category has a label, description, and non-empty types', () => {
    for (const [key, def] of Object.entries(RELATION_CATEGORIES)) {
      assert.ok(def.label, `${key} missing label`);
      assert.ok(def.description, `${key} missing description`);
      assert.ok(def.types.length > 0, `${key} has empty types`);
    }
  });
});
