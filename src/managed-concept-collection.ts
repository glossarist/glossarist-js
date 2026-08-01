import { ConceptCollection } from './concept-collection.js';
import { readConcepts, readRegister } from './concept-reader.js';
import { writeConcepts } from './concept-writer.js';
import { loadGcr } from './gcr-reader.js';
import { GcrWriter } from './gcr-writer.js';
import { BibliographyData } from './models/bibliography-data.js';

export class ManagedConceptCollection {
  constructor() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._concepts = new ConceptCollection();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._register = null;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._bibliography = null;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._images = null;
  }

  // @ts-expect-error TODO(Phase 2e): type this fully
  get concepts() { return this._concepts; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get register() { return this._register; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get bibliography() { return this._bibliography; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get images() { return this._images; }

  loadFromDirectory(dir) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._concepts = new ConceptCollection(readConcepts(dir));
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._register = readRegister(dir);
    return this;
  }

  async loadFromGcr(input) {
    const pkg = await loadGcr(input);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._concepts = new ConceptCollection(await pkg.allConcepts());
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._register = await pkg.register();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._bibliography = await pkg.bibliography();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._images = await pkg.allImageFiles();
    return this;
  }

  saveToDirectory(dir, options = {}) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    writeConcepts(dir, this._concepts, {
      // @ts-expect-error TODO(Phase 2e): type this fully
      register: this._register ?? undefined,
      // @ts-expect-error TODO(Phase 2e): type this fully
      format: options.format,
    });
  }

  async saveToGcr(options = {}) {
    return GcrWriter.createBuffer({
      // @ts-expect-error TODO(Phase 2e): type this fully
      concepts: this._concepts,
      // @ts-expect-error TODO(Phase 2e): type this fully
      metadata: options.metadata,
      // @ts-expect-error TODO(Phase 2e): type this fully
      register: this._register,
      // @ts-expect-error TODO(Phase 2e): type this fully
      format: options.format,
      // @ts-expect-error TODO(Phase 2e): type this fully
      compiledFormats: options.compiledFormats,
      // @ts-expect-error TODO(Phase 2e): type this fully
      bibliography: this._bibliography,
      // @ts-expect-error TODO(Phase 2e): type this fully
      images: this._images,
    });
  }

  add(concept) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    const existing = this._concepts.byId(concept.id);
    if (existing) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      const idx = this._concepts.indexOf(existing);
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._concepts.set(idx, concept);
    } else {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._concepts.push(concept);
    }
    return this;
  }

  remove(id) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    const idx = this._concepts.findIndex(c => c.id === id);
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (idx >= 0) this._concepts.splice(idx, 1);
    return this;
  }

  setRegister(data) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._register = data;
    return this;
  }

  setBibliography(bib) {
    if (bib instanceof BibliographyData) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._bibliography = bib;
    } else if (typeof bib === 'string') {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._bibliography = BibliographyData.fromYAML(bib);
    } else if (bib == null) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._bibliography = null;
    } else {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._bibliography = new BibliographyData(bib);
    }
    return this;
  }

  setImages(images) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._images = images instanceof Map ? images : new Map(Object.entries(images));
    return this;
  }
}
