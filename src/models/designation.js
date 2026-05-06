import { GlossaristModel } from './base.js';

export class Designation extends GlossaristModel {
  static _registry = new Map();

  static register(type, cls) {
    Designation._registry.set(type, cls);
  }

  static fromData(data) {
    if (data instanceof Designation) return data;
    const Cls = Designation._registry.get(data?.type) ?? Designation;
    return new Cls(data);
  }

  constructor(data = {}) {
    super();
    this.designation = data.designation ?? '';
    this.type = data.type ?? 'expression';
    this.normativeStatus = data.normative_status ?? null;
  }

  toJSON() {
    const obj = { type: this.type, designation: this.designation };
    if (this.normativeStatus != null) obj.normative_status = this.normativeStatus;
    return obj;
  }

  static fromJSON(data) {
    return Designation.fromData(data);
  }
}

export class Expression extends Designation {
  constructor(data = {}) {
    super(data);
    this.gender = data.gender ?? null;
    this.plurality = data.plurality ?? null;
    this.partOfSpeech = data.part_of_speech ?? null;
    this.geographicalArea = data.geographical_area ?? null;
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.gender != null) obj.gender = this.gender;
    if (this.plurality != null) obj.plurality = this.plurality;
    if (this.partOfSpeech != null) obj.part_of_speech = this.partOfSpeech;
    if (this.geographicalArea != null) obj.geographical_area = this.geographicalArea;
    return obj;
  }

  static fromJSON(data) { return new Expression(data); }
}

Designation.register('expression', Expression);

export class Abbreviation extends Designation {
  static fromJSON(data) { return new Abbreviation(data); }
}

Designation.register('abbreviation', Abbreviation);

export class Symbol extends Designation {
  constructor(data = {}) {
    super(data);
    this.international = data.international ?? null;
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.international != null) obj.international = this.international;
    return obj;
  }

  static fromJSON(data) { return new Symbol(data); }
}

Designation.register('symbol', Symbol);

export class GraphicalSymbol extends Designation {
  constructor(data = {}) {
    super(data);
    this.image = data.image ?? null;
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.image != null) obj.image = this.image;
    return obj;
  }

  static fromJSON(data) { return new GraphicalSymbol(data); }
}

Designation.register('graphical symbol', GraphicalSymbol);
Designation.register('graphical_symbol', GraphicalSymbol);
