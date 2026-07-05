import { RegistrableModel } from './registrable.js';
import { ConceptSource } from './concept-source.js';

export class NonVerbalEntity extends RegistrableModel {
  constructor(data = {}) {
    super();
    this.caption = data.caption ?? null;
    this.description = data.description ?? null;
    this.alt = data.alt ?? null;
    this._rawSources = data.sources ?? [];
    this._sources = null;
  }

  get sources() {
    return this._lazy('_sources', '_rawSources',
      s => s instanceof ConceptSource ? s : new ConceptSource(s));
  }

  // Ontology class local-name. Subtypes override to return their specific
  // class (Figure/Table/Formula). Used by the RDF emitter so a new subtype
  // registers without editing the emitter (OCP).
  rdfClass() {
    return 'NonVerbalEntity';
  }

  findById(_targetId) {
    return null;
  }

  allIds() {
    return [];
  }

  toJSON() {
    const obj = {};
    if (this.caption != null) obj.caption = this.caption;
    if (this.description != null) obj.description = this.description;
    if (this.alt != null) obj.alt = this.alt;
    this._serialize(obj, 'sources', '_sources', '_rawSources');
    return obj;
  }

  static fromJSON(data) {
    return NonVerbalEntity.fromData(data);
  }
}
