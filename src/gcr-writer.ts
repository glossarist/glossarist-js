import JSZip from 'jszip';
import { conceptSerializer } from './concept-serializer.js';
import { InvalidInputError } from './errors.js';
import { compiledPath, isKnownFormat } from './compiled-format.js';
import { GcrMetadata } from './models/gcr-metadata.js';
import { GcrStatistics } from './models/gcr-statistics.js';
import type { Concept } from './models/concept.js';
import type { ConceptFormat } from './concept-writer.js';

export interface GcrWriterOptions {
  concepts: Iterable<Concept>;
  metadata?: unknown;
  register?: unknown;
  format?: ConceptFormat;
  compiledFormats?: Record<string, Map<string, unknown> | Record<string, unknown>>;
  bibliography?: { toYAML?: () => string } | string;
  images?: Map<string, unknown> | Record<string, unknown>;
  uuidFn?: () => string;
}

export class GcrWriter {
  static async createBuffer(options: GcrWriterOptions): Promise<Uint8Array> {
    if (!options || !options.concepts || typeof options.concepts[Symbol.iterator] !== 'function') {
      throw new InvalidInputError(
        'GcrWriter requires { concepts: Concept[] }',
        'object with concepts array',
      );
    }

    const zip = new JSZip();
    const conceptsArr = Array.from(options.concepts);

    if (options.metadata) {
      const meta = GcrWriter._normalizeMetadata(options.metadata, conceptsArr);
      zip.file('metadata.yaml', conceptSerializer.toRegisterYaml(meta));
    }
    if (options.register) {
      zip.file('register.yaml', conceptSerializer.toRegisterYaml(options.register));
    }

    for (const concept of conceptsArr) {
      const y = options.format === 'canonical'
        ? conceptSerializer.toCanonicalYaml(concept)
        : options.format === 'managed'
          ? conceptSerializer.toManagedYaml(concept, options.uuidFn)
          : conceptSerializer.toYaml(concept, options.uuidFn);
      zip.file(`concepts/${concept.id}.yaml`, y);
    }

    if (options.compiledFormats) {
      GcrWriter._writeCompiledFormats(zip, options.compiledFormats);
    }

    if (options.bibliography) {
      const bib = options.bibliography;
      const yamlStr = typeof bib === 'string' ? bib : (bib.toYAML?.() ?? String(bib));
      zip.file('bibliography.yaml', yamlStr);
    }

    if (options.images) {
      GcrWriter._writeImages(zip, options.images);
    }

    return zip.generateAsync({ type: 'uint8array' });
  }

  static _normalizeMetadata(metadata: unknown, concepts: Concept[]): Record<string, unknown> {
    if (metadata instanceof GcrMetadata) {
      const meta = metadata.clone();
      const metaAny = meta as GcrMetadata & { statistics?: unknown; conceptCount?: number };
      if (!metaAny.statistics && concepts.length > 0) {
        metaAny.statistics = GcrStatistics.fromConcepts(concepts);
      }
      if (!metaAny.conceptCount) metaAny.conceptCount = concepts.length;
      return meta.toJSON() as Record<string, unknown>;
    }

    const data: Record<string, unknown> = { ...(metadata as Record<string, unknown>) };
    if (!data.statistics && concepts.length > 0) {
      data.statistics = GcrStatistics.fromConcepts(concepts).toJSON();
    }
    if (!data.concept_count && concepts.length > 0) {
      data.concept_count = concepts.length;
    }
    return data;
  }

  static _writeCompiledFormats(zip: JSZip, compiledFormats: Record<string, Map<string, unknown> | Record<string, unknown>>): void {
    for (const [format, entries] of Object.entries(compiledFormats)) {
      if (!isKnownFormat(format)) {
        throw new RangeError(`Unknown compiled format: ${format}`);
      }
      const map = entries instanceof Map ? entries : new Map(Object.entries(entries));
      for (const [id, content] of map) {
        zip.file(compiledPath(format, id), content as string);
      }
    }
  }

  static _writeImages(zip: JSZip, images: Map<string, unknown> | Record<string, unknown>): void {
    const map = images instanceof Map ? images : new Map(Object.entries(images));
    for (const [path, content] of map) {
      const fullPath = path.startsWith('images/') ? path : `images/${path}`;
      zip.file(fullPath, content as string);
    }
  }
}

export async function createGcr(concepts: Iterable<Concept>, metadata?: unknown): Promise<Uint8Array> {
  return GcrWriter.createBuffer({ concepts, metadata });
}
