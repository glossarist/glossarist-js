import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Designation, Expression, Abbreviation, Symbol, GraphicalSymbol,
} from '../../src/models/designation.js';

describe('Designation registry', () => {
  it('creates Expression for expression type', () => {
    const d = Designation.fromData({ type: 'expression', designation: 'test' });
    assert.ok(d instanceof Expression);
    assert.equal(d.designation, 'test');
  });

  it('creates Abbreviation for abbreviation type', () => {
    const d = Designation.fromData({ type: 'abbreviation', designation: 'abbr' });
    assert.ok(d instanceof Abbreviation);
  });

  it('creates Symbol for symbol type', () => {
    const d = Designation.fromData({ type: 'symbol', designation: 'Σ', international: 'yes' });
    assert.ok(d instanceof Symbol);
    assert.equal(d.international, 'yes');
  });

  it('creates GraphicalSymbol for graphical symbol type', () => {
    const d = Designation.fromData({ type: 'graphical symbol', designation: 'img', image: 'x.png' });
    assert.ok(d instanceof GraphicalSymbol);
    assert.equal(d.image, 'x.png');
  });

  it('falls back to base Designation for unknown type', () => {
    const d = Designation.fromData({ type: 'formula', designation: 'E=mc^2' });
    assert.equal(d.constructor, Designation);
    assert.equal(d.designation, 'E=mc^2');
  });

  it('returns same instance if already a Designation', () => {
    const e = new Expression({ designation: 'test' });
    assert.equal(Designation.fromData(e), e);
  });
});

describe('Expression', () => {
  it('stores extra linguistic fields', () => {
    const e = new Expression({
      designation: 'test',
      gender: 'm',
      plurality: 'singular',
      part_of_speech: 'noun',
      geographical_area: 'EU',
    });
    assert.equal(e.gender, 'm');
    assert.equal(e.plurality, 'singular');
    assert.equal(e.partOfSpeech, 'noun');
    assert.equal(e.geographicalArea, 'EU');
  });

  it('round-trips with all fields', () => {
    const e = new Expression({
      type: 'expression', designation: 'entity',
      normative_status: 'preferred',
      gender: 'f', plurality: 'plural',
    });
    const json = e.toJSON();
    assert.equal(json.type, 'expression');
    assert.equal(json.designation, 'entity');
    assert.equal(json.normative_status, 'preferred');
    assert.equal(json.gender, 'f');
    assert.equal(json.plurality, 'plural');

    const e2 = Expression.fromJSON(json);
    assert.ok(e.equals(e2));
  });
});

describe('Designation toJSON', () => {
  it('omits null normativeStatus', () => {
    const d = new Designation({ designation: 'test' });
    assert.equal(d.toJSON().normative_status, undefined);
  });

  it('includes normative_status when set', () => {
    const d = new Designation({ designation: 'test', normative_status: 'preferred' });
    assert.equal(d.toJSON().normative_status, 'preferred');
  });
});

describe('Open/Closed: custom designation type', () => {
  it('allows registering new types without modifying existing code', () => {
    class Formula extends Designation {
      constructor(data) {
        super(data);
        this.notation = data?.notation ?? null;
      }
      toJSON() {
        const obj = super.toJSON();
        if (this.notation) obj.notation = this.notation;
        return obj;
      }
      static fromJSON(data) { return new Formula(data); }
    }
    Designation.register('formula', Formula);

    const d = Designation.fromData({ type: 'formula', designation: 'E=mc^2', notation: 'latex' });
    assert.ok(d instanceof Formula);
    assert.equal(d.notation, 'latex');
    assert.equal(d.toJSON().type, 'formula');
  });
});
