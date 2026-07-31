import { RegistrableModel } from './registrable.js';
import { ConceptSource } from './concept-source.js';
import type { ConceptSourceJson } from './concept-source.js';

export interface NonVerbalEntityJson {
  caption?: string | null;
  description?: string | null;
  alt?: string | null;
  sources?: ReadonlyArray<ConceptSourceJson | ConceptSource>;
  type?: string | null;
}

export class NonVerbalEntity extends RegistrableModel {
  readonly caption: string | null;
  readonly description: string | null;
  readonly alt: string | null;
  protected readonly _rawSources: ReadonlyArray<ConceptSourceJson | ConceptSource>;
  protected _sources: ReadonlyArray<ConceptSource> | null = null;

  constructor(data: NonVerbalEntityJson = {}) {
    super();
    this.caption = data.caption ?? null;
    this.description = data.description ?? null;
    this.alt = data.alt ?? null;
    this._rawSources = data.sources ?? [];
  }

  get sources(): ReadonlyArray<ConceptSource> {
    return this._lazy<ConceptSource>(
      '_sources',
      '_rawSources',
      (s) => (s instanceof ConceptSource ? s : new ConceptSource(s as ConceptSourceJson)),
    );
  }

  /**
   * Ontology class local-name. Subtypes override to return their specific
   * class (Figure/Table/Formula). Used by the RDF emitter so a new subtype
   * registers without editing the emitter (OCP).
   */
  rdfClass(): string {
    return 'NonVerbalEntity';
  }

  findById(_targetId: string): NonVerbalEntity | null {
    return null;
  }

  allIds(): string[] {
    return [];
  }

  override toJSON(): NonVerbalEntityJson {
    const obj: NonVerbalEntityJson = {};
    if (this.caption != null) obj.caption = this.caption;
    if (this.description != null) obj.description = this.description;
    if (this.alt != null) obj.alt = this.alt;
    this._serialize(obj as unknown as Record<string, unknown>, 'sources', '_sources', '_rawSources');
    return obj;
  }

  static override fromJSON(data: NonVerbalEntityJson): NonVerbalEntity {
    return NonVerbalEntity.fromData(data);
  }
}
