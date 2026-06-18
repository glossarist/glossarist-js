import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENTITY_DIRECTORIES,
  ENTITY_TYPES,
  entityDir,
  entityPath,
  isKnownEntityType,
  parseEntityPath,
} from '../src/entity-directory.js';

describe('entity-directory registry', () => {
  it('entityDir maps type to directory name', () => {
    assert.equal(entityDir('figure'), 'figures');
    assert.equal(entityDir('table'), 'tables');
    assert.equal(entityDir('formula'), 'formulas');
  });

  it('entityDir throws for unknown type', () => {
    assert.throws(() => entityDir('unknown'), RangeError);
  });

  it('entityPath builds full ZIP path', () => {
    assert.equal(entityPath('figure', 'mixed-reflection'),
      'figures/mixed-reflection.yaml');
    assert.equal(entityPath('table', 'results'),
      'tables/results.yaml');
    assert.equal(entityPath('formula', 'eq1'),
      'formulas/eq1.yaml');
  });

  it('parseEntityPath extracts type and id', () => {
    assert.deepEqual(parseEntityPath('figures/foo.yaml'),
      { type: 'figure', id: 'foo' });
    assert.deepEqual(parseEntityPath('tables/bar.yaml'),
      { type: 'table', id: 'bar' });
    assert.deepEqual(parseEntityPath('formulas/baz.yaml'),
      { type: 'formula', id: 'baz' });
  });

  it('parseEntityPath returns null for non-entity paths', () => {
    assert.equal(parseEntityPath('concepts/foo.yaml'), null);
    assert.equal(parseEntityPath('images/foo.png'), null);
    assert.equal(parseEntityPath('bibliography.yaml'), null);
    assert.equal(parseEntityPath('compiled/jsonld/x.jsonld'), null);
  });

  it('isKnownEntityType', () => {
    assert.equal(isKnownEntityType('figure'), true);
    assert.equal(isKnownEntityType('table'), true);
    assert.equal(isKnownEntityType('formula'), true);
    assert.equal(isKnownEntityType('xyz'), false);
  });

  it('ENTITY_TYPES lists all known types', () => {
    assert.ok(ENTITY_TYPES.includes('figure'));
    assert.ok(ENTITY_TYPES.includes('table'));
    assert.ok(ENTITY_TYPES.includes('formula'));
  });

  it('ENTITY_DIRECTORIES is a frozen Map', () => {
    assert.ok(ENTITY_DIRECTORIES instanceof Map);
    assert.equal(Object.isFrozen(ENTITY_DIRECTORIES), true);
  });
});
