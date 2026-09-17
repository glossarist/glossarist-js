/**
 * Strip trailing slashes from a base URI without regex backtracking.
 * CodeQL js/polynomial-redos: `/\/+$/` is polynomial on runs of '/' —
 * a linear scan is equivalent and safe on untrusted-length input.
 */
export function stripTrailingSlashes(value: unknown): string {
  const s = String(value ?? '');
  let end = s.length;
  while (end > 0 && s[end - 1] === '/') end--;
  return s.slice(0, end);
}
