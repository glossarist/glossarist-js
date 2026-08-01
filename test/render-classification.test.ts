import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReferenceClassifier } from '../src/render-classification.js';
import { Concept } from '../src/models/concept.js';
import { Citation } from '../src/models/citation.js';
import { Reference } from '../src/reference-resolver.js';
import { ConceptCollection } from '../src/concept-collection.js';

describe('ReferenceClassifier', () => {
  let isoRecord;
  let isoColl;
  let registry;
  let classifier;

  beforeEach(() => {
    isoRecord = new Concept({ id: '7301' });
    isoRecord.version = '2024';
    isoColl = new ConceptCollection([isoRecord]);
    registry = {
      isotc204: { concepts: new ConceptCollection() },
      'bibliography:ISO': { concepts: isoColl },
    };
    classifier = new ReferenceClassifier(registry, 'isotc204');
  });

  describe('bibliography classification', () => {
    it('classifies cite:key with bibliography record as "internal-citation"', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        citation: new Citation({ ref: { source: 'ISO', id: '7301', version: '2024' } }),
        sourceId: 'inline',
        resolution: { kind: 'resolved' },
      });
      assert.equal(classifier.classify(ref), 'internal-citation');
    });

    it('classifies cite:key without bibliography record as "self-contained-citation"', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        citation: new Citation({ ref: { source: 'OIML', id: 'X' } }),
        sourceId: 'inline',
        resolution: { kind: 'resolved' },
      });
      assert.equal(classifier.classify(ref), 'self-contained-citation');
    });

    it('classifies URI form with bibliography match as "internal-citation"', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        uri: 'urn:iso:std:iso:7301:2024',
        resolution: { kind: 'bibliography-namespace', source: 'ISO', id: '7301', version: '2024' },
      });
      assert.equal(classifier.classify(ref), 'internal-citation');
    });

    it('classifies URI form with no bibliography match as "external-citation"', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        uri: 'urn:iso:std:iso:7301:2024',
        resolution: { kind: 'bibliography-namespace', source: 'ISO', id: '7301', version: '2024' },
      });
      const noBioRegistry = { isotc204: { concepts: new ConceptCollection() } };
      const c2 = new ReferenceClassifier(noBioRegistry, 'isotc204');
      assert.equal(c2.classify(ref), 'external-citation');
    });

    it('classifies a Reference with neither citation nor uri as "unresolved-citation"', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {});
      assert.equal(classifier.classify(ref), 'unresolved-citation');
    });

    it('classifies a cite:key with inline citation as "internal-citation" when record matches', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        citation: new Citation({ ref: { source: 'ISO', id: '7301', version: '2024' } }),
        sourceId: 'inline',
        resolution: { kind: 'unresolved', reason: 'no-source' },
      });
      assert.equal(classifier.classify(ref), 'internal-citation');
    });
  });

  describe('concept classification', () => {
    it('classifies same-dataset concept ref as "same-dataset"', () => {
      const ref = new Reference('concept', '3.1.1.1', null, null, {
        lookupKey: { id: '3.1.1.1', dataset: 'isotc204' },
      });
      assert.equal(classifier.classify(ref), 'same-dataset');
    });

    it('classifies cross-dataset concept ref as "cross-dataset"', () => {
      registry.iev = { concepts: new ConceptCollection() };
      const ref = new Reference('concept', '102-01-01', null, null, {
        lookupKey: { id: '102-01-01', dataset: 'iev' },
      });
      assert.equal(classifier.classify(ref), 'cross-dataset');
    });

    it('classifies unresolved id ref as "unresolved"', () => {
      const ref = new Reference('concept', 'foo', null, null, {
        lookupKey: { id: 'foo', dataset: 'unloaded' },
      });
      assert.equal(classifier.classify(ref), 'unresolved');
    });

    it('classifies unanchored designation ref as "unresolved-designation"', () => {
      const ref = new Reference('concept', 'target term', null, null, {
        lookupKey: { designation: 'target term', language: 'eng' },
      });
      assert.equal(classifier.classify(ref), 'unresolved-designation');
    });
  });

  describe('standard and unknown types', () => {
    it('classifies "standard" type as "legacy-standard"', () => {
      const ref = new Reference('standard', 'ISO 7301', null, null, {});
      assert.equal(classifier.classify(ref), 'legacy-standard');
    });

    it('classifies unknown type as "unknown"', () => {
      const ref = new Reference('mystery-type', 'foo', null, null, {});
      assert.equal(classifier.classify(ref), 'unknown');
    });

    it('classifies "typed-ref" type as "typed-ref"', () => {
      const ref = new Reference('typed-ref', 'foo', null, null, {});
      assert.equal(classifier.classify(ref), 'typed-ref');
    });

    it('returns "unknown" for null', () => {
      assert.equal(classifier.classify(null), 'unknown');
    });
  });

  describe('purity', () => {
    it('does not mutate the reference or the registry', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        citation: new Citation({ ref: { source: 'ISO', id: '7301' } }),
      });
      const beforeRef = JSON.stringify(ref);
      const beforeRegistry = JSON.stringify(registry);
      classifier.classify(ref);
      assert.equal(JSON.stringify(ref), beforeRef);
      assert.equal(JSON.stringify(registry), beforeRegistry);
    });

    it('returns the same result on repeated calls', () => {
      const ref = new Reference('bibliography', 'inline', null, null, {
        citation: new Citation({ ref: { source: 'ISO', id: '7301' } }),
      });
      assert.equal(classifier.classify(ref), classifier.classify(ref));
    });
  });
});
