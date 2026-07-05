// SHACL validator wrapper. Loads vendored concept-model shapes once and
// validates any RDFJS Dataset against them. Mirrors the mechanics of
// glossarist-ruby's `Glossarist::Validation::ShaclValidator`.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dataModel from '@rdfjs/data-model';
import rdfDatasetFactory from '@rdfjs/dataset';
import { Parser as N3Parser } from 'n3';
import { default as ShaclValidator } from 'rdf-validate-shacl';

// rdf-validate-shacl needs an RDFJS factory that produces both terms
// and Datasets. @rdfjs/data-model is the spec-complete term factory;
// @rdfjs/dataset adds the Dataset class.
//
// The data-model default export carries its methods on the prototype
// (non-enumerable), so a spread ({ ...dataModel }) does not capture
// them. List the RDF/JS surface explicitly.
const FACTORY = {
  namedNode: dataModel.namedNode.bind(dataModel),
  blankNode: dataModel.blankNode.bind(dataModel),
  literal: dataModel.literal.bind(dataModel),
  variable: dataModel.variable.bind(dataModel),
  defaultGraph: dataModel.defaultGraph.bind(dataModel),
  quad: dataModel.quad.bind(dataModel),
  fromTerm: dataModel.fromTerm.bind(dataModel),
  fromQuad: dataModel.fromQuad.bind(dataModel),
  dataset: rdfDatasetFactory.dataset.bind(rdfDatasetFactory),
};
const createDataset = FACTORY.dataset;
const ShaclValidatorCtor = ShaclValidator.default ?? ShaclValidator;

// Path to the vendored SHACL shapes (synced from glossarist/concept-model
// via `npm run sync:model`). Resolved relative to this source file so it
// works regardless of the consumer's cwd.
const SHAPES_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..',
  'data', 'concept-model', 'shapes', 'glossarist.shacl.ttl',
);

// Note: SHAPES_PATH resolves relative to this source file. When the package
// is installed, npm packs `data/concept-model/shapes/glossarist.shacl.ttl`
// (see `files` in package.json) into `node_modules/glossarist/data/...`, so
// the relative climb (`../..`) from `src/rdf/shacl.js` still lands on the
// installed package root.

// Cache keyed by absolute path so callers swapping shapes via the
// `shapesPath` option (or future overrides) don't get cross-talk.
const SHAPES_CACHE = new Map();

async function parseTurtle(text, baseIri) {
  const parser = new N3Parser({ baseIRI: baseIri });
  const out = createDataset();
  return new Promise((resolve, reject) => {
    parser.parse(text, (err, quad) => {
      if (err) reject(err);
      else if (quad) out.add(quad);
      else resolve(out);
    });
  });
}

export async function loadShapes({ shapesPath = SHAPES_PATH } = {}) {
  const cached = SHAPES_CACHE.get(shapesPath);
  if (cached) return cached;
  const text = await readFile(shapesPath, 'utf8');
  const dataset = await parseTurtle(text, `file://${shapesPath}`);
  SHAPES_CACHE.set(shapesPath, dataset);
  return dataset;
}

// Validates a single RDFJS Dataset against the concept-model SHACL shapes.
// Returns the underlying ValidationReport from rdf-validate-shacl.
//
// Options:
//   - shapes: a pre-loaded Dataset to use instead of the default shapes
//   - shapesPath: alternative path to load shapes from (cached per path)
export async function validateShacl(dataDataset, { shapes, shapesPath } = {}) {
  const shapesDataset = shapes ?? await loadShapes({ shapesPath });
  const validator = new ShaclValidatorCtor(shapesDataset, { factory: FACTORY });
  return validator.validate(dataDataset);
}

// Convenience: builds an RDFJS Dataset from a quad iterable (e.g. the
// output of conceptToQuads). Useful when chaining the RDF emitters with
// SHACL validation.
export function quadsToDataset(quads) {
  const ds = createDataset();
  for (const q of quads) ds.add(q);
  return ds;
}

// Clears the in-memory shapes cache. Exposed as part of the public API
// so callers (including tests) can force a fresh load when the
// underlying shapes file changes during a process's lifetime.
export function clearShapesCache() {
  SHAPES_CACHE.clear();
}
