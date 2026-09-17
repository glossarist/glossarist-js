// JSONL projection: one wire-format JSON object per line.
//
// Wire shape comes straight from Concept.toJSON() — the same canonical
// shape the v3 schema round-trip tests cover. No second serializer.

import type { Concept } from '../models/concept.js';

/**
 * One concept as a single JSON line (no trailing newline).
 */
export function conceptToJsonl(concept: Concept): string {
  return JSON.stringify(concept.toJSON());
}

/**
 * Aggregate JSONL: one concept per line, LF-terminated.
 */
export function conceptsToJsonl(concepts: readonly Concept[]): string {
  if (concepts.length === 0) return '';
  return concepts.map(conceptToJsonl).join('\n') + '\n';
}
