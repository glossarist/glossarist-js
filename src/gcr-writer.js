import JSZip from 'jszip';
import { conceptSerializer } from './concept-serializer.js';
import { InvalidInputError } from './errors.js';

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

    return zip.generateAsync({ type: 'uint8array' });
  }
}

export async function createGcr(concepts, metadata) {
  return GcrWriter.createBuffer({ concepts, metadata });
}
