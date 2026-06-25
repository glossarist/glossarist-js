// ConceptToGlossTransform — JS port of glossarist-ruby's
// `Transforms::ConceptToGlossTransform`. Converts a Concept model into
// ontology-faithful RDF (Turtle today; JSON-LD in a follow-up).
//
// Usage:
//   import { ConceptToGlossTransform } from 'glossarist/transforms';
//   const xform = new ConceptToGlossTransform({ registerId: 'iso-6709', uriBase: 'https://glossarist.org' });
//   const ttl = await xform.toTurtle(concept);
//   const ttlAll = await xform.toTurtleAll(concepts);
import { conceptToQuads } from '../rdf/gloss-concept.js';
import {
  collectQuads,
  writeTurtle,
  writeNTriples,
} from '../rdf/document-writer.js';

const DEFAULT_URI_BASE = 'https://glossarist.org';

export class ConceptToGlossTransform {
  constructor(options = {}) {
    this.registerId = options.registerId;
    this.uriBase = (options.uriBase ?? DEFAULT_URI_BASE).replace(/\/+$/, '');
  }

  async toTurtle(concept) {
    const quads = collectQuads(conceptToQuads(concept, this._optsFor(concept)));
    return writeTurtle(quads);
  }

  async toTurtleAll(concepts) {
    const quads = [];
    for (const concept of concepts) {
      for (const q of conceptToQuads(concept, this._optsFor(concept))) {
        quads.push(q);
      }
    }
    return writeTurtle(quads);
  }

  async toNTriples(concept) {
    const quads = collectQuads(conceptToQuads(concept, this._optsFor(concept)));
    return writeNTriples(quads);
  }

  async toNTriplesAll(concepts) {
    const quads = [];
    for (const concept of concepts) {
      for (const q of conceptToQuads(concept, this._optsFor(concept))) {
        quads.push(q);
      }
    }
    return writeNTriples(quads);
  }

  _optsFor(concept) {
    return {
      registerId: this.registerId ?? concept.registerId ?? 'glossary',
      uriBase: this.uriBase,
    };
  }
}
