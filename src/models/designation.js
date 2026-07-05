import { RegistrableModel } from './registrable.js';
import { ConceptSource } from './concept-source.js';
import { Pronunciation } from './pronunciation.js';
import { GrammarInfo } from './grammar-info.js';
import { RelatedConcept } from './related-concept.js';
import { DesignationRelationship, DESIGNATION_RELATIONSHIP_TYPES } from './designation-relationship.js';

// Maps a normative-status local-name to the matching SKOS/SKOS-XL label
// predicate local-name. Lives on the model so a new status requires a
// single edit here, not edits in every emitter.
const SKOS_LABEL_BY_NORMATIVE_STATUS = Object.freeze({
  preferred: 'prefLabel',
  deprecated: 'hiddenLabel',
  admitted: 'altLabel',
  deprecated_: 'altLabel',
});

export class Designation extends RegistrableModel {
  constructor(data = {}) {
    super();
    this.designation = data.designation ?? '';
    this.type = data.type ?? 'expression';
    this.normativeStatus = data.normative_status ?? null;
    this.absent = data.absent ?? null;
    this.fieldOfApplication = data.field_of_application ?? null;
    this.usageInfo = data.usage_info ?? null;
    this.geographicalArea = data.geographical_area ?? null;
    this.language = data.language ?? null;
    this.script = data.script ?? null;
    this.system = data.system ?? null;
    this.international = data.international ?? null;
    this.termType = data.term_type ?? null;
    this.pronunciations = (data.pronunciation ?? []).map(
      p => p instanceof Pronunciation ? p : new Pronunciation(p)
    );
    this.sources = (data.sources ?? []).map(
      s => s instanceof ConceptSource ? s : new ConceptSource(s)
    );
    this.related = (data.related ?? []).map(
      r => (r instanceof DesignationRelationship || r instanceof RelatedConcept)
        ? r
        : DESIGNATION_RELATIONSHIP_TYPES.includes(r.type)
          ? DesignationRelationship.fromJSON(r)
          : RelatedConcept.fromJSON(r)
    );
  }

  toJSON() {
    const obj = { type: this.type, designation: this.designation };
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
    if (this.pronunciations.length > 0) obj.pronunciation = this.pronunciations.map(p => p.toJSON());
    if (this.sources.length > 0) obj.sources = this.sources.map(s => s.toJSON());
    if (this.related.length > 0) obj.related = this.related.map(r => r.toJSON());
    return obj;
  }

  // RDF class local-name for this designation subtype. Override in
  // subclasses that map to a different ontology class.
  rdfClass() {
    return 'Expression';
  }

  // SKOS label predicate URI (skos:prefLabel / skos:altLabel / skos:hiddenLabel)
  // appropriate for this designation's normative status. Falls back to
  // skos:altLabel for unknown statuses.
  skosLabelPredicate(skosNs) {
    const label = this._skosLabelLocalName();
    return `${skosNs}${label}`;
  }

  // SKOS-XL label predicate URI (skosxl:prefLabel / etc.).
  skosxlLabelPredicate(skosxlNs) {
    const label = this._skosLabelLocalName();
    return `${skosxlNs}${label}`;
  }

  _skosLabelLocalName() {
    const status = String(this.normativeStatus ?? '')
      .split(/[\/#]/)
      .pop()
      .trim();
    return SKOS_LABEL_BY_NORMATIVE_STATUS[status] ?? 'altLabel';
  }

  static fromJSON(data) {
    return Designation.fromData(data);
  }
}

export class Expression extends Designation {
  constructor(data = {}) {
    super(data);
    this.prefix = data.prefix ?? null;
    this.grammarInfo = (data.grammar_info ?? []).map(
      g => g instanceof GrammarInfo ? g : new GrammarInfo(g)
    );
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.prefix != null) obj.prefix = this.prefix;
    if (this.grammarInfo.length > 0) obj.grammar_info = this.grammarInfo.map(g => g.toJSON());
    return obj;
  }

  static fromJSON(data) { return new Expression(data); }
}

Designation.register('expression', Expression);

export class Abbreviation extends Expression {
  constructor(data = {}) {
    super(data);
    this.acronym = data.acronym ?? false;
    this.initialism = data.initialism ?? false;
    this.truncation = data.truncation ?? false;
  }

  rdfClass() {
    return 'Abbreviation';
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.acronym) obj.acronym = true;
    if (this.initialism) obj.initialism = true;
    if (this.truncation) obj.truncation = true;
    return obj;
  }

  static fromJSON(data) { return new Abbreviation(data); }
}

Designation.register('abbreviation', Abbreviation);

export class Symbol extends Designation {
  rdfClass() {
    return 'Symbol';
  }

  static fromJSON(data) { return new Symbol(data); }
}

Designation.register('symbol', Symbol);

export class LetterSymbol extends Symbol {
  constructor(data = {}) {
    super(data);
    this.text = data.text ?? null;
  }

  rdfClass() {
    return 'LetterSymbol';
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.text != null) obj.text = this.text;
    return obj;
  }

  static fromJSON(data) { return new LetterSymbol(data); }
}

Designation.register('letter_symbol', LetterSymbol);

export class GraphicalSymbol extends Symbol {
  constructor(data = {}) {
    super(data);
    this.text = data.text ?? null;
    this.image = data.image ?? null;
  }

  rdfClass() {
    return 'GraphicalSymbol';
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.text != null) obj.text = this.text;
    if (this.image != null) obj.image = this.image;
    return obj;
  }

  static fromJSON(data) { return new GraphicalSymbol(data); }
}

Designation.register('graphical symbol', GraphicalSymbol);
Designation.register('graphical_symbol', GraphicalSymbol);
