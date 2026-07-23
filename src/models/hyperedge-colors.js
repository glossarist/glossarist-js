// Hyperedge color resolver — resolves display colors for a
// PartitiveHyperedge based on its enumeration and the carrying
// concept's category color.
//
// Closed hyperedges render at full intensity (the relationship is
// definitive — these are ALL the parts). Open hyperedges render at
// reduced intensity (the relationship is partial — other parts may
// exist).
//
// Marker-based styling (double = thicker stroke, dashed = dashed
// pattern) is the caller's responsibility; this resolver returns
// the color only, plus a `pattern` hint for marker-based styling.

import { categoryColorPair } from './relation-colors.js';

const ENUMERATION_INTENSITY = Object.freeze({
  closed: 1.0,
  open: 0.55,
});

const DEFAULT_CATEGORY = 'hierarchical';

export function resolveHyperedgeColor(hyperedge, options = {}) {
  if (!hyperedge) return null;

  const category = options.category ?? DEFAULT_CATEGORY;
  const base = categoryColorPair(category, options.overrides);
  if (!base) return null;

  const intensity = ENUMERATION_INTENSITY[hyperedge.enumeration] ?? 1.0;
  const pattern = derivePattern(hyperedge.markers);

  return {
    light: tint(base.light, intensity),
    dark: tint(base.dark, intensity),
    pattern,
  };
}

function derivePattern(markers) {
  const arr = markers ?? [];
  if (arr.includes('dashed')) return 'dashed';
  if (arr.includes('double')) return 'double';
  return null;
}

// Linear interpolation between the base color and white (light mode)
// or between the base and a neutral (dark mode). Pure-string inputs
// return the original color when intensity === 1.0.
function tint(hex, ratio) {
  if (ratio >= 1.0) return hex;
  const rgb = parseHex(hex);
  if (!rgb) return hex;

  const target = [255, 255, 255];
  const mixed = rgb.map((c, i) =>
    Math.round(c + (target[i] - c) * (1 - ratio)));
  return '#' + mixed.map(c => c.toString(16).padStart(2, '0')).join('');
}

function parseHex(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = m[1];
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}
