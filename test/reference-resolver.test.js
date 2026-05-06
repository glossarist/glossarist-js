import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { referenceResolver, Reference } from '../src/reference-resolver.js';
import { ConceptCollection } from '../src/concept-collection.js';
import { parseConceptYaml } from '../src/gcr-reader.js';

describe('ReferenceResolver', () => {
  it('extracts embedded concept references from definitions', () => {
    const c = parseConceptYaml([
      'termid: "001"',
      'eng:',
      '  terms:',
      '    - designation: test',
      '  definition:',
      '    - content: See {{3.1.1.1}} for details.',
    ].join('\n'));

    const refs = referenceResolver.extractReferences(c);
    const conceptRefs = refs.filter(r => r.type === 'concept');
    assert.ok(conceptRefs.some(r => r.target === '3.1.1.1'));
  });

  it('extracts references from sources', () => {
    const c = parseConceptYaml([
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
      '  sources:',
      '    - origin:',
      '        ref: ISO/TS 14812:2022',
      '      type: authoritative',
      '  language_code: eng',
      'id: uuid-a',
    ].join('\n'));

    const refs = referenceResolver.extractReferences(c);
    assert.ok(refs.some(r => r.type === 'standard' && r.target === 'ISO/TS 14812:2022'));
  });

  it('resolves references against a collection', () => {
    const c1 = parseConceptYaml('termid: "001"\neng:\n  terms:\n    - designation: alpha');
    const c2 = parseConceptYaml('termid: "002"\neng:\n  terms:\n    - designation: beta');

    c1.relatedConcepts = [{ type: 'related', content: '002' }];

    const cc = new ConceptCollection([c1, c2]);
    const resolved = referenceResolver.resolveAll(c1, cc);
    assert.equal(resolved.get('002')?.id, '002');
  });

  it('returns null for broken references', () => {
    const c = parseConceptYaml('termid: "001"\neng:\n  terms:\n    - designation: test');
    c.relatedConcepts = [{ type: 'related', content: '999' }];

    const cc = new ConceptCollection([c]);
    const resolved = referenceResolver.resolveAll(c, cc);
    assert.equal(resolved.get('999'), undefined);
  });
});

describe('Reference', () => {
  it('stores type and target', () => {
    const r = new Reference('concept', '3.1.1.1', 'supersedes', 'relatedConcepts');
    assert.equal(r.type, 'concept');
    assert.equal(r.target, '3.1.1.1');
    assert.equal(r.relationship, 'supersedes');
    assert.equal(r.source, 'relatedConcepts');
  });
});
