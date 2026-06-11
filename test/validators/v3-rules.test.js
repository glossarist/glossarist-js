import test from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { Citation } from '../../src/models/citation.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import { ConceptRef } from '../../src/models/concept-ref.js';
import { RelatedConcept } from '../../src/models/related-concept.js';
import { ValidationResult } from '../../src/validators/validation-result.js';
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

function validate(rule, concept) {
  const result = new ValidationResult();
  rule.validate(concept, '', result);
  return result;
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
  const result = validate(rule, concept);
  assert.equal(result.errors.length, 0);
});

test('RefShapeRule flags nil ref', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({ ref: null }),
    }).toJSON()],
  });
  const result = validate(rule, concept);
  assert.ok(result.errors.some(e => e.message.includes('nil ref')));
});

test('RefShapeRule flags empty ref (no source or id)', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    sources: [new ConceptSource({
      type: 'authoritative',
      origin: new Citation({ ref: new Citation.Ref({}) }),
    }).toJSON()],
  });
  const result = validate(rule, concept);
  assert.ok(result.errors.some(e => e.message.includes('neither source nor id')));
});

test('RefShapeRule flags RelatedConcept with empty ref', () => {
  const rule = new RefShapeRule();
  const concept = makeConcept({
    related: [new RelatedConcept({
      type: 'broader',
      ref: new ConceptRef({}),
    }).toJSON()],
  });
  const result = validate(rule, concept);
  assert.ok(result.errors.some(e => e.message.includes('empty ref')));
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
  const result = validate(rule, concept);
  assert.equal(result.warnings.length, 0);
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
  const result = validate(rule, concept);
  assert.ok(result.warnings.some(e => e.message.includes('no type')));
});

// ── SchemaVersionRule ─────────────────────────────────────────────────

test('SchemaVersionRule passes for version 3', () => {
  const rule = new SchemaVersionRule();
  const concept = makeConcept({ schemaVersion: '3' });
  const result = validate(rule, concept);
  assert.equal(result.warnings.length, 0);
});

test('SchemaVersionRule flags version 2', () => {
  const rule = new SchemaVersionRule();
  const concept = makeConcept({ schemaVersion: '2' });
  const result = validate(rule, concept);
  assert.ok(result.warnings.some(e => e.message.includes("expected '3'")));
});

// ── DomainRefRule ─────────────────────────────────────────────────────

test('DomainRefRule passes for domain with concept_id', () => {
  const rule = new DomainRefRule();
  const concept = makeConcept({ domains: [{ concept_id: 'section-3-1' }] });
  const result = validate(rule, concept);
  assert.equal(result.warnings.length, 0);
});

test('DomainRefRule flags domain without concept_id or urn', () => {
  const rule = new DomainRefRule();
  const concept = makeConcept({ domains: [{ source: 'ISO' }] });
  const result = validate(rule, concept);
  assert.ok(result.warnings.some(e => e.message.includes('neither concept_id nor urn')));
});

// ── UuidFormatRule ────────────────────────────────────────────────────

test('UuidFormatRule passes for valid UUID', () => {
  const rule = new UuidFormatRule();
  const concept = makeConcept({ id: '0ce27901-02ce-531e-8ba5-fdb136139d1a' });
  const result = validate(rule, concept);
  assert.equal(result.errors.length, 0);
});

test('UuidFormatRule passes for non-UUID concept id', () => {
  const rule = new UuidFormatRule();
  const concept = makeConcept({ id: '3.1.3.10' });
  const result = validate(rule, concept);
  assert.equal(result.errors.length, 0);
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
  const result = validate(rule, concept);
  assert.equal(result.warnings.length, 0);
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
  const result = validate(rule, concept);
  assert.equal(result.warnings.length, 0);
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

import { CiteRefIntegrityRule } from '../../src/validators/v3-rules.js';

function makeConceptForCiteRule({ sources = [], definitionContent = null, notesContent = null, examplesContent = null, annotationsContent = null } = {}) {
  const localization = { terms: [{ designation: 'foo' }] };
  if (definitionContent) localization.definition = [{ content: definitionContent }];
  if (notesContent) localization.notes = [{ content: notesContent }];
  if (examplesContent) localization.examples = [{ content: examplesContent }];
  if (annotationsContent) localization.annotations = [{ content: annotationsContent }];
  return new Concept({ id: 'c1', sources, localizations: { eng: localization } });
}

function runCiteRule(concept) {
  const result = new ValidationResult();
  const rule = new CiteRefIntegrityRule();
  rule.validate(concept, '', result);
  return [...result.errors, ...result.warnings];
}

test('CiteRefIntegrityRule: passes when all source ids are unique', () => {
  const a = new ConceptSource({ id: 'a', origin: new Citation({ ref: { source: 'X' } }) });
  const b = new ConceptSource({ id: 'b', origin: new Citation({ ref: { source: 'Y' } }) });
  const issues = runCiteRule(makeConceptForCiteRule({ sources: [a, b] }));
  assert.equal(issues.length, 0);
});

test('CiteRefIntegrityRule: warns when two concept-level sources share an id', () => {
  const a = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'X' } }) });
  const b = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'Y' } }) });
  const issues = runCiteRule(makeConceptForCiteRule({ sources: [a, b] }));
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /duplicate source id "foo"/);
});

test('CiteRefIntegrityRule: warns when concept-level and localization-level sources share an id', () => {
  const a = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'X' } }) });
  const b = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'Y' } }) });
  const concept = new Concept({
    id: 'c1',
    sources: [a],
    localizations: { eng: { terms: [{ designation: 'x' }], sources: [b] } },
  });
  const issues = runCiteRule(concept);
  assert.equal(issues.length, 1);
});

test('CiteRefIntegrityRule: warns when designation-level and concept-level sources share an id', () => {
  const a = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'X' } }) });
  const b = new ConceptSource({ id: 'foo', origin: new Citation({ ref: { source: 'Y' } }) });
  const concept = new Concept({
    id: 'c1',
    sources: [a],
    localizations: {
      eng: { terms: [{ designation: 'x', sources: [b] }] },
    },
  });
  const issues = runCiteRule(concept);
  assert.equal(issues.length, 1);
});

test('CiteRefIntegrityRule: ignores sources without an id', () => {
  const a = new ConceptSource({ origin: new Citation({ ref: { source: 'X' } }) });
  const b = new ConceptSource({ origin: new Citation({ ref: { source: 'Y' } }) });
  const issues = runCiteRule(makeConceptForCiteRule({ sources: [a, b] }));
  assert.equal(issues.length, 0);
});

test('CiteRefIntegrityRule: passes when every mention resolves to a source', () => {
  const source = new ConceptSource({
    id: 'iso-7301-3-2',
    origin: new Citation({ ref: { source: 'ISO', id: '7301' } }),
  });
  const concept = makeConceptForCiteRule({
    sources: [source],
    definitionContent: 'See {{cite:iso-7301-3-2}}.',
  });
  const issues = runCiteRule(concept);
  assert.equal(issues.length, 0);
});

test('CiteRefIntegrityRule: warns when a mention has no matching source', () => {
  const concept = makeConceptForCiteRule({
    definitionContent: 'See {{cite:nonexistent}}.',
  });
  const issues = runCiteRule(concept);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /does not resolve/);
});

test('CiteRefIntegrityRule: passes when there are no {{cite:}} mentions', () => {
  const concept = makeConceptForCiteRule({
    definitionContent: 'See {{3.1.1.1}}.',
  });
  const issues = runCiteRule(concept);
  assert.equal(issues.length, 0);
});

test('CiteRefIntegrityRule: handles the comma-separated label form', () => {
  const source = new ConceptSource({
    id: 'foo',
    origin: new Citation({ ref: { source: 'X' } }),
  });
  const concept = makeConceptForCiteRule({
    sources: [source],
    definitionContent: 'See {{cite:foo,custom label}}.',
  });
  const issues = runCiteRule(concept);
  assert.equal(issues.length, 0);
});

test('CiteRefIntegrityRule: has the correct rule name and warning level', () => {
  const rule = new CiteRefIntegrityRule();
  assert.equal(rule.name, 'cite-ref-integrity');
  assert.equal(rule.severity, 'warning');
});
