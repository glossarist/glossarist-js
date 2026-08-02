import { RegistrableModel } from './registrable.js';
import { ConceptSource } from './concept-source.js';
import type { ConceptSourceJson } from './concept-source.js';

// P4 terminology alignment: NonVerbalEntity (which was ambiguous —
// "non-verbal designation" or "non-concept entity"?) is renamed to
// NonConceptEntity. This makes the categorical distinction clear:
//
//   NonConceptEntity  — Figure/Table/Formula (NOT a concept)
//   NonVerbRep        — a non-verbal designation of a concept (symbol `kg`)
//
// `NonVerbalEntity` remains as a deprecated alias for backward compat.

export interface NonConceptEntityJson {
  caption?: string | null;
  description?: string | null;
  alt?: string | null;
  sources?: ReadonlyArray<ConceptSourceJson | ConceptSource>;
  type?: string | null;
}

/** @deprecated Use NonConceptEntityJson. Kept for backward compat. */
export type NonVerbalEntityJson = NonConceptEntityJson;

export class NonConceptEntity extends RegistrableModel {
  readonly caption: string | null;
  readonly description: string | null;
  readonly alt: string | null;
  protected readonly _rawSources: ReadonlyArray<ConceptSourceJson | ConceptSource>;
  protected _sources: ReadonlyArray<ConceptSource> | null = null;

  constructor(data: NonConceptEntityJson = {}) {
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
    return 'NonConceptEntity';
  }

  findById(_targetId: string): NonConceptEntity | null {
    return null;
  }

  allIds(): string[] {
    return [];
  }

  override toJSON(): NonConceptEntityJson {
    const obj: NonConceptEntityJson = {};
    if (this.caption != null) obj.caption = this.caption;
    if (this.description != null) obj.description = this.description;
    if (this.alt != null) obj.alt = this.alt;
    this._serialize(obj as unknown as Record<string, unknown>, 'sources', '_sources', '_rawSources');
    return obj;
  }

  static override fromJSON(data: NonConceptEntityJson): NonConceptEntity {
    return NonConceptEntity.fromData(data);
  }
}

/**
 * @deprecated Use NonConceptEntity instead. The old name conflated
 * non-verbal designations (NonVerbRep — a concept designation like
 * symbol `kg`) with non-concept entities (Figure/Table/Formula —
 * standalone entities that are NOT concepts).
 */
export const NonVerbalEntity = NonConceptEntity;

/** @deprecated Use NonConceptEntity. Type alias for backward compat. */
export type NonVerbalEntity = NonConceptEntity;
