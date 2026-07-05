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

// Writer registry. Each entry is `{ write: (quads, transform) => Promise<string> }`.
// Adding a new output format is a single entry here, not six new methods.
const WRITERS = Object.freeze({
  turtle:    { write: (quads) => writeTurtle(quads) },
  ntriples:  { write: (quads) => writeNTriples(quads) },
  jsonld:    { write: (quads, t) => writeJsonld(quads, t._jsonldOpts()) },
});

export class ConceptToGlossTransform {
  constructor(options = {}) {
    this.registerId = options.registerId;
    this.uriBase = (options.uriBase ?? DEFAULT_URI_BASE).replace(/\/+$/, '');
    this.jsonldContext = options.jsonldContext;
  }

  toTurtle(target)    { return this._serialize(target, 'turtle'); }
  toTurtleAll(targets) { return this._serialize(targets, 'turtle'); }
  toJsonld(target)    { return this._serialize(target, 'jsonld'); }
  toJsonldAll(targets) { return this._serialize(targets, 'jsonld'); }
  toNTriples(target)  { return this._serialize(target, 'ntriples'); }
  toNTriplesAll(targets) { return this._serialize(targets, 'ntriples'); }

  // Single dispatcher: collect quads for one concept or many, then hand
  // off to the registered writer. Replaces six near-identical methods.
  async _serialize(target, format) {
    const writer = WRITERS[format];
    if (!writer) throw new Error(`Unknown serialization format: ${format}`);
    const quads = this._collect(target);
    return writer.write(quads, this);
  }

  _collect(target) {
    if (target && typeof target[Symbol.iterator] === 'function') {
      const quads = [];
      for (const concept of target) {
        for (const q of conceptToQuads(concept, this._optsFor(concept))) {
          quads.push(q);
        }
      }
      return quads;
    }
    return collectQuads(conceptToQuads(target, this._optsFor(target)));
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
