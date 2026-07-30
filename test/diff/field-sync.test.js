// Specs for the field-sync invariant: wire-key declarations on each
// hyperedge leaf class stay in sync with the parser's STRUCTURAL_KEYS
// reservation set, the validator rule paths, and the RDF emitter
// dispatch table.
//
// The invariant: every wireKey declared on a registered hyperedge
// class must be present in the parser's reserved-key set, so YAML
// language-discovery doesn't mistake `partitive_relations` for a
// language code.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { HyperedgeRegistry } from '../../src/models/hyperedge-registry.js';
import { conceptParser } from '../../src/concept-parser.js';

// Read STRUCTURAL_KEYS from the parser source. They're not exported,
// so we exercise the parser to verify the reservation works: feed it
// a YAML where every registered wireKey is used at the concept level,
// and assert none of them is mistaken for a language localization.
describe('parser reserves all registered hyperedge wire keys', () => {
  for (const cls of HyperedgeRegistry.allClasses()) {
    it(`${cls.name} wireKey '${cls.wireKey}' is structural (not treated as language)`, () => {
      // GenericMember requires a delimitingCharacteristic per ISO 704:2022 §5.5.4.2.1.
      // For other hyperedge types, the bare ref shape works.
      const isGeneric = cls.typeTag === 'generic_relation';
      const memberBlock = isGeneric
        ? `    members:
      - ref: { source: A, id: '2' }
        delimitingCharacteristic: { eng: delimit-2 }
      - ref: { source: A, id: '3' }
        delimitingCharacteristic: { eng: delimit-3 }`
        : `    members:
      - ref: { source: A, id: '2' }
      - ref: { source: A, id: '3' }`;
      const yaml = `termid: '1'
${cls.wireKey}:
  - comprehensive:
      source: A
      id: '1'
${memberBlock}
eng:
  terms:
    - type: expression
      designation: test
      normative_status: preferred
`;
      const c = conceptParser.parse(yaml, 'field-sync.yaml');
      // If the wireKey were NOT reserved, the parser would treat it
      // as a language code and the concept would have an extra
      // "localization" named after the wireKey.
      assert.ok(!c.hasLocalization(cls.wireKey),
        `${cls.wireKey} was treated as a language code — add it to STRUCTURAL_KEYS`);
      // And the relation data should round-trip via .relations
      assert.ok(c.relations.length >= 1);
    });

    it(`${cls.name} v1 wire keys are also structural`, () => {
      for (const v1Key of cls.v1WireKeys ?? []) {
        const yaml = `termid: '1'
${v1Key}:
  - comprehensive:
      source: A
      id: '1'
    parts:
      - source: A
        id: '2'
      - source: A
        id: '3'
eng:
  terms:
    - type: expression
      designation: test
      normative_status: preferred
`;
        const c = conceptParser.parse(yaml, 'field-sync-v1.yaml');
        assert.ok(!c.hasLocalization(v1Key),
          `${v1Key} was treated as a language code — add it to STRUCTURAL_KEYS`);
      }
    });
  }
});

describe('every registered class has the full 6-field metadata block', () => {
  const requiredFields = ['wireKey', 'typeTag', 'rdfType', 'memberClass', 'v1WireKeys', 'kindLabel'];
  for (const cls of HyperedgeRegistry.allClasses()) {
    it(`${cls.name} declares all 6 metadata fields`, () => {
      for (const f of requiredFields) {
        assert.ok(cls[f] !== undefined && cls[f] !== null,
          `${cls.name} is missing metadata field '${f}'`);
      }
    });
    it(`${cls.name}.wireKey is a non-empty string`, () => {
      assert.equal(typeof cls.wireKey, 'string');
      assert.ok(cls.wireKey.length > 0);
    });
    it(`${cls.name}.v1WireKeys is an array`, () => {
      assert.ok(Array.isArray(cls.v1WireKeys));
    });
    it(`${cls.name}.memberClass is a constructor`, () => {
      assert.equal(typeof cls.memberClass, 'function');
    });
  }
});

describe('no two registered classes share the same wireKey/typeTag/rdfType', () => {
  it('wireKeys are unique', () => {
    const wireKeys = HyperedgeRegistry.allClasses().map(c => c.wireKey);
    const unique = new Set(wireKeys);
    assert.equal(wireKeys.length, unique.size);
  });
  it('typeTags are unique', () => {
    const typeTags = HyperedgeRegistry.allClasses().map(c => c.typeTag);
    const unique = new Set(typeTags);
    assert.equal(typeTags.length, unique.size);
  });
  it('rdfTypes are unique', () => {
    const rdfTypes = HyperedgeRegistry.allClasses().map(c => c.rdfType);
    const unique = new Set(rdfTypes);
    assert.equal(rdfTypes.length, unique.size);
  });
});
