// Categorization SSOT for the 52 glossarist relationship types.
//
// Each type in RELATIONSHIP_TYPES belongs to exactly one category. The
// categories are semantic buckets used for filtering and visualization
// in concept-browser. Bringing the categorization into glossarist-js
// means all consumers see the same buckets.

import { RELATIONSHIP_TYPES } from './related-concept.js';

// Category definitions. The `types` array is the exhaustive list of
// relationship-type local names that fall into the category. Each type
// must appear in exactly one category (verified by MECE test).
export const RELATION_CATEGORIES = Object.freeze({
  lifecycle: Object.freeze({
    label: 'Lifecycle',
    description: 'Concept lifecycle transitions: supersession, deprecation, replacement.',
    types: Object.freeze([
      'deprecates', 'deprecated_by',
      'supersedes', 'superseded_by',
      'replaces', 'replaced_by',
      'invalidates', 'invalidated_by',
      'retires', 'retired_by',
    ]),
  }),

  hierarchical: Object.freeze({
    label: 'Hierarchical',
    description: 'Broader/narrower relations, including SKOS and ISO 25964 generic/partitive/instantial.',
    types: Object.freeze([
      'broader', 'narrower',
      'broader_generic', 'narrower_generic',
      'broader_partitive', 'narrower_partitive',
      'broader_instantial', 'narrower_instantial',
    ]),
  }),

  associative: Object.freeze({
    label: 'Associative',
    description: 'Generic see-also references between concepts.',
    types: Object.freeze([
      'see', 'related_concept',
      'related_concept_broader', 'related_concept_narrower',
      'references',
    ]),
  }),

  comparative: Object.freeze({
    label: 'Comparative',
    description: 'Compare / contrast relations between concepts.',
    types: Object.freeze(['compare', 'contrast']),
  }),

  spatiotemporal: Object.freeze({
    label: 'Spatiotemporal',
    description: 'Sequential, spatial, and temporal relations.',
    types: Object.freeze([
      'sequentially_related_concept',
      'spatially_related_concept',
      'temporally_related_concept',
    ]),
  }),

  lexical: Object.freeze({
    label: 'Lexical',
    description: 'Lexical relations between designations across languages.',
    types: Object.freeze(['homograph', 'false_friend']),
  }),

  mapping: Object.freeze({
    label: 'Mapping',
    description: 'SKOS mapping properties for cross-vocabulary alignment.',
    types: Object.freeze([
      'equivalent', 'close_match',
      'broad_match', 'narrow_match', 'related_match',
    ]),
  }),

  conceptInstance: Object.freeze({
    label: 'Concept / Instance',
    description: 'ISO 19135 concept-to-concept relations: definition, part, instance, inheritance.',
    types: Object.freeze([
      'has_concept', 'is_concept_of',
      'instance_of', 'has_instance',
      'has_definition', 'definition_of',
      'has_part', 'is_part_of',
      'inherits', 'inherited_by',
    ]),
  }),

  versioning: Object.freeze({
    label: 'Versioning',
    description: 'Version lineage within the same concept identity.',
    types: Object.freeze([
      'has_version', 'version_of',
      'current_version', 'current_version_of',
    ]),
  }),
});

// Reverse index built once. Maps each type local name to its category.
const _CATEGORY_BY_TYPE = (() => {
  const map = new Map();
  for (const [cat, def] of Object.entries(RELATION_CATEGORIES)) {
    for (const t of def.types) map.set(t, cat);
  }
  return map;
})();

/**
 * Returns the category key for the given relationship type, or null
 * when the type is not categorized (e.g. an unrecognized custom type).
 */
export function categoryOf(type) {
  return _CATEGORY_BY_TYPE.get(type) ?? null;
}

/**
 * Returns the category definition ({ label, description, types }) for
 * the given category key, or null when the key is unknown.
 */
export function categoryDefinition(categoryKey) {
  return RELATION_CATEGORIES[categoryKey] ?? null;
}

/**
 * MECE sanity check. Returns the list of relationship types that are
 * NOT categorized (i.e. present in RELATIONSHIP_TYPES but missing from
 * RELATION_CATEGORIES). Used by the test suite to verify SSOT drift.
 */
export function uncategorizedTypes() {
  return RELATIONSHIP_TYPES.filter(t => !_CATEGORY_BY_TYPE.has(t));
}

/**
 * MECE sanity check. Returns a list of { type, categories } entries
 * for any type that appears in MORE than one category. Should be
 * empty when the categorization is mutually exclusive.
 */
export function duplicatedTypes() {
  const counts = new Map();
  for (const def of Object.values(RELATION_CATEGORIES)) {
    for (const t of def.types) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const out = [];
  for (const [type, count] of counts) {
    if (count > 1) out.push({ type, count });
  }
  return out;
}
