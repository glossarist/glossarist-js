// Default color palette for relation categories and individual types.
//
// The defaults mirror concept-browser/data/colors.json. Per-deployment
// overrides pass through resolveRelationColor(type, { overrides, mode })
// and take precedence over category defaults.

import { categoryOf, categoryDefinition } from './relation-categories.js';

// One { light, dark } pair per category. Keeping these in glossarist-js
// lets the defaults ship with the library; consumers only need to
// customize when they want to deviate.
export const RELATION_COLOR_DEFAULTS = Object.freeze({
  byCategory: Object.freeze({
    lifecycle:      { light: '#B43A2E', dark: '#F87171' },
    hierarchical:   { light: '#1F6FEB', dark: '#6EA8FE' },
    associative:    { light: '#6B7280', dark: '#9CA3AF' },
    comparative:    { light: '#A855F7', dark: '#C4B5FD' },
    spatiotemporal: { light: '#0D9488', dark: '#5EEAD4' },
    lexical:        { light: '#D97706', dark: '#FBBF24' },
    mapping:        { light: '#2563EB', dark: '#93BBFD' },
    conceptInstance:{ light: '#65A30D', dark: '#A3E635' },
    versioning:     { light: '#9333EA', dark: '#C4B5FD' },
  }),

  // Per-type overrides. Use the same { light, dark } shape. Keys are
  // relationship-type local names. Empty by default — consumers may
  // populate this through `overrides.byType` at call time.
  byType: Object.freeze({}),
});

/**
 * Resolves the color for a relationship type.
 *
 * Resolution order:
 *   1. overrides.byType[type]
 *   2. RELATION_COLOR_DEFAULTS.byType[type]
 *   3. overrides.byCategory[category]
 *   4. RELATION_COLOR_DEFAULTS.byCategory[category]
 *   5. null (uncategorized or unrecognized type)
 *
 * @param {string} type - relationship type local name
 * @param {{ overrides?: { byType?: object, byCategory?: object }, mode?: 'light'|'dark' }} [options]
 * @returns {string | null}
 */
export function resolveRelationColor(type, options = {}) {
  const mode = options.mode ?? 'light';
  const overrides = options.overrides ?? {};

  const typeOverride = overrides.byType?.[type] ?? RELATION_COLOR_DEFAULTS.byType[type];
  if (typeOverride) return pickMode(typeOverride, mode);

  const category = categoryOf(type);
  if (!category) return null;

  const categoryOverride = overrides.byCategory?.[category] ?? RELATION_COLOR_DEFAULTS.byCategory[category];
  if (!categoryOverride) return null;

  return pickMode(categoryOverride, mode);
}

/**
 * Returns the { light, dark } pair for a category, merging overrides
 * over defaults. Useful for UIs that want to render a legend.
 */
export function categoryColorPair(categoryKey, overrides = {}) {
  const def = categoryDefinition(categoryKey);
  if (!def) return null;
  const fromOverride = overrides.byCategory?.[categoryKey];
  const fromDefault = RELATION_COLOR_DEFAULTS.byCategory[categoryKey];
  if (!fromDefault && !fromOverride) return null;
  return { ...(fromDefault ?? {}), ...(fromOverride ?? {}) };
}

function pickMode(pair, mode) {
  if (pair == null) return null;
  if (typeof pair === 'string') return pair;
  return pair[mode] ?? pair.light ?? pair.dark ?? null;
}
