import { ConceptCollection } from './concept-collection.js';
import { readConcepts, readRegister } from './concept-reader.js';
import { writeConcepts, type ConceptFormat } from './concept-writer.js';
import { loadGcr } from './gcr-reader.js';
import { GcrWriter } from './gcr-writer.js';
import { BibliographyData } from './models/bibliography-data.js';
import type { Concept } from './models/concept.js';
import type { Register } from './models/register.js';

export class ManagedConceptCollection {
  private _concepts: ConceptCollection = new ConceptCollection();
  private _register: Register | null = null;
  private _bibliography: BibliographyData | null = null;
  private _images: Map<string, unknown> | null = null;

  get concepts(): ConceptCollection { return this._concepts; }
  get register(): Register | null { return this._register; }
  get bibliography(): BibliographyData | null { return this._bibliography; }
  get images(): Map<string, unknown> | null { return this._images; }

  loadFromDirectory(dir: string): this {
    this._concepts = new ConceptCollection(readConcepts(dir));
    this._register = readRegister(dir);
    return this;
  }

  async loadFromGcr(input: Buffer | ArrayBuffer | Uint8Array | Blob | string): Promise<this> {
    const pkg = await loadGcr(input);
    this._concepts = new ConceptCollection(await pkg.allConcepts());
    this._register = await pkg.register();
    this._bibliography = await pkg.bibliography();
    this._images = await pkg.allImageFiles();
    return this;
  }

  saveToDirectory(dir: string, options: { format?: ConceptFormat } = {}): void {
    writeConcepts(dir, this._concepts, {
      register: this._register ?? undefined,
      format: options.format,
    });
  }

  async saveToGcr(options: {
    metadata?: unknown;
    format?: ConceptFormat;
    compiledFormats?: Record<string, Map<string, unknown> | Record<string, unknown>>;
  } = {}): Promise<Uint8Array> {
    return GcrWriter.createBuffer({
      concepts: this._concepts,
      metadata: options.metadata,
      register: this._register,
      format: options.format,
      compiledFormats: options.compiledFormats,
      bibliography: this._bibliography ?? undefined,
      images: this._images ?? undefined,
    });
  }

  add(concept: Concept): this {
    const existing = this._concepts.byId(concept.id);
    if (existing) {
      const idx = this._concepts.indexOf(existing);
      this._concepts.set(idx, concept);
    } else {
      this._concepts.push(concept);
    }
    return this;
  }

  remove(id: string): this {
    const idx = this._concepts.findIndex(c => c.id === id);
    if (idx >= 0) this._concepts.splice(idx, 1);
    return this;
  }

  setRegister(data: Register | null): this {
    this._register = data;
    return this;
  }

  setBibliography(bib: BibliographyData | string | Record<string, unknown> | null): this {
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

  setImages(images: Map<string, unknown> | Record<string, unknown>): this {
    this._images = images instanceof Map ? images : new Map(Object.entries(images));
    return this;
  }
}
