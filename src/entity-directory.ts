type EntityType = 'figure' | 'table' | 'formula';

const ENTITY_DIRECTORIES: ReadonlyMap<EntityType, string> = Object.freeze(new Map<EntityType, string>([
  ['figure', 'figures'],
  ['table', 'tables'],
  ['formula', 'formulas'],
]));

const ENTITY_TYPES: readonly EntityType[] = Object.freeze([...ENTITY_DIRECTORIES.keys()]);

function entityDir(type: EntityType): string {
  const dir = ENTITY_DIRECTORIES.get(type);
  if (!dir) throw new RangeError(`Unknown entity type: ${type}`);
  return dir;
}

function entityPath(type: EntityType, id: string): string {
  return `${entityDir(type)}/${id}.yaml`;
}

function isKnownEntityType(type: string): type is EntityType {
  return ENTITY_DIRECTORIES.has(type as EntityType);
}

function parseEntityPath(zipPath: string): { type: EntityType; id: string } | null {
  for (const [type, dir] of ENTITY_DIRECTORIES) {
    const prefix = `${dir}/`;
    if (!zipPath.startsWith(prefix)) continue;
    const filename = zipPath.slice(prefix.length);
    if (!filename.endsWith('.yaml')) continue;
    const id = filename.slice(0, -'.yaml'.length);
    if (!id) continue;
    return { type, id };
  }
  return null;
}

export {
  ENTITY_DIRECTORIES,
  ENTITY_TYPES,
  entityDir,
  entityPath,
  isKnownEntityType,
  parseEntityPath,
};
export type { EntityType };
