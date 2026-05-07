import JSZip from 'jszip';
import { conceptSerializer } from './concept-serializer.js';
import { InvalidInputError } from './errors.js';
import { compiledPath, isKnownFormat } from './compiled-format.js';

export class GcrWriter {
  static async createBuffer(options) {
    if (!options || !options.concepts || typeof options.concepts[Symbol.iterator] !== 'function') {
      throw new InvalidInputError(
        'GcrWriter requires { concepts: Concept[] }',
        'object with concepts array',
      );
    }

    const zip = new JSZip();

    if (options.metadata) {
      zip.file('metadata.yaml', conceptSerializer.toRegisterYaml(options.metadata));
    }
    if (options.register) {
      zip.file('register.yaml', conceptSerializer.toRegisterYaml(options.register));
    }

    for (const concept of options.concepts) {
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
      zip.file('bibliography.yaml', options.bibliography);
    }

    if (options.images) {
      GcrWriter._writeImages(zip, options.images);
    }

    return zip.generateAsync({ type: 'uint8array' });
  }

  static _writeCompiledFormats(zip, compiledFormats) {
    for (const [format, entries] of Object.entries(compiledFormats)) {
      if (!isKnownFormat(format)) {
        throw new RangeError(`Unknown compiled format: ${format}`);
      }
      const map = entries instanceof Map ? entries : new Map(Object.entries(entries));
      for (const [id, content] of map) {
        zip.file(compiledPath(format, id), content);
      }
    }
  }

  static _writeImages(zip, images) {
    const map = images instanceof Map ? images : new Map(Object.entries(images));
    for (const [path, content] of map) {
      const fullPath = path.startsWith('images/') ? path : `images/${path}`;
      zip.file(fullPath, content);
    }
  }
}

export async function createGcr(concepts, metadata) {
  return GcrWriter.createBuffer({ concepts, metadata });
}
