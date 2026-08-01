// ConceptToGlossTransform — converts a Concept model into RDF.
//
// Usage:
//   const xform = new ConceptToGlossTransform({ registerId: 'iso-6709', uriBase: 'https://example.org' });
//   const ttl = await xform.toTurtle(concept);

import { conceptToQuads } from '../rdf/gloss-concept.js';
import {
  collectQuads,
  writeTurtle,
  writeNTriples,
  writeJsonld,
} from '../rdf/document-writer.js';
import type { Quad } from '@rdfjs/types';

type ConceptLike = { registerId?: string; id?: string | number } & Record<string, unknown>;

interface WriterEntry {
  write: (quads: Quad[], transform: ConceptToGlossTransform) => Promise<unknown>;
}

const WRITERS: Readonly<Record<string, WriterEntry>> = Object.freeze({
  turtle:   { write: (quads) => writeTurtle(quads) },
  ntriples: { write: (quads) => writeNTriples(quads) },
  jsonld:   { write: (quads, t) => writeJsonld(quads, t._jsonldOpts() as never) },
});

export class ConceptToGlossTransform {
  readonly registerId: string | undefined;
  readonly uriBase: string;
  readonly jsonldContext: unknown;

  constructor(options: { registerId?: string; uriBase?: string; jsonldContext?: unknown } = {}) {
    this.registerId = options.registerId;
    this.uriBase = (options.uriBase ?? '').replace(/\/+$/, '');
    if (!this.uriBase) {
      throw new Error(
        'ConceptToGlossTransform requires options.uriBase — the deployment canonical URI root.',
      );
    }
    this.jsonldContext = options.jsonldContext;
  }

  toTurtle(target: ConceptLike): Promise<unknown> { return this._serialize(target, 'turtle'); }
  toTurtleAll(targets: Iterable<ConceptLike>): Promise<unknown> { return this._serialize(targets, 'turtle'); }
  toJsonld(target: ConceptLike): Promise<unknown> { return this._serialize(target, 'jsonld'); }
  toJsonldAll(targets: Iterable<ConceptLike>): Promise<unknown> { return this._serialize(targets, 'jsonld'); }
  toNTriples(target: ConceptLike): Promise<unknown> { return this._serialize(target, 'ntriples'); }
  toNTriplesAll(targets: Iterable<ConceptLike>): Promise<unknown> { return this._serialize(targets, 'ntriples'); }

  async _serialize(target: ConceptLike | Iterable<ConceptLike>, format: string): Promise<unknown> {
    const writer = WRITERS[format];
    if (!writer) throw new Error(`Unknown serialization format: ${format}`);
    const quads = this._collect(target);
    return writer.write(quads, this);
  }

  _collect(target: ConceptLike | Iterable<ConceptLike>): Quad[] {
    if (target && typeof (target as Iterable<ConceptLike>)[Symbol.iterator] === 'function') {
      const quads: Quad[] = [];
      for (const concept of target as Iterable<ConceptLike>) {
        for (const q of conceptToQuads(concept as never, this._optsFor(concept))) {
          quads.push(q as Quad);
        }
      }
      return quads;
    }
    return collectQuads(conceptToQuads(target as never, this._optsFor(target as ConceptLike)) as Iterable<Quad>);
  }

  _optsFor(concept: ConceptLike): { registerId: string; uriBase: string } {
    return {
      registerId: this.registerId ?? concept.registerId ?? 'glossary',
      uriBase: this.uriBase,
    };
  }

  _jsonldOpts(): { context?: unknown } {
    return this.jsonldContext ? { context: this.jsonldContext } : {};
  }
}
