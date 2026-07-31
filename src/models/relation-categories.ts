// Categorization SSOT for the 52 glossarist relationship types.

import { RELATIONSHIP_TYPES } from './related-concept.js';

export interface CategoryDefinition {
  label: string;
  description: string;
  types: ReadonlyArray<string>;
}

type CategoryKey =
  | 'lifecycle'
  | 'hierarchical'
  | 'associative'
  | 'comparative'
  | 'spatiotemporal'
  | 'lexical'
  | 'mapping'
  | 'definitional';

/**
 * Each type in RELATIONSHIP_TYPES belongs to exactly one category. The
 * categories mirror the concept-model taxonomy. Adding a new type
 * means adding a taxonomy entry — no code changes here.
 */
export const RELATION_CATEGORIES: Readonly<Record<CategoryKey, CategoryDefinition>> = Object.freeze({
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
  }) as CategoryDefinition,

  hierarchical: Object.freeze({
    label: 'Hierarchical',
    description: 'Broader/narrower relations, including SKOS and ISO 25964 generic/partitive/instantial.',
    types: Object.freeze([
      'broader', 'narrower',
      'broader_generic', 'narrower_generic',
      'broader_partitive', 'narrower_partitive',
      'broader_instantial', 'narrower_instantial',
    ]),
  }) as CategoryDefinition,

  associative: Object.freeze({
    label: 'Associative',
    description: 'Generic see-also references between concepts.',
    types: Object.freeze([
      'see', 'related_concept',
      'related_concept_broader', 'related_concept_narrower',
      'references',
    ]),
  }) as CategoryDefinition,

  comparative: Object.freeze({
    label: 'Comparative',
    description: 'Compare / contrast relations between concepts.',
    types: Object.freeze(['compare', 'contrast']),
  }) as CategoryDefinition,

  spatiotemporal: Object.freeze({
    label: 'Spatiotemporal',
    description: 'Sequential, spatial, and temporal relations.',
    types: Object.freeze([
      'sequentially_related_concept',
      'spatially_related_concept',
      'temporally_related_concept',
    ]),
  }) as CategoryDefinition,

  lexical: Object.freeze({
    label: 'Lexical',
    description: 'Lexical relations between designations across languages.',
    types: Object.freeze(['homograph', 'false_friend']),
  }) as CategoryDefinition,

  mapping: Object.freeze({
    label: 'Mapping',
    description: 'SKOS mapping properties for cross-vocabulary alignment.',
    types: Object.freeze([
      'equivalent', 'close_match',
      'broad_match', 'narrow_match', 'related_match',
    ]),
  }) as CategoryDefinition,

  definitional: Object.freeze({
    label: 'Definitional',
    description: 'ISO 19135 concept-to-concept relations: definition, part, instance, inheritance, versioning.',
    types: Object.freeze([
      'has_concept', 'is_concept_of',
      'instance_of', 'has_instance',
      'has_definition', 'definition_of',
      'has_part', 'is_part_of',
      'inherits', 'inherited_by',
      'has_version', 'version_of',
      'current_version', 'current_version_of',
      'provides', 'provided_by',
    ]),
  }) as CategoryDefinition,
});

const _CATEGORY_BY_TYPE: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [cat, def] of Object.entries(RELATION_CATEGORIES)) {
    for (const t of def.types) map.set(t, cat);
  }
  return map;
})();

const _CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  conceptInstance: 'definitional',
  versioning: 'definitional',
};

/**
 * Returns the category key for the given relationship type, or null
 * when the type is not categorized.
 */
export function categoryOf(type: string): string | null {
  return _CATEGORY_BY_TYPE.get(type) ?? null;
}

/**
 * Returns the category definition for the given category key.
 * Accepts both canonical names (definitional) and aliases from
 * earlier glossarist-js versions.
 */
export function categoryDefinition(categoryKey: string): CategoryDefinition | null {
  const canonical = _CATEGORY_ALIASES[categoryKey] ?? categoryKey;
  return (RELATION_CATEGORIES as Readonly<Record<string, CategoryDefinition>>)[canonical] ?? null;
}

/**
 * MECE sanity check. Returns the list of relationship types that are
 * NOT categorized.
 */
export function uncategorizedTypes(): string[] {
  return RELATIONSHIP_TYPES.filter((t) => !_CATEGORY_BY_TYPE.has(t));
}

/**
 * MECE sanity check. Returns a list of { type, count } entries for any
 * type that appears in MORE than one category.
 */
export function duplicatedTypes(): ReadonlyArray<{ type: string; count: number }> {
  const counts = new Map<string, number>();
  for (const def of Object.values(RELATION_CATEGORIES)) {
    for (const t of def.types) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const out: { type: string; count: number }[] = [];
  for (const [type, count] of counts) {
    if (count > 1) out.push({ type, count });
  }
  return out;
}

export {
  RELATION_CATEGORIES as RELATION_CATEGORIES_READONLY,
  type CategoryKey as RelationCategoryKey,
};
