// Dataset-level output-set API (glossarist-js#132).
//
// One call produces the whole interchange set for a Register/collection.
// Each format is a projection of the same Concept model walk:
//   turtle/jsonld → rdf/ quad layer (context.jsonld-aligned predicates)
//   yaml          → conceptSerializer (schemas/v3 wire)
//   tbx/csv/jsonl → src/output model-walk writers
// MECE: one projection per format; no cross-format re-normalization.

import type { Quad } from '@rdfjs/types';
import type { Concept } from '../models/concept.js';
import { conceptToQuads } from '../rdf/gloss-concept.js';
import { writeTurtle, writeJsonld } from '../rdf/document-writer.js';
import { PREFIXES } from '../rdf/prefixes.js';
import { conceptSerializer } from '../concept-serializer.js';
import { InvalidInputError } from '../errors.js';
import { conceptsToCsv } from './csv.js';
import { conceptsToTbx } from './tbx.js';
import { conceptsToJsonl } from './jsonl.js';
import { conceptToTurtle } from './turtle.js';

export type OutputFormat = 'turtle' | 'jsonld' | 'tbx' | 'jsonl' | 'csv' | 'yaml';

export const OUTPUT_FORMATS: readonly OutputFormat[] = Object.freeze([
  'turtle',
  'jsonld',
  'tbx',
  'jsonl',
  'csv',
  'yaml',
]);

/** Formats that have a meaningful per-concept file (feeds GcrWriter.compiledFormats). */
export const PER_CONCEPT_FORMATS: readonly OutputFormat[] = Object.freeze([
  'turtle',
  'jsonld',
  'tbx',
  'jsonl',
  'yaml',
]);

export interface EmitOutputSetOptions {
  /** Required — register id used in concept IRIs and aggregate filenames. */
  registerId: string;
  /** Required — deployment canonical URI root (never defaulted). */
  uriBase: string;
  /** Subset to emit; defaults to all six formats. */
  formats?: readonly OutputFormat[];
  /** Preferred language order for the CSV projection. */
  languageOrder?: readonly string[];
}

export type OutputSet = Partial<Record<OutputFormat, string>>;

function requireOptions(options: EmitOutputSetOptions, fnName: string): void {
  if (!options?.registerId) {
    throw new InvalidInputError(
      `${fnName} requires options.registerId`,
      'non-empty registerId',
    );
  }
  if (!options?.uriBase) {
    throw new InvalidInputError(
      `${fnName} requires options.uriBase — the deployment canonical URI root is never defaulted`,
      'non-empty uriBase',
    );
  }
}

function resolveFormats(options: EmitOutputSetOptions, fnName: string): OutputFormat[] {
  const formats = options.formats ?? OUTPUT_FORMATS;
  for (const f of formats) {
    if (!OUTPUT_FORMATS.includes(f)) {
      throw new RangeError(`Unknown output format: ${String(f)}`);
    }
  }
  void fnName;
  return [...formats];
}

function collectQuads(
  concepts: readonly Concept[],
  options: EmitOutputSetOptions,
): Quad[] {
  // n3/@rdfjs term variance bridged once at this seam (same pattern as
  // document-writer's addQuad cast).
  const quads: Quad[] = [];
  for (const concept of concepts) {
    for (const q of conceptToQuads(concept, {
      registerId: options.registerId,
      uriBase: options.uriBase,
    }) as Iterable<Quad>) {
      quads.push(q);
    }
  }
  return quads;
}

/**
 * Aggregate output set: one document per requested format, keyed by
 * format name. Filenames follow `{registerId}.{ext}`.
 */
export async function emitOutputSet(
  concepts: readonly Concept[],
  options: EmitOutputSetOptions,
): Promise<OutputSet> {
  requireOptions(options, 'emitOutputSet');
  const formats = resolveFormats(options, 'emitOutputSet');

  const out: OutputSet = {};

  // Shared quad collection for the RDF projections (single model walk).
  const needsQuads = formats.includes('turtle') || formats.includes('jsonld');
  const quads = needsQuads ? collectQuads(concepts, options) : [];

  for (const format of formats) {
    switch (format) {
      case 'turtle':
        out.turtle = await writeTurtle(quads, { prefixes: { ...PREFIXES } });
        break;
      case 'jsonld':
        out.jsonld = await writeJsonld(quads);
        break;
      case 'tbx':
        out.tbx = conceptsToTbx(concepts, { registerId: options.registerId });
        break;
      case 'jsonl':
        out.jsonl = conceptsToJsonl(concepts);
        break;
      case 'csv':
        out.csv = conceptsToCsv(concepts, { languageOrder: options.languageOrder });
        break;
      case 'yaml': {
        const docs = concepts.map((c) => conceptSerializer.toYaml(c));
        out.yaml = docs.join('');
        break;
      }
    }
  }

  return out;
}

/**
 * Per-concept files: `{conceptId: {format: content}}`. Feeds
 * `GcrWriter.compiledFormats` (compiled/{format}/{id}.{ext}).
 * CSV is aggregate-only and never appears here.
 */
export async function emitPerConceptFiles(
  concepts: readonly Concept[],
  options: EmitOutputSetOptions,
): Promise<Record<string, OutputSet>> {
  requireOptions(options, 'emitPerConceptFiles');
  const requested = resolveFormats(options, 'emitPerConceptFiles');
  const formats = requested.filter((f) => PER_CONCEPT_FORMATS.includes(f));

  const out: Record<string, OutputSet> = {};

  for (const concept of concepts) {
    const files: OutputSet = {};

    for (const format of formats) {
      switch (format) {
        case 'turtle':
          files.turtle = conceptToTurtle(concept, {
            uriBase: options.uriBase,
            registerId: options.registerId,
          });
          break;
        case 'jsonld': {
          const quads: Quad[] = [];
          for (const q of conceptToQuads(concept, {
            registerId: options.registerId,
            uriBase: options.uriBase,
          }) as Iterable<Quad>) {
            quads.push(q);
          }
          files.jsonld = await writeJsonld(quads);
          break;
        }
        case 'tbx':
          files.tbx = conceptsToTbx([concept], { registerId: options.registerId });
          break;
        case 'jsonl':
          files.jsonl = conceptsToJsonl([concept]);
          break;
        case 'yaml':
          files.yaml = conceptSerializer.toYaml(concept);
          break;
      }
    }

    if (Object.keys(files).length > 0) {
      out[concept.id] = files;
    }
  }

  return out;
}
