// Tests for section cascading membership on Register and
// ConceptCollection (TODO 29). Mirrors glossarist-ruby's 43dca6b
// and the ontology's owl:TransitiveProperty on gloss:hasParentSection.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Register } from '../src/models/register.js';
import { Concept } from '../src/models/index.js';
import { ConceptCollection } from '../src/concept-collection.js';

function buildRegister() {
  // Three-level hierarchy:
  //   3
  //   └── 3.1
  //       └── 3.1.1
  return new Register({
    sections: [{
      id: '3',
      names: { eng: 'Three' },
      children: [{
        id: '3.1',
        names: { eng: 'Three dot one' },
        children: [{
          id: '3.1.1',
          names: { eng: 'Three dot one dot one' },
        }],
      }],
    }],
  });
}

function buildConcept(id, groups) {
  return new Concept({ id, termid: id, groups });
}

describe('Register.sectionAncestorIds', () => {
  const reg = buildRegister();

  it('returns immediate-parent-first chain for a deep section', () => {
    assert.deepEqual(reg.sectionAncestorIds('3.1.1'), ['3.1', '3']);
  });

  it('returns only the parent for a 2-level section', () => {
    assert.deepEqual(reg.sectionAncestorIds('3.1'), ['3']);
  });

  it('returns empty array for a top-level section', () => {
    assert.deepEqual(reg.sectionAncestorIds('3'), []);
  });

  it('returns empty array for an unknown section id', () => {
    assert.deepEqual(reg.sectionAncestorIds('nope'), []);
  });

  it('returns empty array for null/undefined input', () => {
    assert.deepEqual(reg.sectionAncestorIds(null), []);
    assert.deepEqual(reg.sectionAncestorIds(undefined), []);
  });
});

describe('Register.sectionClosure', () => {
  const reg = buildRegister();

  it('returns [sectionId, ...ancestors] for a deep section', () => {
    assert.deepEqual(reg.sectionClosure('3.1.1'), ['3.1.1', '3.1', '3']);
  });

  it('returns [sectionId] alone for a top-level section', () => {
    assert.deepEqual(reg.sectionClosure('3'), ['3']);
  });
});

describe('Register.conceptSectionIds', () => {
  const reg = buildRegister();

  it('returns the union of the concept own sections + ancestors', () => {
    const concept = buildConcept('c1', ['3.1.1']);
    assert.deepEqual(
      new Set(reg.conceptSectionIds(concept)),
      new Set(['3.1.1', '3.1', '3']),
    );
  });

  it('handles concepts with multiple sections (union of closures)', () => {
    const concept = buildConcept('c2', ['3.1.1', '3']);
    assert.deepEqual(
      new Set(reg.conceptSectionIds(concept)),
      new Set(['3.1.1', '3.1', '3']),
    );
  });

  it('returns [] for a concept with no sections', () => {
    const concept = buildConcept('c3', []);
    assert.deepEqual(reg.conceptSectionIds(concept), []);
  });
});

describe('ConceptCollection.bySection', () => {
  const reg = buildRegister();
  const collection = new ConceptCollection([
    buildConcept('in-3.1.1', ['3.1.1']),
    buildConcept('in-3.1',   ['3.1']),
    buildConcept('in-3',     ['3']),
    buildConcept('orphan',   []),
  ]);

  it('cascades upward: bySection("3") includes concepts in 3, 3.1, 3.1.1', () => {
    const ids = collection.bySection('3', { register: reg }).map(c => c.id);
    assert.deepEqual(new Set(ids), new Set(['in-3', 'in-3.1', 'in-3.1.1']));
  });

  it('bySection("3.1") includes concepts in 3.1 and 3.1.1 but not 3', () => {
    const ids = collection.bySection('3.1', { register: reg }).map(c => c.id);
    assert.deepEqual(new Set(ids), new Set(['in-3.1', 'in-3.1.1']));
  });

  it('bySection("3.1.1") matches only the leaf section', () => {
    const ids = collection.bySection('3.1.1', { register: reg }).map(c => c.id);
    assert.deepEqual(new Set(ids), new Set(['in-3.1.1']));
  });

  it('downward is NOT implied: bySection("3.1") excludes concepts only in 3', () => {
    const ids = collection.bySection('3.1', { register: reg }).map(c => c.id);
    assert.ok(!ids.includes('in-3'));
  });

  it('accepts a pre-computed closure as an array', () => {
    const ids = collection.bySection(['3', '3.1']).map(c => c.id);
    assert.deepEqual(new Set(ids), new Set(['in-3', 'in-3.1']));
  });

  it('throws when called with a single id but no register', () => {
    assert.throws(
      () => collection.bySection('3'),
      /requires \{ register \}/,
    );
  });
});
