// @ts-nocheck — TEMPORARY during TS migration. TODO(Phase 2e): remove and type fully.
// Node-only SHACL validator entry. Separated from glossarist/rdf so that
// browser bundles can import RDF emitters/writers without pulling in
// node:fs/promises, node:path, node:url.
//
// Usage (Node only):
//   import { validateShacl, loadShapes, clearShapesCache, quadsToDataset }
//     from 'glossarist/rdf/shacl';

export { validateShacl, loadShapes, clearShapesCache, quadsToDataset } from './shacl.js';
