/**
 * Registry of compiled/machine formats that can be bundled inside a GCR package.
 *
 * Mirrors the Ruby glossarist gem's GcrPackage::COMPILED_EXTENSIONS:
 *   tbx    → TBX-Basic XML (ISO 30042)
 *   jsonld → JSON-LD (SKOS vocabulary)
 *   turtle → Turtle/RDF (SKOS vocabulary)
 *   jsonl  → JSON Lines (one concept per line)
 */

/**
 * Maps format name to the file extension used inside the GCR `compiled/` directory.
 * Keys are the canonical format identifiers; values are the extension including
 * the leading dot (for simple lookup) or the multi-part extension for TBX.
 * @type {ReadonlyMap<string, string>}
 */
const COMPILED_EXTENSIONS = Object.freeze(new Map([
  ['tbx', 'tbx.xml'],
  ['jsonld', 'jsonld'],
  ['turtle', 'ttl'],
  ['jsonl', 'jsonl'],
]));

/** Canonical format identifiers, in a stable order. */
const COMPILED_FORMATS = Object.freeze([...COMPILED_EXTENSIONS.keys()]);

/**
 * Returns the filename (without directory) for a compiled-format entry.
 *
 * @param {string} format - e.g. 'tbx', 'jsonld'
 * @param {string} id - concept ID or document name (e.g. '3.1.1.1', 'glossary')
 * @returns {string} e.g. '3.1.1.1.jsonld', 'glossary.tbx.xml'
 */
function compiledFilename(format, id) {
  const ext = COMPILED_EXTENSIONS.get(format);
  if (!ext) throw new RangeError(`Unknown compiled format: ${format}`);
  return `${id}.${ext}`;
}

/**
 * Returns the full ZIP path for a compiled-format entry.
 *
 * @param {string} format
 * @param {string} id
 * @returns {string} e.g. 'compiled/jsonld/3.1.1.1.jsonld'
 */
function compiledPath(format, id) {
  return `compiled/${format}/${compiledFilename(format, id)}`;
}

/**
 * Checks whether a format name is a known compiled format.
 * @param {string} format
 * @returns {boolean}
 */
function isKnownFormat(format) {
  return COMPILED_EXTENSIONS.has(format);
}

/**
 * Extracts the entry ID (concept ID or document name) from a compiled-format ZIP path.
 * Returns null if the path doesn't match the expected pattern.
 *
 * @param {string} zipPath - e.g. 'compiled/jsonld/3.1.1.1.jsonld'
 * @returns {{ format: string, id: string } | null}
 */
function parseCompiledPath(zipPath) {
  if (!zipPath.startsWith('compiled/')) return null;
  const rest = zipPath.slice('compiled/'.length);
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  const format = rest.slice(0, slash);
  const ext = COMPILED_EXTENSIONS.get(format);
  if (!ext) return null;
  const filename = rest.slice(slash + 1);
  const suffix = `.${ext}`;
  if (!filename.endsWith(suffix)) return null;
  const id = filename.slice(0, -suffix.length);
  return { format, id };
}

export {
  COMPILED_EXTENSIONS,
  COMPILED_FORMATS,
  compiledFilename,
  compiledPath,
  isKnownFormat,
  parseCompiledPath,
};
