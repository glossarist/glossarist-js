// HyperedgeLoader — runtime loader for per-file hyperedge YAMLs.
//
// Walks a `relations/<comprehensive-id>/<slug>.yaml` directory and
// dispatches each file to the appropriate class (PartitiveHyperedge,
// GenericHyperedge, future leaves) based on its `type` field, via
// HyperedgeRegistry.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import * as yaml from 'js-yaml';
import { HyperedgeRegistry } from './hyperedge-registry.js';
import type { HyperedgeClass } from './hyperedge-registry.js';
import type { AbstractHyperedge } from './abstract-hyperedge.js';

interface HyperedgeDocument {
  type: string;
  [key: string]: unknown;
}

interface HyperedgeClassWithFromJson extends HyperedgeClass {
  fromJSON(data: unknown): AbstractHyperedge;
}

/**
 * Backward-compat: snapshot of registered classes keyed by typeTag.
 * Prefer HyperedgeRegistry.forTypeTag() for new code — this snapshot
 * is frozen at module load and won't pick up runtime registrations
 * from tests (the OCP test in Phase 11 registers a mock type after
 * import).
 */
export const TYPE_TO_CLASS = new Proxy(
  {} as Record<string, HyperedgeClass>,
  {
    get(_target: unknown, prop: string | symbol): HyperedgeClass | null {
      return typeof prop === 'string' ? HyperedgeRegistry.forTypeTag(prop) : null;
    },
    ownKeys(): string[] {
      return HyperedgeRegistry.allTypeTags();
    },
    getOwnPropertyDescriptor(): PropertyDescriptor {
      return { enumerable: true, configurable: true };
    },
  },
);

/**
 * Thrown by `loadAll` when a relation file has an unknown `type`,
 * malformed structure, or a class that fails to instantiate.
 */
export class RelationLoadError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`relation-loader: ${path}: ${message}`);
    this.path = path;
  }
}

/**
 * Walk a `relations/` directory and load every relation file,
 * returning a Map keyed by comprehensive-id.
 *
 * Returns an empty Map if `relationsDir` doesn't exist or is empty.
 */
export function loadAll(
  relationsDir: string | null | undefined,
): Map<string, AbstractHyperedge[]> {
  const result = new Map<string, AbstractHyperedge[]>();
  if (!relationsDir) return result;
  if (!existsSync(relationsDir)) return result;

  const entries = readdirSync(relationsDir, { withFileTypes: true });
  for (const compEntry of entries as Dirent[]) {
    if (!compEntry.isDirectory()) continue;
    const compId = compEntry.name;
    const compDir = `${relationsDir}/${compId}`;
    if (!result.has(compId)) result.set(compId, []);
    const files = readdirSync(compDir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort();
    for (const file of files) {
      const path = `${compDir}/${file}`;
      const rel = loadOne(path);
      if (rel) result.get(compId)?.push(rel);
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
 * `RelationLoadError` on malformed content.
 */
export function loadOne(path: string): AbstractHyperedge | null {
  let doc: unknown;
  try {
    doc = yaml.load(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new RelationLoadError(path, `YAML parse failed: ${(e as Error).message}`);
  }
  if (!doc || typeof doc !== 'object') return null;
  const d = doc as HyperedgeDocument;
  if (!d.type) return null;
  const Cls = HyperedgeRegistry.forTypeTag(d.type) as HyperedgeClassWithFromJson | null;
  if (!Cls) return null;
  return Cls.fromJSON(d);
}
