// Type declarations for the Node-only SHACL validator subpath.
//
// Mirrors src/rdf/shacl-entry.js. Separated from ./rdf so that browser
// bundles don't pull in node:fs/promises, node:path, node:url.

export { validateShacl, loadShapes, clearShapesCache, quadsToDataset } from './shacl';
