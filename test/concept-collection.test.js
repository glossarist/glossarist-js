import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptCollection } from '../src/concept-collection.js';
import { parseConceptYaml } from '../src/gcr-reader.js';

function makeCollection() {
  const c1 = parseConceptYaml([
    'termid: "3.1.1.1"',
    'eng:',
    '  terms:',
    '    - designation: entity',
    '  definition:',
    '    - content: concrete or abstract thing',
    '  entry_status: valid',
  ].join('\n'));

  const c2 = parseConceptYaml([
    'termid: "3.1.1.2"',
    'eng:',
    '  terms:',
    '    - designation: function',
    '  definition:',
    '    - content: action or activity',
    '  entry_status: draft',
  ].join('\n'));

  const c3 = parseConceptYaml([
    'termid: "3.1.2.1"',
    'eng:',
    '  terms:',
    '    - designation: transport',
    'fra:',
    '  terms:',
    '    - designation: transport (fra)',
  ].join('\n'));

  return new ConceptCollection([c1, c2, c3]);
}

describe('ConceptCollection', () => {
  it('byId finds a concept', () => {
    const cc = makeCollection();
    assert.equal(cc.byId('3.1.1.1')?.primaryDesignation('eng'), 'entity');
    assert.equal(cc.byId('nonexistent'), undefined);
  });

  it('byPrefix filters by ID prefix', () => {
    const cc = makeCollection();
    const filtered = cc.byPrefix('3.1.1.');
    assert.equal(filtered.length, 2);
    assert.ok(filtered instanceof ConceptCollection);
  });

  it('byLanguage filters concepts with a localization', () => {
    const cc = makeCollection();
    assert.equal(cc.byLanguage('fra').length, 1);
    assert.equal(cc.byLanguage('eng').length, 3);
  });

  it('byStatus filters by entry status (checks all localizations)', () => {
    const cc = makeCollection();
    assert.equal(cc.byStatus('valid').length, 1);
    assert.equal(cc.byStatus('draft').length, 1);

    const multiStatus = parseConceptYaml([
      'termid: "multi"',
      'eng:',
      '  terms:',
      '    - designation: a',
      '  entry_status: valid',
      'fra:',
      '  terms:',
      '    - designation: b',
      '  entry_status: draft',
    ].join('\n'));
    const cc2 = new ConceptCollection([multiStatus]);
    assert.equal(cc2.byStatus('valid').length, 1);
    assert.equal(cc2.byStatus('draft').length, 1);
  });

  it('index creates a Map for O(1) lookup', () => {
    const cc = makeCollection();
    const idx = cc.index();
    assert.ok(idx instanceof Map);
    assert.equal(idx.get('3.1.1.1')?.primaryDesignation('eng'), 'entity');
  });

  it('sorted returns naturally sorted collection', () => {
    const cc = new ConceptCollection([
      parseConceptYaml('termid: "3.1.10"\neng:\n  terms:\n    - designation: c'),
      parseConceptYaml('termid: "3.1.2"\neng:\n  terms:\n    - designation: b'),
      parseConceptYaml('termid: "3.1.1"\neng:\n  terms:\n    - designation: a'),
    ]);
    const sorted = cc.sorted();
    assert.equal(sorted[0].id, '3.1.1');
    assert.equal(sorted[1].id, '3.1.2');
    assert.equal(sorted[2].id, '3.1.10');
  });

  it('search finds by designation text', () => {
    const cc = makeCollection();
    const result = cc.search('function');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '3.1.1.2');
  });

  it('search finds by definition text', () => {
    const cc = makeCollection();
    const result = cc.search('concrete');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '3.1.1.1');
  });

  it('allLanguages collects unique language codes', () => {
    const cc = makeCollection();
    assert.deepEqual(cc.allLanguages(), ['eng', 'fra']);
  });

  it('filter returns ConceptCollection', () => {
    const cc = makeCollection();
    const filtered = cc.filter(c => c.id.startsWith('3.1.1'));
    assert.ok(filtered instanceof ConceptCollection);
    assert.equal(filtered.length, 2);
  });

  it('slice returns ConceptCollection', () => {
    const cc = makeCollection();
    assert.ok(cc.slice(0, 1) instanceof ConceptCollection);
  });
});
