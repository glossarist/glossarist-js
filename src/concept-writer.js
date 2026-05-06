import fs from 'fs';
import path from 'path';
import { conceptSerializer } from './concept-serializer.js';
import { InvalidInputError } from './errors.js';

function assertDir(dir, fnName) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new InvalidInputError(`${fnName} requires a directory path`, 'non-empty string');
  }
}

export function writeConcept(dir, concept, format = 'auto') {
  assertDir(dir, 'writeConcept');
  if (!concept?.id) {
    throw new InvalidInputError('writeConcept requires a Concept with an id', 'Concept');
  }

  const y = format === 'canonical'
    ? conceptSerializer.toCanonicalYaml(concept)
    : format === 'managed'
      ? conceptSerializer.toManagedYaml(concept)
      : conceptSerializer.toYaml(concept);

  fs.writeFileSync(path.join(dir, `${concept.id}.yaml`), y, 'utf8');
}

export function writeConcepts(dir, concepts, options = {}) {
  assertDir(dir, 'writeConcepts');
  fs.mkdirSync(dir, { recursive: true });

  for (const concept of concepts) {
    writeConcept(dir, concept, options.format);
  }

  if (options.register) {
    fs.writeFileSync(
      path.join(dir, 'register.yaml'),
      conceptSerializer.toRegisterYaml(options.register),
      'utf8',
    );
  }
}
