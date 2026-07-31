import { RegistrableModel } from './registrable.js';
import { ConceptSource } from './concept-source.js';
import type { ConceptSourceJson } from './concept-source.js';
import { Pronunciation } from './pronunciation.js';
import type { PronunciationJson } from './pronunciation.js';
import { GrammarInfo } from './grammar-info.js';
import type { GrammarInfoJson } from './grammar-info.js';
import { RelatedConcept } from './related-concept.js';
import type { RelatedConceptJson } from './related-concept.js';
import {
  DesignationRelationship,
  DESIGNATION_RELATIONSHIP_TYPES,
} from './designation-relationship.js';
import type { DesignationRelationshipJson } from './designation-relationship.js';

export type DesignationType =
  | 'expression'
  | 'abbreviation'
  | 'symbol'
  | 'letter_symbol'
  | 'graphical symbol'
  | 'graphical_symbol'
  | string;

export type NormativeStatus = 'preferred' | 'deprecated' | 'admitted' | 'deprecated_' | string | null;

const SKOS_LABEL_BY_NORMATIVE_STATUS: Readonly<Record<string, string>> = Object.freeze({
  preferred: 'prefLabel',
  deprecated: 'hiddenLabel',
  admitted: 'altLabel',
  deprecated_: 'altLabel',
});

export interface DesignationJson {
  type?: DesignationType;
  designation?: string;
  normative_status?: NormativeStatus;
  normativeStatus?: NormativeStatus;
  absent?: boolean | null;
  field_of_application?: string | null;
  fieldOfApplication?: string | null;
  usage_info?: string | null;
  usageInfo?: string | null;
  geographical_area?: string | null;
  geographicalArea?: string | null;
  language?: string | null;
  script?: string | null;
  system?: string | null;
  international?: boolean | null;
  term_type?: string | null;
  termType?: string | null;
  pronunciation?: ReadonlyArray<PronunciationJson | Pronunciation>;
  sources?: ReadonlyArray<ConceptSourceJson | ConceptSource>;
  related?: ReadonlyArray<DesignationRelationshipJson | DesignationRelationship | RelatedConceptJson | RelatedConcept>;
  prefix?: string | null;
  grammar_info?: ReadonlyArray<GrammarInfoJson | GrammarInfo>;
  acronym?: boolean;
  initialism?: boolean;
  truncation?: boolean;
  text?: string | null;
  image?: string | null;
}

export class Designation extends RegistrableModel {
  readonly designation: string;
  readonly type: DesignationType;
  readonly normativeStatus: NormativeStatus;
  readonly absent: boolean | null;
  readonly fieldOfApplication: string | null;
  readonly usageInfo: string | null;
  readonly geographicalArea: string | null;
  readonly language: string | null;
  readonly script: string | null;
  readonly system: string | null;
  readonly international: boolean | null;
  readonly termType: string | null;
  readonly pronunciations: ReadonlyArray<Pronunciation>;
  readonly sources: ReadonlyArray<ConceptSource>;
  readonly related: ReadonlyArray<DesignationRelationship | RelatedConcept>;

  constructor(data: DesignationJson = {}) {
    super();
    this.designation = data.designation ?? '';
    this.type = data.type ?? 'expression';
    this.normativeStatus = data.normative_status ?? data.normativeStatus ?? null;
    this.absent = data.absent ?? null;
    this.fieldOfApplication = data.field_of_application ?? data.fieldOfApplication ?? null;
    this.usageInfo = data.usage_info ?? data.usageInfo ?? null;
    this.geographicalArea = data.geographical_area ?? data.geographicalArea ?? null;
    this.language = data.language ?? null;
    this.script = data.script ?? null;
    this.system = data.system ?? null;
    this.international = data.international ?? null;
    this.termType = data.term_type ?? data.termType ?? null;
    this.pronunciations = (data.pronunciation ?? []).map((p) =>
      p instanceof Pronunciation ? p : new Pronunciation(p as PronunciationJson),
    );
    this.sources = (data.sources ?? []).map((s) =>
      s instanceof ConceptSource ? s : new ConceptSource(s as ConceptSourceJson),
    );
    this.related = (data.related ?? []).map((r) => {
      if (r instanceof DesignationRelationship || r instanceof RelatedConcept) return r;
      const hash = r as { type?: string };
      if (hash?.type && DESIGNATION_RELATIONSHIP_TYPES.includes(hash.type)) {
        return DesignationRelationship.fromJSON(hash as DesignationRelationshipJson);
      }
      return RelatedConcept.fromJSON(hash as RelatedConceptJson);
    });
  }

  override toJSON(): DesignationJson {
    const obj: DesignationJson = { type: this.type, designation: this.designation };
    if (this.normativeStatus != null) obj.normative_status = this.normativeStatus;
    if (this.absent != null) obj.absent = this.absent;
    if (this.fieldOfApplication != null) obj.field_of_application = this.fieldOfApplication;
    if (this.usageInfo != null) obj.usage_info = this.usageInfo;
    if (this.geographicalArea != null) obj.geographical_area = this.geographicalArea;
    if (this.language != null) obj.language = this.language;
    if (this.script != null) obj.script = this.script;
    if (this.system != null) obj.system = this.system;
    if (this.international != null) obj.international = this.international;
    if (this.termType != null) obj.term_type = this.termType;
    if (this.pronunciations.length > 0) {
      obj.pronunciation = this.pronunciations.map((p) => p.toJSON());
    }
    if (this.sources.length > 0) {
      obj.sources = this.sources.map((s) => s.toJSON());
    }
    if (this.related.length > 0) {
      obj.related = this.related.map((r) => r.toJSON() as never);
    }
    return obj;
  }

  /** RDF class local-name for this designation subtype. */
  rdfClass(): string {
    return 'Expression';
  }

  /** SKOS label predicate URI appropriate for this designation's normative status. */
  skosLabelPredicate(skosNs: string): string {
    return `${skosNs}${this._skosLabelLocalName()}`;
  }

  /** SKOS-XL label predicate URI. */
  skosxlLabelPredicate(skosxlNs: string): string {
    return `${skosxlNs}${this._skosLabelLocalName()}`;
  }

  protected _skosLabelLocalName(): string {
    const statusVal = this.normativeStatus == null ? '' : String(this.normativeStatus);
    const status = statusVal
      .split(/[/#]/)
      .pop() ?? '';
    return SKOS_LABEL_BY_NORMATIVE_STATUS[status] ?? 'altLabel';
  }

  static identityOf(value: { type?: string; designation?: string } | null | undefined): string {
    const v = value ?? {};
    const type = v.type ?? 'expression';
    const text = String(v.designation ?? '').toLowerCase().trim();
    return `${type}|${text}`;
  }

  override identity(): string {
    return Designation.identityOf(this);
  }

  static override fromJSON(data: DesignationJson): Designation {
    return Designation.fromData(data);
  }
}

export class Expression extends Designation {
  readonly prefix: string | null;
  readonly grammarInfo: ReadonlyArray<GrammarInfo>;

  constructor(data: DesignationJson = {}) {
    super(data);
    this.prefix = data.prefix ?? null;
    this.grammarInfo = (data.grammar_info ?? []).map((g) =>
      g instanceof GrammarInfo ? g : new GrammarInfo(g as GrammarInfoJson),
    );
  }

  override toJSON(): DesignationJson {
    const obj = super.toJSON();
    if (this.prefix != null) obj.prefix = this.prefix;
    if (this.grammarInfo.length > 0) {
      obj.grammar_info = this.grammarInfo.map((g) => g.toJSON());
    }
    return obj;
  }

  static override fromJSON(data: DesignationJson): Expression {
    return new Expression(data);
  }
}

Designation.register('expression', Expression);

export class Abbreviation extends Expression {
  readonly acronym: boolean;
  readonly initialism: boolean;
  readonly truncation: boolean;

  constructor(data: DesignationJson = {}) {
    super(data);
    this.acronym = data.acronym ?? false;
    this.initialism = data.initialism ?? false;
    this.truncation = data.truncation ?? false;
  }

  override rdfClass(): string {
    return 'Abbreviation';
  }

  override toJSON(): DesignationJson {
    const obj = super.toJSON();
    if (this.acronym) obj.acronym = true;
    if (this.initialism) obj.initialism = true;
    if (this.truncation) obj.truncation = true;
    return obj;
  }

  static override fromJSON(data: DesignationJson): Abbreviation {
    return new Abbreviation(data);
  }
}

Designation.register('abbreviation', Abbreviation);

export class Symbol extends Designation {
  override rdfClass(): string {
    return 'Symbol';
  }

  static override fromJSON(data: DesignationJson): Symbol {
    return new Symbol(data);
  }
}

Designation.register('symbol', Symbol);

export class LetterSymbol extends Symbol {
  readonly text: string | null;

  constructor(data: DesignationJson = {}) {
    super(data);
    this.text = data.text ?? null;
  }

  override rdfClass(): string {
    return 'LetterSymbol';
  }

  override toJSON(): DesignationJson {
    const obj = super.toJSON();
    if (this.text != null) obj.text = this.text;
    return obj;
  }

  static override fromJSON(data: DesignationJson): LetterSymbol {
    return new LetterSymbol(data);
  }
}

Designation.register('letter_symbol', LetterSymbol);

export class GraphicalSymbol extends Symbol {
  readonly text: string | null;
  readonly image: string | null;

  constructor(data: DesignationJson = {}) {
    super(data);
    this.text = data.text ?? null;
    this.image = data.image ?? null;
  }

  override rdfClass(): string {
    return 'GraphicalSymbol';
  }

  override toJSON(): DesignationJson {
    const obj = super.toJSON();
    if (this.text != null) obj.text = this.text;
    if (this.image != null) obj.image = this.image;
    return obj;
  }

  static override fromJSON(data: DesignationJson): GraphicalSymbol {
    return new GraphicalSymbol(data);
  }
}

Designation.register('graphical symbol', GraphicalSymbol);
Designation.register('graphical_symbol', GraphicalSymbol);
