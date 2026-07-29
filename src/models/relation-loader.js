// RelationLoader — scans a directory for per-file n-ary relation
// files and returns typed instances.
//
// Files live at relations/<comprehensive-id>/<criterion-slug>.yaml.
// The `type` field on each file discriminates between
// PartitiveRelation, GenericRelation, and future n-ary types.
//
// Usage:
//   import { RelationLoader } from './relation-loader.js';
//   const relations = RelationLoader.loadAll('path/to/dataset/relations');
//   const partitive = RelationLoader.loadForComprehensive('path/relations', '5-1');

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import yaml from 'js-yaml';
import { PartitiveRelation } from './partitive-relation.js';
import { GenericRelation } from './generic-relation.js';

const TYPE_TO_CLASS = Object.freeze({
  partitive_relation: PartitiveRelation,
  generic_relation: GenericRelation,
});

export class RelationLoader {
  static loadAll(relationsDir) {
    return new RelationLoader(relationsDir).loadAll();
  }

  static loadForComprehensive(relationsDir, comprehensiveId) {
    return new RelationLoader(relationsDir).loadForComprehensive(comprehensiveId);
  }

  static loadFile(path) {
    return new RelationLoader(dirname(dirname(path))).loadPath(path);
  }

  constructor(relationsDir) {
    this.relationsDir = relationsDir;
  }

  loadAll() {
    const result = new Map();
    for (const path of this.eachRelationPath()) {
      const rel = this.loadPath(path);
      const compId = comprehensiveIdOf(rel);
      if (!result.has(compId)) result.set(compId, []);
      result.get(compId).push(rel);
    }
    return result;
  }

  loadForComprehensive(comprehensiveId) {
    const dir = join(this.relationsDir, String(comprehensiveId));
    if (!this.isDirectory(dir)) return [];

    return readdirSync(dir)
      .filter(f => f.endsWith('.yaml'))
      .sort()
      .map(f => this.loadPath(join(dir, f)));
  }

  loadPath(path) {
    const text = readFileSync(path, 'utf-8');
    const doc = parseYaml(text);
    if (!doc || typeof doc !== 'object' || !doc.type) {
      throw new RelationLoadError(`${path} missing required \`type\` field`);
    }

    const Klass = TYPE_TO_CLASS[doc.type];
    if (!Klass) {
      throw new RelationLoadError(
        `${path} has unknown type ${JSON.stringify(doc.type)}; ` +
        `expected one of ${Object.keys(TYPE_TO_CLASS).join(', ')}`,
      );
    }

    return Klass.fromJSON(stripWireFields(doc));
  }

  *eachRelationPath() {
    if (!this.isDirectory(this.relationsDir)) return;
    yield* walkYaml(this.relationsDir);
  }

  isDirectory(path) {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }
}

export class RelationLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RelationLoadError';
  }
}

// Strip wire-only fields the model class doesn't accept ($id, type).
function stripWireFields(doc) {
  const { $id, type, ...rest } = doc;
  return rest;
}

function comprehensiveIdOf(relation) {
  const ref = relation.comprehensive;
  if (!ref || !ref.id) return null;
  return [ref.source, ref.id].filter(Boolean).join(':');
}

function* walkYaml(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      yield* walkYaml(path);
    } else if (entry.endsWith('.yaml')) {
      yield path;
    }
  }
}

// Top-level YAML loader backed by js-yaml.
function parseYaml(text) {
  try {
    return yaml.load(text);
  } catch (err) {
    throw new RelationLoadError(`YAML parse failed: ${err.message}`);
  }
}

export default RelationLoader;
