import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GcrMetadata } from '../../src/models/gcr-metadata.js';
import { GcrStatistics } from '../../src/models/gcr-statistics.js';
import { Concept } from '../../src/models/concept.js';

// --- GcrStatistics ---

describe('GcrStatistics', () => {
  it('constructs with defaults', () => {
    const s = new GcrStatistics();
    assert.equal(s.totalConcepts, 0);
    assert.equal(s.conceptsWithDefinitions, 0);
    assert.deepEqual(s.conceptsByStatus, {});
  });

  it('constructs from snake_case data', () => {
    const s = new GcrStatistics({
      total_concepts: 10,
      concepts_with_definitions: 8,
      concepts_by_status: { valid: 7, draft: 3 },
    });
    assert.equal(s.totalConcepts, 10);
    assert.equal(s.conceptsWithDefinitions, 8);
    assert.deepEqual(s.conceptsByStatus, { valid: 7, draft: 3 });
  });

  it('constructs from camelCase data', () => {
    const s = new GcrStatistics({
      totalConcepts: 5,
      conceptsWithDefinitions: 4,
      conceptsByStatus: { valid: 5 },
    });
    assert.equal(s.totalConcepts, 5);
    assert.equal(s.conceptsWithDefinitions, 4);
  });

  it('exposes snake_case getters', () => {
    const s = new GcrStatistics({ total_concepts: 10, concepts_with_definitions: 8 });
    assert.equal(s.total_concepts, 10);
    assert.equal(s.concepts_with_definitions, 8);
    assert.deepEqual(s.concepts_by_status, {});
  });

  it('serializes to snake_case JSON', () => {
    const s = new GcrStatistics({
      total_concepts: 10,
      concepts_with_definitions: 8,
      concepts_by_status: { valid: 8, draft: 2 },
    });
    const json = s.toJSON();
    assert.equal(json.total_concepts, 10);
    assert.equal(json.concepts_with_definitions, 8);
    assert.deepEqual(json.concepts_by_status, { valid: 8, draft: 2 });
  });

  it('round-trips through fromJSON', () => {
    const s = new GcrStatistics({ total_concepts: 5, concepts_by_status: { valid: 5 } });
    const s2 = GcrStatistics.fromJSON(s.toJSON());
    assert.equal(s2.totalConcepts, 5);
    assert.deepEqual(s2.conceptsByStatus, { valid: 5 });
  });

  it('fromConcepts computes statistics', () => {
    const concepts = [
      new Concept({ id: '001', localizations: {
        eng: { terms: [{ type: 'expression', designation: 'a' }], definition: [{ content: 'def' }], entry_status: 'valid' },
      }}),
      new Concept({ id: '002', localizations: {
        eng: { terms: [{ type: 'expression', designation: 'b' }], entry_status: 'draft' },
        fra: { terms: [{ type: 'expression', designation: 'b-fr' }], definition: [{ content: 'def-fr' }], entry_status: 'valid' },
      }}),
    ];

    const stats = GcrStatistics.fromConcepts(concepts);
    assert.equal(stats.totalConcepts, 2);
    assert.equal(stats.conceptsWithDefinitions, 2);
    assert.equal(stats.conceptsByStatus.valid, 2);
    assert.equal(stats.conceptsByStatus.draft, 1);
  });

  it('fromConcepts handles empty collection', () => {
    const stats = GcrStatistics.fromConcepts([]);
    assert.equal(stats.totalConcepts, 0);
    assert.equal(stats.conceptsWithDefinitions, 0);
    assert.deepEqual(stats.conceptsByStatus, {});
  });

  it('equals and clone work', () => {
    const s = new GcrStatistics({ total_concepts: 5 });
    const s2 = s.clone();
    assert.ok(s.equals(s2));
    assert.equal(s2.totalConcepts, 5);
  });
});

// --- GcrMetadata ---

describe('GcrMetadata', () => {
  it('constructs with minimal data', () => {
    const m = new GcrMetadata({ shortname: 'test' });
    assert.equal(m.shortname, 'test');
    assert.equal(m.version, null);
    assert.equal(m.schemaVersion, '1');
    assert.deepEqual(m.languages, []);
    assert.deepEqual(m.tags, []);
  });

  it('constructs from snake_case data', () => {
    const m = new GcrMetadata({
      shortname: 'iso',
      concept_count: 100,
      created_at: '2026-01-01T00:00:00Z',
      glossarist_version: '2.6.1',
      schema_version: '1',
      compiled_formats: ['tbx', 'jsonld'],
    });
    assert.equal(m.conceptCount, 100);
    assert.equal(m.createdAt, '2026-01-01T00:00:00Z');
    assert.equal(m.glossaristVersion, '2.6.1');
    assert.deepEqual(m.compiledFormats, ['tbx', 'jsonld']);
  });

  it('exposes snake_case getters for backward compat', () => {
    const m = new GcrMetadata({
      shortname: 'test',
      concept_count: 50,
      created_at: '2026-01-01',
      glossarist_version: '2.5.0',
      compiled_formats: ['tbx'],
    });
    assert.equal(m.concept_count, 50);
    assert.equal(m.created_at, '2026-01-01');
    assert.equal(m.glossarist_version, '2.5.0');
    assert.equal(m.schema_version, '1');
    assert.deepEqual(m.compiled_formats, ['tbx']);
  });

  it('supports all Ruby gem fields', () => {
    const m = new GcrMetadata({
      shortname: 'full',
      version: '2.0',
      title: 'Full Dataset',
      description: 'A test',
      owner: 'ISO',
      tags: ['transport', 'intelligent'],
      concept_count: 100,
      languages: ['eng', 'fra'],
      created_at: '2026-01-01',
      glossarist_version: '2.6.1',
      schema_version: '1',
      homepage: 'https://example.com',
      repository: 'https://github.com/example',
      license: 'MIT',
      uri_prefix: 'https://example.com/concepts/',
      concept_uri_template: 'https://example.com/concepts/{id}',
      compiled_formats: ['tbx'],
    });
    assert.equal(m.description, 'A test');
    assert.equal(m.owner, 'ISO');
    assert.deepEqual(m.tags, ['transport', 'intelligent']);
    assert.equal(m.homepage, 'https://example.com');
    assert.equal(m.repository, 'https://github.com/example');
    assert.equal(m.license, 'MIT');
    assert.equal(m.uriPrefix, 'https://example.com/concepts/');
    assert.equal(m.conceptUriTemplate, 'https://example.com/concepts/{id}');
  });

  it('nests GcrStatistics', () => {
    const m = new GcrMetadata({
      shortname: 'test',
      statistics: { total_concepts: 10, concepts_by_status: { valid: 10 } },
    });
    assert.ok(m.statistics instanceof GcrStatistics);
    assert.equal(m.statistics.totalConcepts, 10);
    assert.equal(m.statistics.conceptsByStatus.valid, 10);
  });

  it('accepts GcrStatistics instance', () => {
    const stats = new GcrStatistics({ total_concepts: 5 });
    const m = new GcrMetadata({ shortname: 'test', statistics: stats });
    assert.ok(m.statistics instanceof GcrStatistics);
    assert.equal(m.statistics.totalConcepts, 5);
  });

  it('serializes to snake_case JSON', () => {
    const m = new GcrMetadata({
      shortname: 'test',
      version: '1.0',
      concept_count: 50,
      compiled_formats: ['tbx'],
      statistics: { total_concepts: 50 },
    });
    const json = m.toJSON();
    assert.equal(json.shortname, 'test');
    assert.equal(json.concept_count, 50);
    assert.deepEqual(json.compiled_formats, ['tbx']);
    assert.equal(json.statistics.total_concepts, 50);
    assert.equal(json.version, '1.0');
  });

  it('omits null fields from JSON', () => {
    const m = new GcrMetadata({ shortname: 'test' });
    const json = m.toJSON();
    assert.equal(Object.keys(json).length, 2);
    assert.equal(json.shortname, 'test');
    assert.equal(json.schema_version, '1');
  });

  it('round-trips through fromJSON', () => {
    const m = new GcrMetadata({
      shortname: 'test',
      version: '1.0',
      languages: ['eng'],
      statistics: { total_concepts: 5, concepts_by_status: { valid: 5 } },
    });
    const m2 = GcrMetadata.fromJSON(m.toJSON());
    assert.equal(m2.shortname, 'test');
    assert.deepEqual(m2.languages, ['eng']);
    assert.equal(m2.statistics.totalConcepts, 5);
  });

  it('fromYaml parses YAML string', () => {
    const m = GcrMetadata.fromYaml([
      'shortname: yaml-test',
      'version: "2.0"',
      'concept_count: 42',
      'languages:',
      '  - eng',
    ].join('\n'));
    assert.equal(m.shortname, 'yaml-test');
    assert.equal(m.conceptCount, 42);
    assert.deepEqual(m.languages, ['eng']);
  });

  it('equals and clone work', () => {
    const m = new GcrMetadata({ shortname: 'test', version: '1.0' });
    const m2 = m.clone();
    assert.ok(m.equals(m2));
    assert.equal(m2.shortname, 'test');
  });
});
