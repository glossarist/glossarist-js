import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { conceptSerializer } from '../src/concept-serializer.js';
import { conceptParser } from '../src/concept-parser.js';

describe('ConceptSerializer — canonical round-trip', () => {
  const raw = [
    'termid: "001"',
    'term: first concept',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: first concept',
    '  definition:',
    '    - content: The first concept.',
    '  entry_status: valid',
  ].join('\n');

  it('round-trips canonical format', () => {
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toCanonicalYaml(concept);
    const reparsed = conceptParser.parse(yaml);
    assert.equal(reparsed.id, '001');
    assert.equal(reparsed.primaryDesignation('eng'), 'first concept');
    assert.equal(reparsed.definition('eng'), 'The first concept.');
  });

  it('produces valid YAML with termid key', () => {
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toCanonicalYaml(concept);
    assert.ok(yaml.includes('termid:'));
    assert.ok(yaml.includes('eng:'));
    assert.ok(yaml.includes('designation:'));
  });
});

describe('ConceptSerializer — managed round-trip', () => {
  const raw = [
    '---',
    'data:',
    '  identifier: 3.1.1.1',
    '  localized_concepts:',
    '    eng: uuid-aaa',
    'id: uuid-main',
    '---',
    'data:',
    '  definition:',
    '    - content: concrete or abstract thing',
    '  terms:',
    '    - type: expression',
    '      designation: entity',
    '  sources:',
    '    - origin:',
    '        ref: ISO/TS 14812:2022',
    '      type: authoritative',
    '  language_code: eng',
    '  entry_status: valid',
    'id: uuid-aaa',
  ].join('\n');

  it('round-trips managed format (data preserved)', () => {
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toManagedYaml(concept);
    const reparsed = conceptParser.parse(yaml);
    assert.equal(reparsed.id, '3.1.1.1');
    assert.equal(reparsed.primaryDesignation('eng'), 'entity');
    assert.equal(reparsed.localization('eng').sources[0].type, 'authoritative');
    assert.equal(reparsed.localization('eng').sources[0].origin.ref, 'ISO/TS 14812:2022');
  });

  it('produces multi-document YAML', () => {
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toManagedYaml(concept);
    const docCount = (yaml.match(/^---/gm) || []).length;
    assert.ok(docCount >= 2, `Expected at least 2 documents, got ${docCount}`);
  });
});

describe('ConceptSerializer — auto-detect format', () => {
  it('uses canonical when concept has term', () => {
    const concept = conceptParser.parse('termid: "001"\nterm: test\neng:\n  terms:\n    - designation: test');
    const yaml = conceptSerializer.toYaml(concept);
    assert.ok(yaml.includes('termid:'));
    assert.ok(yaml.includes('term:'));
  });

  it('uses managed when concept has no term', () => {
    const raw = [
      '---',
      'data:',
      '  identifier: 3.1.1.1',
      '  localized_concepts:',
      '    eng: uuid-a',
      'id: uuid-main',
      '---',
      'data:',
      '  terms:',
      '    - designation: entity',
      '  language_code: eng',
      'id: uuid-a',
    ].join('\n');
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toYaml(concept);
    assert.ok(yaml.includes('data:'));
    assert.ok(yaml.includes('identifier:'));
  });
});

describe('ConceptSerializer — toRegisterYaml', () => {
  it('serializes register data', () => {
    const yaml = conceptSerializer.toRegisterYaml({ schema_version: '1', shortname: 'test' });
    assert.ok(yaml.includes('schema_version:'));
    assert.ok(yaml.includes('shortname:'));
  });
});

describe('ConceptSerializer — domains in managed output', () => {
  it('includes domains in managed YAML output', () => {
    const raw = [
      '---',
      'data:',
      '  identifier: 103-01-01',
      '  localized_concepts:',
      '    eng: uuid-a',
      '  domains:',
      '    - concept_id: area-103',
      '      ref_type: domain',
      '    - concept_id: section-103-01',
      '      ref_type: domain',
      'id: uuid-main',
      '---',
      'data:',
      '  terms:',
      '    - designation: functional',
      '  language_code: eng',
      '  domain: section-103-01',
      'id: uuid-a',
    ].join('\n');
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toManagedYaml(concept);
    assert.ok(yaml.includes('domains:'));
    assert.ok(yaml.includes('concept_id: area-103'));
    assert.ok(yaml.includes('ref_type: domain'));

    const reparsed = conceptParser.parse(yaml);
    assert.equal(reparsed.domains.length, 2);
    assert.equal(reparsed.domains[0].conceptId, 'area-103');
  });

  it('omits domains when empty', () => {
    const raw = [
      '---',
      'data:',
      '  identifier: 3.1.1.1',
      '  localized_concepts:',
      '    eng: uuid-a',
      'id: uuid-main',
      '---',
      'data:',
      '  terms:',
      '    - designation: entity',
      '  language_code: eng',
      'id: uuid-a',
    ].join('\n');
    const concept = conceptParser.parse(raw);
    const yaml = conceptSerializer.toManagedYaml(concept);
    assert.ok(!yaml.includes('domains:'));
  });
});
