import { ConceptCollection } from './concept-collection.js';
import { readConcepts, readRegister } from './concept-reader.js';
import { writeConcepts } from './concept-writer.js';
import { loadGcr } from './gcr-reader.js';
import { GcrWriter } from './gcr-writer.js';
import { BibliographyData } from './models/bibliography-data.js';

export class ManagedConceptCollection {
  constructor() {
    this._concepts = new ConceptCollection();
    this._register = null;
    this._bibliography = null;
    this._images = null;
  }

  get concepts() { return this._concepts; }
  get register() { return this._register; }
  get bibliography() { return this._bibliography; }
  get images() { return this._images; }

  loadFromDirectory(dir) {
    this._concepts = new ConceptCollection(readConcepts(dir));
    this._register = readRegister(dir);
    return this;
  }

  async loadFromGcr(input) {
    const pkg = await loadGcr(input);
    this._concepts = new ConceptCollection(await pkg.allConcepts());
    this._register = await pkg.register();
    this._bibliography = await pkg.bibliography();
    this._images = await pkg.allImageFiles();
    return this;
  }

  saveToDirectory(dir, options = {}) {
    writeConcepts(dir, this._concepts, {
      register: this._register ?? undefined,
      format: options.format,
    });
  }

  async saveToGcr(options = {}) {
    return GcrWriter.createBuffer({
      concepts: this._concepts,
      metadata: options.metadata,
      register: this._register,
      format: options.format,
      compiledFormats: options.compiledFormats,
      bibliography: this._bibliography,
      images: this._images,
    });
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

  setBibliography(bib) {
    if (bib instanceof BibliographyData) {
      this._bibliography = bib;
    } else if (typeof bib === 'string') {
      this._bibliography = BibliographyData.fromYAML(bib);
    } else if (bib == null) {
      this._bibliography = null;
    } else {
      this._bibliography = new BibliographyData(bib);
    }
    return this;
  }

  setImages(images) {
    this._images = images instanceof Map ? images : new Map(Object.entries(images));
    return this;
  }
}
