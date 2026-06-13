import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { referenceResolver, Reference, ReferenceResolver } from '../src/reference-resolver.js';
import { ConceptCollection } from '../src/concept-collection.js';
import { parseConceptYaml } from '../src/gcr-reader.js';
import { Concept } from '../src/models/concept.js';
import { Citation } from '../src/models/citation.js';
import { ConceptSource } from '../src/models/concept-source.js';

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
      '        ref:',
      '          source: ISO/TS 14812:2022',
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

  it('stores citation, sourceId, and resolution from extras', () => {
    const citation = new Citation({ ref: { source: 'ISO', id: '7301' } });
    const r = new Reference('bibliography', 'inline', null, null, {
      citation,
      sourceId: 'inline',
      resolution: { kind: 'resolved' },
    });
    assert.equal(r.citation, citation);
    assert.equal(r.sourceId, 'inline');
    assert.equal(r.resolution.kind, 'resolved');
  });
});

describe('ReferenceResolver — cite-ref extraction', () => {
  it('emits a Bibliography Reference with the resolved Citation', () => {
    const source = new ConceptSource({
      id: 'iso-7301-3-2',
      origin: new Citation({
        ref: { source: 'ISO', id: '7301', version: '2024' },
        locality: { type: 'clause', reference_from: '3.2' },
      }),
    });
    const concept = new Concept({
      id: 'c1',
      sources: [source],
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{cite:iso-7301-3-2}} for details.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const bibRefs = refs.filter(r => r.type === 'bibliography');
    assert.equal(bibRefs.length, 1);
    assert.equal(bibRefs[0].sourceId, 'iso-7301-3-2');
    assert.equal(bibRefs[0].citation, source.origin);
    assert.equal(bibRefs[0].resolution.kind, 'resolved');
  });

  it('emits an unresolved Reference when the key is not in any source', () => {
    const concept = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{cite:nonexistent}} for details.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const bibRefs = refs.filter(r => r.type === 'bibliography');
    assert.equal(bibRefs.length, 1);
    assert.equal(bibRefs[0].resolution.kind, 'unresolved');
    assert.equal(bibRefs[0].resolution.reason, 'no-source');
    assert.equal(bibRefs[0].sourceId, 'nonexistent');
  });

  it('uses the inline label as the target display text', () => {
    const source = new ConceptSource({
      id: 'iso-7301-3-2',
      origin: new Citation({ ref: { source: 'ISO', id: '7301', version: '2024' } }),
    });
    const concept = new Concept({
      id: 'c1',
      sources: [source],
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{cite:iso-7301-3-2,custom label}}.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const bibRefs = refs.filter(r => r.type === 'bibliography');
    assert.equal(bibRefs[0].target, 'custom label');
  });

  it('emits a Concept Reference for a numeric mention (existing behavior preserved)', () => {
    const concept = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{3.1.1.1}} for details.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const conceptRefs = refs.filter(r => r.type === 'concept');
    assert.equal(conceptRefs.length, 1);
    assert.equal(conceptRefs[0].target, '3.1.1.1');
    assert.equal(conceptRefs[0].lookupKey.id, '3.1.1.1');
  });

  it('uses display text as target for {{id, display}} — id first, display last', () => {
    const concept = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{0.10, measuring instrument}} for details.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const conceptRefs = refs.filter(r => r.type === 'concept');
    assert.equal(conceptRefs.length, 1);
    assert.equal(conceptRefs[0].target, 'measuring instrument');
    assert.equal(conceptRefs[0].lookupKey.id, '0.10');
  });

  it('emits a Concept Reference with designation lookupKey for designation form', () => {
    const concept = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{entity data type value, single entity data type value}}.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const conceptRefs = refs.filter(r => r.type === 'concept');
    assert.equal(conceptRefs.length, 1);
    assert.equal(conceptRefs[0].target, 'single entity data type value');
    assert.equal(conceptRefs[0].lookupKey.designation, 'entity data type value');
  });

  it('walks examples and annotations text in addition to definitions and notes', () => {
    const source = new ConceptSource({
      id: 'a',
      origin: new Citation({ ref: { source: 'X' } }),
    });
    const concept = new Concept({
      id: 'c1',
      sources: [source],
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{cite:a}} in def.' }],
          examples: [{ content: 'Example mentions {{cite:a}}.' }],
          annotations: [{ content: 'Annotation cites {{cite:a}}.' }],
          notes: [{ content: 'Note references {{cite:a}}.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const bibRefs = refs.filter(r => r.type === 'bibliography');
    assert.equal(bibRefs.length, 4);
  });

  it('emits a Concept Reference with uri for a URN mention', () => {
    const concept = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{urn:iso:std:iso:14812}} here.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const conceptRefs = refs.filter(r => r.type === 'concept');
    assert.equal(conceptRefs.length, 1);
    assert.equal(conceptRefs[0].uri, 'urn:iso:std:iso:14812');
  });

  it('uses render term as target for URN with render term', () => {
    const concept = new Concept({
      id: 'c1',
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{urn:iso:std:iso:7301:2024,rice}} here.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const conceptRefs = refs.filter(r => r.type === 'concept');
    assert.equal(conceptRefs.length, 1);
    assert.equal(conceptRefs[0].target, 'rice');
    assert.equal(conceptRefs[0].uri, 'urn:iso:std:iso:7301:2024');
  });

  it('shares a Citation object reference across multiple inline mentions of the same source', () => {
    const source = new ConceptSource({
      id: 'a',
      origin: new Citation({ ref: { source: 'X' } }),
    });
    const concept = new Concept({
      id: 'c1',
      sources: [source],
      localizations: {
        eng: {
          terms: [{ designation: 'foo' }],
          definition: [{ content: 'See {{cite:a}} and {{cite:a,again}}.' }],
        },
      },
    });
    const resolver = new ReferenceResolver();
    const refs = resolver.extractReferences(concept);
    const bibRefs = refs.filter(r => r.type === 'bibliography');
    assert.equal(bibRefs.length, 2);
    assert.equal(bibRefs[0].citation, bibRefs[1].citation);
  });
});

describe('ReferenceResolver.resolveReference — bibliography registry', () => {
  function makeRegistry() {
    const isoRecord = new Concept({ id: '7301' });
    isoRecord.version = '2024';
    const isoColl = new ConceptCollection([isoRecord]);
    return {
      isoRecord,
      registry: {
        isotc204: { concepts: new ConceptCollection() },
        'bibliography:ISO': { concepts: isoColl },
      },
    };
  }

  it('case 1: no bibliography registry — returns the inline Citation', () => {
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({
        ref: { source: 'ISO', id: '7301', version: '2024' },
        locality: { type: 'clause', reference_from: '3.2' },
      }),
    });
    const noBioRegistry = { isotc204: { concepts: new ConceptCollection() } };
    const result = new ReferenceResolver().resolveReference(ref, noBioRegistry);
    assert.ok(result instanceof Citation);
    assert.equal(result.ref.id, '7301');
  });

  it('case 2: bibliography registry matches — returns the rich record', () => {
    const { isoRecord, registry } = makeRegistry();
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({
        ref: { source: 'ISO', id: '7301', version: '2024' },
        locality: { type: 'clause', reference_from: '3.2' },
      }),
    });
    const result = new ReferenceResolver().resolveReference(ref, registry);
    assert.equal(result, isoRecord);
  });

  it('case 2: matches by id and version when version is present', () => {
    const older = new Concept({ id: '7301' });
    older.version = '2010';
    const newer = new Concept({ id: '7301' });
    newer.version = '2024';
    const mixedColl = new ConceptCollection([older, newer]);
    const mixedRegistry = { 'bibliography:ISO': { concepts: mixedColl } };
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({
        ref: { source: 'ISO', id: '7301', version: '2024' },
      }),
    });
    assert.equal(new ReferenceResolver().resolveReference(ref, mixedRegistry), newer);
  });

  it('case 2: matches by id alone when version is absent', () => {
    const { isoRecord, registry } = makeRegistry();
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({ ref: { source: 'ISO', id: '7301' } }),
    });
    assert.equal(new ReferenceResolver().resolveReference(ref, registry), isoRecord);
  });

  it('case 3: URI form, no bibliography registry — returns null', () => {
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      uri: 'urn:iso:std:iso:7301:2024',
      resolution: {
        kind: 'bibliography-namespace',
        source: 'ISO',
        id: '7301',
        version: '2024',
      },
    });
    const noBioRegistry = { isotc204: { concepts: new ConceptCollection() } };
    assert.equal(new ReferenceResolver().resolveReference(ref, noBioRegistry), null);
  });

  it('case 3: URI form, bibliography registry matches — returns the rich record', () => {
    const { isoRecord, registry } = makeRegistry();
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      uri: 'urn:iso:std:iso:7301:2024',
      resolution: {
        kind: 'bibliography-namespace',
        source: 'ISO',
        id: '7301',
        version: '2024',
      },
    });
    assert.equal(new ReferenceResolver().resolveReference(ref, registry), isoRecord);
  });

  it('falls back to the inline Citation when ref has no source or id', () => {
    const { registry } = makeRegistry();
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({ ref: { source: null, id: null } }),
    });
    const result = new ReferenceResolver().resolveReference(ref, registry);
    assert.ok(result instanceof Citation);
  });

  it('returns the empty inline Citation as a self-contained fallback', () => {
    const { registry } = makeRegistry();
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({}),
    });
    const result = new ReferenceResolver().resolveReference(ref, registry);
    assert.ok(result instanceof Citation);
    assert.equal(result.ref, null);
  });

  it('backward compat: a single ConceptCollection is treated as a one-key registry', () => {
    const coll = new ConceptCollection([new Concept({ id: '3.1.1.1' })]);
    const ref = new Reference('concept', '3.1.1.1', null, 'inline');
    const result = new ReferenceResolver().resolveReference(ref, coll);
    assert.equal(result.id, '3.1.1.1');
  });

  it('does not mutate the Reference or the registry', () => {
    const { registry } = makeRegistry();
    const ref = new Reference('bibliography', 'inline', null, 'inline', {
      citation: new Citation({ ref: { source: 'ISO', id: '7301' } }),
    });
    const beforeRef = JSON.stringify(ref);
    const beforeRegistry = JSON.stringify(registry);
    new ReferenceResolver().resolveReference(ref, registry);
    assert.equal(JSON.stringify(ref), beforeRef);
    assert.equal(JSON.stringify(registry), beforeRegistry);
  });

  it('resolves a numeric mention against the source dataset via lookupKey', () => {
    const c1 = new Concept({ id: '3.1.1.1' });
    const c2 = new Concept({ id: '3.1.1.2' });
    const coll = new ConceptCollection([c1, c2]);
    const reg = { isotc204: { concepts: coll } };
    const ref = new Reference('concept', '3.1.1.1', null, 'inline', {
      lookupKey: { id: '3.1.1.1', dataset: 'isotc204' },
    });
    assert.equal(new ReferenceResolver().resolveReference(ref, reg), c1);
  });
});
