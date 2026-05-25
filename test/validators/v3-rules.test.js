import test from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { Citation } from '../../src/models/citation.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import { ConceptRef } from '../../src/models/concept-ref.js';
import { RelatedConcept } from '../../src/models/related-concept.js';
import {
  RefShapeRule,
  LocalityCompletenessRule,
  SchemaVersionRule,
  DomainRefRule,
  UuidFormatRule,
  SourceUrnFormatRule,
} from '../../src/validators/v3-rules.js';
import { validateConcept } from '../../src/validators/index.js';

function makeConcept(opts = {}) {
  return new Concept({
    id: opts.id || 'test-001',
    schemaVersion: opts.schemaVersion,
    domains: opts.domains,
    related: opts.related,
    localizations: opts.localizations || {
      eng: {
        terms: [{ designation: 'test', type: 'expression', normative_status: 'preferred' }],
        sources: opts.sources || [],
      },
    },
    raw: opts.raw,
  });
}

// ── RefShapeRule ──────────────────────────────────────────────────────

test('RefShapeRule passes for well-formed Citation.Ref', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({
        ref: new Citation.Ref({ source: 'ISO', id: '9000' }),
      }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

test('RefShapeRule flags nil ref', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({ ref: null }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.ok(errors.some(e => e.message.includes('nil ref')));
});

test('RefShapeRule flags empty ref (no source or id)', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({ ref: new Citation.Ref({}) }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.ok(errors.some(e => e.message.includes('neither source nor id')));
});

test('RefShapeRule flags RelatedConcept with empty ref', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    related: [new RelatedConcept({
      type: 'broader',
      ref: new ConceptRef({}),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.ok(errors.some(e => e.message.includes('empty ref')));
});

// ── LocalityCompletenessRule ──────────────────────────────────────────

test('LocalityCompletenessRule passes for complete locality', () => {
  const rule = new LocalityCompletenessRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({
        ref: new Citation.Ref({ source: 'ISO' }),
        locality: { type: 'clause', reference_from: '3.1.3.10' },
      }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

test('LocalityCompletenessRule flags missing type', () => {
  const rule = new LocalityCompletenessRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({
        ref: new Citation.Ref({ source: 'ISO' }),
        locality: { reference_from: '3.1.3.10' },
      }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.ok(errors.some(e => e.message.includes('no type')));
});

// ── SchemaVersionRule ─────────────────────────────────────────────────

test('SchemaVersionRule passes for version 3', () => {
  const rule = new SchemaVersionRule();
  const concept = makeConcept({ schemaVersion: '3' });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

test('SchemaVersionRule flags version 2', () => {
  const rule = new SchemaVersionRule();
  const concept = makeConcept({ schemaVersion: '2' });
  const errors = rule.validate(concept.toJSON(), '');
  assert.ok(errors.some(e => e.message.includes("expected '3'")));
});

// ── DomainRefRule ─────────────────────────────────────────────────────

test('DomainRefRule passes for domain with concept_id', () => {
  const rule = new DomainRefRule();
  const concept = makeConcept({ domains: [{ concept_id: 'section-3-1' }] });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

test('DomainRefRule flags domain without concept_id or urn', () => {
  const rule = new DomainRefRule();
  const concept = makeConcept({ domains: [{ source: 'ISO' }] });
  const errors = rule.validate(concept.toJSON(), '');
  assert.ok(errors.some(e => e.message.includes('neither concept_id nor urn')));
});

// ── UuidFormatRule ────────────────────────────────────────────────────

test('UuidFormatRule passes for valid UUID', () => {
  const rule = new UuidFormatRule();
  const concept = makeConcept({ id: '0ce27901-02ce-531e-8ba5-fdb136139d1a' });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

test('UuidFormatRule passes for non-UUID concept id', () => {
  const rule = new UuidFormatRule();
  const concept = makeConcept({ id: '3.1.3.10' });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

// ── SourceUrnFormatRule ───────────────────────────────────────────────

test('SourceUrnFormatRule passes for valid URN', () => {
  const rule = new SourceUrnFormatRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({
        ref: new Citation.Ref({ source: 'urn:iso:std:iso:ts:14812' }),
      }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

test('SourceUrnFormatRule passes for non-URN source', () => {
  const rule = new SourceUrnFormatRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({
        ref: new Citation.Ref({ source: 'ISO/TS 14812:2022' }),
      }),
    }).toJSON()],
  });
  const errors = rule.validate(concept.toJSON(), '');
  assert.equal(errors.length, 0);
});

// ── Integration: validateConcept includes v3 rules ────────────────────

test('validateConcept includes RefShapeRule', () => {
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({ ref: null }),
    }).toJSON()],
  });
  const result = validateConcept(concept);
  assert.ok(result.errors.some(e => e.path.includes('origin.ref')));
});
