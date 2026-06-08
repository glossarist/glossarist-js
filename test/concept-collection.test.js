import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptCollection } from '../src/concept-collection.js';
import { Concept } from '../src/models/concept.js';
import { LocalizedConcept } from '../src/models/localized-concept.js';
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

  it('search finds by note text', () => {
    const c = parseConceptYaml([
      'termid: "100"',
      'eng:',
      '  terms:',
      '    - designation: test',
      '  notes:',
      '    - content: Important safety note about handling.',
    ].join('\n'));
    const cc = new ConceptCollection([c]);
    const result = cc.search('safety');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '100');
  });

  it('search finds by example text', () => {
    const c = parseConceptYaml([
      'termid: "200"',
      'eng:',
      '  terms:',
      '    - designation: demo',
      '  examples:',
      '    - content: Usage example in automotive context.',
    ].join('\n'));
    const cc = new ConceptCollection([c]);
    const result = cc.search('automotive');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '200');
  });

  it('search finds by annotation text', () => {
    const lc = new LocalizedConcept({
      language_code: 'eng',
      terms: [{ type: 'expression', designation: 'term' }],
      annotations: [{ content: 'Deprecated in favour of newer usage.' }],
    });
    const c = new Concept({ id: '300', localizations: { eng: lc.toJSON() } });
    const cc = new ConceptCollection([c]);
    const result = cc.search('deprecated');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '300');
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

  it('supports numeric index access via Proxy', () => {
    const cc = makeCollection();
    assert.equal(cc[0].id, '3.1.1.1');
    assert.equal(cc[1].id, '3.1.1.2');
    assert.equal(cc[2].id, '3.1.2.1');
    assert.equal(cc[999], undefined);
  });

  it('supports numeric index set via Proxy', () => {
    const cc = makeCollection();
    const replacement = parseConceptYaml('termid: "9.9.9"\neng:\n  terms:\n    - designation: replaced');
    cc[1] = replacement;
    assert.equal(cc[1].id, '9.9.9');
    assert.equal(cc.length, 3);
  });

  it('supports "in" operator for numeric indices', () => {
    const cc = makeCollection();
    assert.equal(0 in cc, true);
    assert.equal(2 in cc, true);
    assert.equal(3 in cc, false);
  });
});
