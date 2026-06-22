import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { Concept } from './models/concept.js';
import { InvalidInputError } from './errors.js';

export class V1Reader {
  static isV1Directory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.some(e =>
      e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'concept.yaml'))
    );
  }

  static readConcept(conceptDir) {
    const conceptFile = path.join(conceptDir, 'concept.yaml');
    if (!fs.existsSync(conceptFile)) {
      throw new InvalidInputError(`No concept.yaml found in ${conceptDir}`);
    }

    const data = yaml.load(fs.readFileSync(conceptFile, 'utf8'));
    const localizations = {};

    for (const file of fs.readdirSync(conceptDir)) {
      if (file === 'concept.yaml' || !file.endsWith('.yaml')) continue;
      const lang = file.slice(0, -'.yaml'.length);
      localizations[lang] = yaml.load(fs.readFileSync(path.join(conceptDir, file), 'utf8'));
    }

    return new Concept({
      id: String(data.termid ?? data.data?.identifier ?? path.basename(conceptDir)),
      term: data.term ?? null,
      localizations,
      raw: data,
    });
  }

  static readAll(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const concepts = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const conceptDir = path.join(dir, entry.name);
      if (!fs.existsSync(path.join(conceptDir, 'concept.yaml'))) continue;
      try {
        concepts.push(V1Reader.readConcept(conceptDir));
      } catch { /* skip unreadable concepts */ }
    }

    return concepts;
  }
}

export async function migrateV1ToV2(v1Dir, v2Dir) {
  const concepts = V1Reader.readAll(v1Dir);
  const { writeConcept } = await import('./concept-writer.js');
  fs.mkdirSync(v2Dir, { recursive: true });

  for (const concept of concepts) {
    writeConcept(v2Dir, concept, 'canonical');
  }
}
