const ENTITY_DIRECTORIES = Object.freeze(new Map([
  ['figure', 'figures'],
  ['table', 'tables'],
  ['formula', 'formulas'],
]));

const ENTITY_TYPES = Object.freeze([...ENTITY_DIRECTORIES.keys()]);

function entityDir(type) {
  const dir = ENTITY_DIRECTORIES.get(type);
  if (!dir) throw new RangeError(`Unknown entity type: ${type}`);
  return dir;
}

function entityPath(type, id) {
  return `${entityDir(type)}/${id}.yaml`;
}

function isKnownEntityType(type) {
  return ENTITY_DIRECTORIES.has(type);
}

function parseEntityPath(zipPath) {
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
