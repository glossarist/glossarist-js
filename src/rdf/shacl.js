// SHACL validator wrapper. Loads vendored concept-model shapes once and
// validates any RDFJS Dataset against them. Mirrors the mechanics of
// glossarist-ruby's `Glossarist::Validation::ShaclValidator`.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import rdfDatasetFactory from '@rdfjs/dataset';
import { DataFactory, Parser as N3Parser } from 'n3';
import { default as ShaclValidator } from 'rdf-validate-shacl';

// rdf-validate-shacl needs a "full" RDFJS factory (terms + dataset).
// N3's DataFactory provides terms/quads; @rdfjs/dataset provides the
// Dataset class. Combine them.
const COMBINED_FACTORY = {
  namedNode: DataFactory.namedNode,
  blankNode: DataFactory.blankNode,
  literal: DataFactory.literal,
  defaultGraph: DataFactory.defaultGraph,
  quad: DataFactory.quad,
  fromTerm: DataFactory.fromTerm,
  fromQuad: DataFactory.fromQuad,
  dataset: rdfDatasetFactory.dataset.bind(rdfDatasetFactory),
};
const createDataset = COMBINED_FACTORY.dataset;
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

let CACHED_SHAPES = null;

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

export async function loadShapes() {
  if (CACHED_SHAPES) return CACHED_SHAPES;
  const text = await readFile(SHAPES_PATH, 'utf8');
  CACHED_SHAPES = await parseTurtle(text, `file://${SHAPES_PATH}`);
  return CACHED_SHAPES;
}

// Validates a single RDFJS Dataset against the concept-model SHACL shapes.
// Returns the underlying ValidationReport from rdf-validate-shacl.
//
// Pass { shapes: customDataset } to override the default shapes.
export async function validateShacl(dataDataset, { shapes } = {}) {
  const shapesDataset = shapes ?? await loadShapes();
  // rdf-validate-shacl needs a "full" RDFJS factory (term + dataset); N3's
  // DataFactory only does terms/quads. @rdfjs/dataset's factory does both.
  const validator = new ShaclValidatorCtor(shapesDataset, { factory: COMBINED_FACTORY });
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
