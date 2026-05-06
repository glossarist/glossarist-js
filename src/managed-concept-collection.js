import { ConceptCollection } from './concept-collection.js';
import { readConcepts, readRegister } from './concept-reader.js';
import { writeConcepts } from './concept-writer.js';
import { loadGcr } from './gcr-reader.js';
import { createGcr } from './gcr-writer.js';

export class ManagedConceptCollection {
  constructor() {
    this._concepts = new ConceptCollection();
    this._register = null;
  }

  get concepts() { return this._concepts; }
  get register() { return this._register; }

  loadFromDirectory(dir) {
    this._concepts = new ConceptCollection(readConcepts(dir));
    this._register = readRegister(dir);
    return this;
  }

  async loadFromGcr(input) {
    const pkg = await loadGcr(input);
    this._concepts = new ConceptCollection(await pkg.allConcepts());
    this._register = await pkg.register();
    return this;
  }

  saveToDirectory(dir, options = {}) {
    writeConcepts(dir, this._concepts, {
      register: this._register ?? undefined,
      format: options.format,
    });
  }

  async saveToGcr(options = {}) {
    return createGcr(this._concepts, options.metadata);
  }

  add(concept) {
    const existing = this._concepts.byId(concept.id);
    if (existing) {
      const idx = this._concepts.indexOf(existing);
      this._concepts.set(idx, concept);
    } else {
      this._concepts.push(concept);
    }
    return this;
  }

  remove(id) {
    const idx = this._concepts.findIndex(c => c.id === id);
    if (idx >= 0) this._concepts.splice(idx, 1);
    return this;
  }

  setRegister(data) {
    this._register = data;
    return this;
  }
}
