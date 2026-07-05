// Re-export prefix map and predicate constants generated from the vendored
// concept-model JSON-LD context. Downstream code should never duplicate
// prefix bindings — always import from here.
//
// The JSON-LD context deliberately omits some "well-known" RDF and SKOS
// constants (`rdf:type`, `skos:Concept`) because JSON-LD handles them via
// the `@type` keyword. We construct those from the namespace URIs here so
// downstream emitters don't have to repeat the construction.
import { PRED, PREFIXES } from './predicates.js';

export { PRED, PREFIXES };

// SKOS-XL label predicates — same local name as SKOS, so we construct them
// from the SKOS-XL namespace URI.
const SKOSXL_NS = PRED.skosxl.$ns;
export const SKOSXL = {
  prefLabel: `${SKOSXL_NS}prefLabel`,
  altLabel: `${SKOSXL_NS}altLabel`,
  hiddenLabel: `${SKOSXL_NS}hiddenLabel`,
  literalForm: `${SKOSXL_NS}literalForm`,
};

// Constants used in instance data but absent from the JSON-LD context.
const RDF_NS = PREFIXES.rdf;
const SKOS_NS = PREFIXES.skos;
export const WELL_KNOWN = {
  rdfType: `${RDF_NS}type`,
  rdfValue: `${RDF_NS}value`,
  skosConcept: `${SKOS_NS}Concept`,
  skosxlLabel: `${SKOSXL_NS}Label`,
};
