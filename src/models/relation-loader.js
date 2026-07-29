// HyperedgeLoader — runtime loader for per-file hyperedge YAMLs.
//
// Walks a `relations/<comprehensive-id>/<slug>.yaml` directory and
// dispatches each file to the appropriate class (PartitiveHyperedge,
// GenericHyperedge, future leaves) based on its `type` field, via
// HyperedgeRegistry.
//
// The wire-shape contract is owned by the JSON Schema at
// `schemas/v3/relation.yaml` (concept-model repo) — this loader
// produces the corresponding JS model instances. See
// docs/design/relations-as-files.md (concept-model).
//
// Adding a new hyperedge type means: declare the leaf class with the
// metadata block, register it. The loader picks it up automatically —
// no edits here.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import * as yaml from 'js-yaml';
import { HyperedgeRegistry } from './hyperedge-registry.js';

// Backward-compat: snapshot of registered classes keyed by typeTag.
// Prefer HyperedgeRegistry.forTypeTag() for new code — this snapshot
// is frozen at module load and won't pick up runtime registrations
// from tests (the OCP test in Phase 11 registers a mock type after
// import).
export const TYPE_TO_CLASS = new Proxy({}, {
  get(_target, prop) {
    return HyperedgeRegistry.forTypeTag(prop);
  },
  ownKeys() {
    return HyperedgeRegistry.allTypeTags();
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

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
 * @returns {Map<string, Array<AbstractHyperedge>>} — for each
 *   comprehensive id, the list of relations that have it as their
 *   comprehensive.
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
export const RelationLoader = Object.freeze({ loadAll, loadOne });

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
  const Cls = HyperedgeRegistry.forTypeTag(doc.type);
  if (!Cls) return null;  // Unknown type — let the validator report it
  return Cls.fromJSON(doc);
}
