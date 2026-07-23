// Specs for the three v2 PartitiveRelation validators.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';
import { PartitiveRelationCoherenceRule } from '../../src/validators/partitive-relation-coherence-rule.js';
import { ExternalConceptShapeRule } from '../../src/validators/external-concept-shape-rule.js';
import { BinaryHasPartRedundancyRule } from '../../src/validators/binary-has-part-redundancy-rule.js';
import { ValidationResult } from '../../src/validators/validation-result.js';

function runRule(Rule, concept) {
  const result = new ValidationResult();
  new Rule().validate(concept, '', result);
  return result;
}

function makeRelation(opts = {}) {
  return new PartitiveRelation({
    comprehensive: opts.comprehensive ?? { source: 'VIM', id: '1' },
    partitives: opts.partitives ?? [
      { ref: { source: 'VIM', id: '2' } },
      { ref: { source: 'VIM', id: '3' } },
    ],
    ...opts,
  });
}

describe('PartitiveRelationCoherenceRule', () => {
  it('passes when concept has no relations', () => {
    const concept = new Concept({ id: '1' });
    const result = runRule(PartitiveRelationCoherenceRule, concept);
    assert.equal(result.errors.length + result.warnings.length, 0);
  });

  it('passes for a single well-formed relation', () => {
    const concept = new Concept({ id: '1', partitiveRelations: [makeRelation()] });
    const result = runRule(PartitiveRelationCoherenceRule, concept);
    assert.equal(result.errors.length, 0);
  });

  it('errors on duplicate (comprehensive + criterion)', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [
        makeRelation({
          comprehensive: { source: 'VIM', id: '1' },
          criterion: { eng: 'physical' },
        }),
        makeRelation({
          comprehensive: { source: 'VIM', id: '1' },
          criterion: { eng: 'physical' },
        }),
      ],
    });
    const result = runRule(PartitiveRelationCoherenceRule, concept);
    assert.ok(result.errors.length >= 1);
    assert.match(result.errors[0].message, /duplicate PartitiveRelation/);
  });

  it('passes when same comprehensive but different criterion', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [
        makeRelation({
          comprehensive: { source: 'VIM', id: '1' },
          criterion: { eng: 'physical' },
          partitives: [
            { ref: { source: 'VIM', id: '2' } },
            { ref: { source: 'VIM', id: '3' } },
          ],
        }),
        makeRelation({
          comprehensive: { source: 'VIM', id: '1' },
          criterion: { eng: 'functional' },
          partitives: [
            { ref: { source: 'VIM', id: '4' } },
            { ref: { source: 'VIM', id: '5' } },
          ],
        }),
      ],
    });
    const result = runRule(PartitiveRelationCoherenceRule, concept);
    assert.equal(result.errors.length, 0);
  });

  it('warns when concept has multiple relations and any lacks criterion', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [
        makeRelation({
          comprehensive: { source: 'VIM', id: '1' },
          criterion: { eng: 'physical' },
        }),
        makeRelation({
          comprehensive: { source: 'VIM', id: '9' },
          // no criterion
        }),
      ],
    });
    const result = runRule(PartitiveRelationCoherenceRule, concept);
    assert.ok(result.warnings.some(w => /criterion/.test(w.message)));
  });

  it('warns on plurality isUncertain without isShared', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        plurality: { is_shared: false, is_uncertain: true },
      })],
    });
    const result = runRule(PartitiveRelationCoherenceRule, concept);
    assert.ok(result.warnings.some(w => /isUncertain/.test(w.message)));
  });
});

describe('ExternalConceptShapeRule', () => {
  it('no-ops on non-external concepts', () => {
    const concept = new Concept({
      id: '1',
      status: 'valid',
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [{ type: 'expression', designation: 'x' }],
          definition: [{ content: 'definition' }],
        },
      },
    });
    const result = runRule(ExternalConceptShapeRule, concept);
    assert.equal(result.errors.length, 0);
  });

  it('errors when external concept has a definition', () => {
    const concept = new Concept({
      id: '1',
      status: 'external',
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [{ type: 'expression', designation: 'name' }],
          definition: [{ content: 'should not be here' }],
        },
      },
    });
    const result = runRule(ExternalConceptShapeRule, concept);
    assert.ok(result.errors.some(e => /definition/.test(e.message)));
  });

  it('errors when external concept has sources', () => {
    const concept = new Concept({
      id: '1',
      status: 'external',
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [{ type: 'expression', designation: 'name' }],
          sources: [{ type: 'authoritative', origin: { ref: { source: 'X', id: '1' } } }],
        },
      },
    });
    const result = runRule(ExternalConceptShapeRule, concept);
    assert.ok(result.errors.some(e => /sources/.test(e.message)));
  });

  it('errors when external concept has no designations', () => {
    const concept = new Concept({
      id: '1',
      status: 'external',
      localizations: { eng: { language_code: 'eng' } },
    });
    const result = runRule(ExternalConceptShapeRule, concept);
    assert.ok(result.errors.some(e => /no designations/.test(e.message)));
  });

  it('passes for a well-formed external concept', () => {
    const concept = new Concept({
      id: '1',
      status: 'external',
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [{ type: 'expression', designation: 'name' }],
        },
      },
    });
    const result = runRule(ExternalConceptShapeRule, concept);
    assert.equal(result.errors.length, 0);
  });
});

describe('BinaryHasPartRedundancyRule', () => {
  it('no-ops when no partitive relations and no binary has_part', () => {
    const concept = new Concept({ id: '1' });
    const result = runRule(BinaryHasPartRedundancyRule, concept);
    assert.equal(result.warnings.length, 0);
  });

  it('warns when binary has_part duplicates a PartitiveRelation member', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [
          { ref: { source: 'VIM', id: '2' } },
          { ref: { source: 'VIM', id: '3' } },
        ],
      })],
      relatedConcepts: [
        { type: 'has_part', ref: { source: 'VIM', id: '2' } },  // redundant
      ],
    });
    const result = runRule(BinaryHasPartRedundancyRule, concept);
    assert.ok(result.warnings.some(w => /redundant/.test(w.message)));
  });

  it('warns when 3+ binary has_part edges suggest PartitiveRelation territory', () => {
    const concept = new Concept({
      id: '1',
      relatedConcepts: [
        { type: 'has_part', ref: { source: 'VIM', id: '2' } },
        { type: 'has_part', ref: { source: 'VIM', id: '3' } },
        { type: 'has_part', ref: { source: 'VIM', id: '4' } },
      ],
    });
    const result = runRule(BinaryHasPartRedundancyRule, concept);
    assert.ok(result.warnings.some(w => /consider converting/.test(w.message)));
  });

  it('does not warn for non-has_part binary edges', () => {
    const concept = new Concept({
      id: '1',
      relatedConcepts: [
        { type: 'see', ref: { source: 'VIM', id: '2' } },
        { type: 'see', ref: { source: 'VIM', id: '3' } },
        { type: 'see', ref: { source: 'VIM', id: '4' } },
      ],
    });
    const result = runRule(BinaryHasPartRedundancyRule, concept);
    assert.equal(result.warnings.length, 0);
  });
});
