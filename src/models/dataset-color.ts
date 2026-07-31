// Per-dataset color spec, light/dark variants.
//
// A DatasetColor may be:
//   - a single hex string (legacy, applied to both modes)
//   - an explicit { light, dark } pair
//
// Round-trips through Register.toJSON unchanged so the data lives in
// the GCR package. Consumers call resolveColor(mode) to pick the
// right hex for the current UI mode.

export type ColorMode = 'light' | 'dark';

export type DatasetColorSpec = string;

export interface DatasetColorPair {
  light?: string;
  dark?: string;
}

export type DatasetColor = DatasetColorSpec | DatasetColorPair;

export const COLOR_MODES: ReadonlyArray<ColorMode> = Object.freeze([
  'light',
  'dark',
]);

/**
 * Returns the right hex for the given mode. Falls back to the single
 * hex when the spec is a string. Returns null when the spec is null
 * or when the requested mode is missing from a pair.
 */
export function resolveColor(
  color: DatasetColor | null | undefined,
  mode: ColorMode,
): string | null {
  if (color == null) return null;
  if (typeof color === 'string') return color;
  if (typeof color === 'object') {
    if (!mode) return color.light ?? color.dark ?? null;
    return color[mode] ?? null;
  }
  return null;
}

/**
 * True when the spec declares an explicit {light, dark} object.
 */
export function isColorPair(
  color: DatasetColor | null | undefined,
): color is DatasetColorPair {
  return color != null && typeof color === 'object';
}

/**
 * Validates a color spec. A valid spec is either:
 *   - a string matching /^#[0-9a-fA-F]{3,8}$/
 *   - an object with `light` and `dark` string fields, each matching
 *     the same pattern
 *
 * Returns null when valid, or an error message describing the issue.
 */
export function validateColor(
  color: DatasetColor | null | undefined,
): string | null {
  if (color == null) return null;
  if (typeof color === 'string') return hexError(color);
  if (typeof color === 'object') {
    if (color.light == null && color.dark == null) {
      return 'color pair must have at least one of `light` or `dark`';
    }
    if (color.light != null) {
      const e = hexError(color.light);
      if (e) return `color.light: ${e}`;
    }
    if (color.dark != null) {
      const e = hexError(color.dark);
      if (e) return `color.dark: ${e}`;
    }
    return null;
  }
  return `unexpected color type ${typeof color}`;
}

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
function hexError(s: unknown): string | null {
  if (typeof s !== 'string') return `expected string, got ${typeof s}`;
  return HEX_RE.test(s) ? null : `not a valid hex color: ${JSON.stringify(s)}`;
}
