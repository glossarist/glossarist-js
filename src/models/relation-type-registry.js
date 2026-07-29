// N-ary relation type registry. Single source of truth for the
// `type` → class dispatch used by the parser, the per-file loader,
// and Concept's unified relations resolver.
//
// Adding a new n-ary relation type (Sequential, Associative, …)
// = one entry here plus one new class. Nothing else changes:
// not Concept, not parser, not serializer, not diff, not patch,
// not renderer.
//
// Lives in its own module (not relation-loader.js) because the loader
// pulls in node:fs, which is off-limits on the browser-gcr path that
// transitively imports this registry via Concept.

import { PartitiveHyperedge } from './partitive-hyperedge.js';
import { GenericHyperedge } from './generic-hyperedge.js';

export const TYPE_TO_CLASS = Object.freeze({
  partitive_relation: PartitiveHyperedge,
  generic_relation: GenericHyperedge,
});

export function classForRelationType(type) {
  if (typeof type !== 'string') return null;
  return TYPE_TO_CLASS[type] ?? null;
}
