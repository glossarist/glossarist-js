// ConceptToGlossTransform — JS port of glossarist-ruby's
// `Transforms::ConceptToGlossTransform`. Converts a Concept model into
// ontology-faithful RDF (Turtle, JSON-LD, N-Triples).
//
// Usage:
//   import { ConceptToGlossTransform } from 'glossarist/transforms';
//   const xform = new ConceptToGlossTransform({ registerId: 'iso-6709', uriBase: 'https://glossarist.org' });
//   const ttl = await xform.toTurtle(concept);
//   const jsonld = await xform.toJsonld(concept);
//   const ttlAll = await xform.toTurtleAll(concepts);
import { conceptToQuads } from '../rdf/gloss-concept.js';
import {
  collectQuads,
  writeTurtle,
  writeNTriples,
  writeJsonld,
} from '../rdf/document-writer.js';

const DEFAULT_URI_BASE = 'https://glossarist.org';

export class ConceptToGlossTransform {
  constructor(options = {}) {
    this.registerId = options.registerId;
    this.uriBase = (options.uriBase ?? DEFAULT_URI_BASE).replace(/\/+$/, '');
    this.jsonldContext = options.jsonldContext;
  }

  async toTurtle(concept) {
    const quads = collectQuads(conceptToQuads(concept, this._optsFor(concept)));
    return writeTurtle(quads);
  }

  async toTurtleAll(concepts) {
    const quads = this._collectAll(concepts);
    return writeTurtle(quads);
  }

  async toJsonld(concept) {
    const quads = collectQuads(conceptToQuads(concept, this._optsFor(concept)));
    return writeJsonld(quads, this._jsonldOpts());
  }

  async toJsonldAll(concepts) {
    const quads = this._collectAll(concepts);
    return writeJsonld(quads, this._jsonldOpts());
  }

  async toNTriples(concept) {
    const quads = collectQuads(conceptToQuads(concept, this._optsFor(concept)));
    return writeNTriples(quads);
  }

  async toNTriplesAll(concepts) {
    const quads = this._collectAll(concepts);
    return writeNTriples(quads);
  }

  _collectAll(concepts) {
    const quads = [];
    for (const concept of concepts) {
      for (const q of conceptToQuads(concept, this._optsFor(concept))) {
        quads.push(q);
      }
    }
    return quads;
  }

  _optsFor(concept) {
    return {
      registerId: this.registerId ?? concept.registerId ?? 'glossary',
      uriBase: this.uriBase,
    };
  }

  _jsonldOpts() {
    return this.jsonldContext ? { context: this.jsonldContext } : {};
  }
}
