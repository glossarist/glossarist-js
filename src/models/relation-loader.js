// RelationLoader — runtime loader for per-file n-ary relation YAMLs.
//
// Walks a `relations/<comprehensive-id>/<slug>.yaml` directory and
// dispatches each file to the appropriate class (PartitiveRelation
// or GenericRelation) based on its `type` field.
//
// The wire-shape contract is owned by the JSON Schema at
// `schemas/v3/relation.yaml` (concept-model repo) — this loader
// produces the corresponding JS model instances. See
// docs/design/relations-as-files.md (concept-model).
//
// This is the runtime equivalent of concept-model's
// CheckPartitiveRelationCoherence#each_relation /
// CheckGenericRelationCoherence#each_relation validators.
// Both readers and validators must agree on the type-dispatch
// table (TYPE_TO_CLASS). Keep them in sync via the JSON Schema.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import * as yaml from 'js-yaml';
import { TYPE_TO_CLASS } from './relation-type-registry.js';

/**
 * Per-type class dispatch. Re-exported from the registry so the
 * loader's old `TYPE_TO_CLASS` import path keeps working. The
 * registry is the single source of truth — adding a relation type
 * there makes it available to both the loader and Concept's
 * unified relations array.
 */
export { TYPE_TO_CLASS };

/**
 * Thrown by `loadAll` when a relation file has an unknown `type`,
 * malformed structure, or a class that fails to instantiate.
 */
export class RelationLoadError extends Error {
  constructor(path, message) {
    super(`relation-loader: ${path}: ${message}`);
    this.path = path;
  }
}

/**
 * Walk a `relations/` directory and load every relation file,
 * returning a Map keyed by comprehensive-id.
 *
 * Returns an empty Map if `relationsDir` doesn't exist or is empty.
 *
 * @param {string} relationsDir — path to a `relations/` directory
 *   containing `<comprehensive-id>/<slug>.yaml` files (per the
 *   schema in schemas/v3/relation.yaml).
 * @returns {Map<string, Array<AbstractNaryRelation>>} — for each
 *   comprehensive id, the list of relations that have it as their
 *   comprehensive. Type-discriminated (PartitiveRelation or
 *   GenericRelation).
 */
export function loadAll(relationsDir) {
  const result = new Map();
  if (!relationsDir) return result;
  if (!existsSync(relationsDir)) return result;

  const entries = readdirSync(relationsDir, { withFileTypes: true });
  for (const compEntry of entries) {
    if (!compEntry.isDirectory()) continue;
    const compId = compEntry.name;
    const compDir = `${relationsDir}/${compId}`;
    if (!result.has(compId)) result.set(compId, []);
    const files = readdirSync(compDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort();
    for (const file of files) {
      const path = `${compDir}/${file}`;
      const rel = loadOne(path);
      if (rel) result.get(compId).push(rel);
    }
  }
  return result;
}

/**
 * Namespace bundle for the loader — callers import it as
 * `import { RelationLoader } from './relation-loader.js'` and call
 * `RelationLoader.loadAll(dir)`. The individual functions are also
 * exported directly for tree-shakeable single-call sites.
 */
export const RelationLoader = Object.freeze({ loadAll });

/**
 * Load a single relation file. Returns null if the file is missing,
 * unreadable, or doesn't have a recognized `type` field. Throws
 * `RelationLoadError` on malformed content (e.g., invalid `members`
 * count, wrong comprehensive shape, YAML parse error).
 */
export function loadOne(path) {
  let doc;
  try {
    doc = yaml.load(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new RelationLoadError(path, `YAML parse failed: ${e.message}`);
  }
  if (!doc || typeof doc !== 'object') return null;
  if (!doc.type) return null;
  const Cls = TYPE_TO_CLASS[doc.type];
  if (!Cls) return null;  // Unknown type — let the validator report it
  return Cls.fromJSON(doc);
}
