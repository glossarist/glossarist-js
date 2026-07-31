// Hyperedge color resolver — resolves display colors for a
// PartitiveHyperedge based on its enumeration and the carrying
// concept's category color.

import { categoryColorPair } from './relation-colors.js';
import type { ColorPair } from './relation-colors.js';

const ENUMERATION_INTENSITY: Readonly<Record<string, number>> = Object.freeze({
  closed: 1.0,
  open: 0.55,
});

const DEFAULT_CATEGORY = 'hierarchical';

export interface ResolveHyperedgeColorOptions {
  category?: string;
  overrides?: { byCategory?: Record<string, Partial<ColorPair>> };
}

export interface ResolvedHyperedgeColor {
  light: string;
  dark: string;
  pattern: 'dashed' | 'double' | null;
}

interface HyperedgeLike {
  enumeration?: string;
  markers?: ReadonlyArray<string>;
}

export function resolveHyperedgeColor(
  hyperedge: HyperedgeLike | null,
  options: ResolveHyperedgeColorOptions = {},
): ResolvedHyperedgeColor | null {
  if (!hyperedge) return null;

  const category = options.category ?? DEFAULT_CATEGORY;
  const base = categoryColorPair(category, options.overrides);
  if (!base) return null;

  const intensity = ENUMERATION_INTENSITY[hyperedge.enumeration ?? ''] ?? 1.0;
  const pattern = derivePattern(hyperedge.markers);

  return {
    light: tint(base.light, intensity),
    dark: tint(base.dark, intensity),
    pattern,
  };
}

function derivePattern(
  markers: ReadonlyArray<string> | null | undefined,
): 'dashed' | 'double' | null {
  const arr = markers ?? [];
  if (arr.includes('dashed')) return 'dashed';
  if (arr.includes('double')) return 'double';
  return null;
}

/**
 * Linear interpolation between the base color and white (light mode)
 * or between the base and a neutral (dark mode). Pure-string inputs
 * return the original color when intensity === 1.0.
 */
function tint(hex: string, ratio: number): string {
  if (ratio >= 1.0) return hex;
  const rgb = parseHex(hex);
  if (!rgb) return hex;

  const target: ReadonlyArray<number> = [255, 255, 255];
  const mixed = rgb.map((c, i) =>
    Math.round(c + ((target[i] ?? 255) - c) * (1 - ratio)),
  );
  return '#' + mixed.map((c) => c.toString(16).padStart(2, '0')).join('');
}

function parseHex(s: string): [number, number, number] | null {
  if (typeof s !== 'string') return null;
  const m = s.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = m[1] as string;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}
