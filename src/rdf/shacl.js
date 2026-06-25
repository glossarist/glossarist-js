// SHACL validator wrapper. Loads concept-model shapes once and validates
// any RDFJS Dataset against them. Mirrors the mechanics of
// glossarist-ruby's `Glossarist::Validation::ShaclValidator`.
import { readFile } from 'node:fs/promises';
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

// Path to the canonical SHACL shapes inside the @glossarist/concept-model
// package. The path is resolved lazily so consumers that don't use SHACL
// don't pay the import cost.
let CACHED_SHAPES = null;

async function loadShapesPath() {
  const metaUrl = await import.meta.resolve('@glossarist/concept-model/ontologies/shapes/glossarist.shacl.ttl');
  return new URL(metaUrl);
}

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
  const url = await loadShapesPath();
  const text = await readFile(url, 'utf8');
  CACHED_SHAPES = await parseTurtle(text, url.href);
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
