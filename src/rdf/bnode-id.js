// Deterministic blank node ID strategy.
//
// Single source of truth for bnode IDs across all emitters. Previously
// each emitter had its own local FNV-1a hash, producing different IDs
// for the same logical bnode. This module replaces those with one
// strategy: MD5 (via node:crypto) when available, FNV-1a fallback for
// browser bundles.
//
// Cross-process stability matches glossarist-ruby's deterministic-id
// when node:crypto is available. Within a single process, FNV-1a is
// also stable.

import { createHash } from 'node:crypto';

function fnv1a(seed) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function deterministicBnodeId(...parts) {
  const seed = parts.filter(p => p != null && p !== '').join('|');
  if (!seed) return `b${fnv1a('empty')}`;
  // MD5 matches glossarist-ruby's deterministic-id for cross-process
  // stability. Truncated to 12 hex chars — enough collision resistance
  // for bnode IDs within a single document.
  try {
    return createHash('md5').update(seed).digest('hex').slice(0, 12);
  } catch {
    return `b${fnv1a(seed)}`;
  }
}
