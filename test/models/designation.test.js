import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Designation, Expression, Abbreviation, Symbol, LetterSymbol, GraphicalSymbol,
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
    const d = Designation.fromData({ type: 'symbol', designation: 'Σ', international: true });
    assert.ok(d instanceof Symbol);
    assert.equal(d.international, true);
  });

  it('creates GraphicalSymbol for graphical symbol type', () => {
    const d = Designation.fromData({ type: 'graphical symbol', designation: 'img', image: 'x.png' });
    assert.ok(d instanceof GraphicalSymbol);
    assert.equal(d.image, 'x.png');
  });

  it('creates LetterSymbol for letter_symbol type', () => {
    const d = Designation.fromData({ type: 'letter_symbol', designation: 'R', text: 'R' });
    assert.ok(d instanceof LetterSymbol);
    assert.equal(d.text, 'R');
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
  it('stores grammar info and geographical area', () => {
    const e = new Expression({
      designation: 'test',
      geographical_area: 'EU',
      grammar_info: [{ gender: 'm', number: 'singular', noun: true }],
    });
    assert.equal(e.geographicalArea, 'EU');
    assert.equal(e.grammarInfo.length, 1);
    assert.equal(e.grammarInfo[0].gender, 'm');
    assert.equal(e.grammarInfo[0].number, 'singular');
    assert.equal(e.grammarInfo[0].noun, true);
  });

  it('round-trips with all fields', () => {
    const e = new Expression({
      type: 'expression', designation: 'entity',
      normative_status: 'preferred',
      grammar_info: [{ gender: 'f', number: 'plural' }],
    });
    const json = e.toJSON();
    assert.equal(json.type, 'expression');
    assert.equal(json.designation, 'entity');
    assert.equal(json.normative_status, 'preferred');
    assert.equal(json.grammar_info[0].gender, 'f');
    assert.equal(json.grammar_info[0].number, 'plural');

    const e2 = Expression.fromJSON(json);
    assert.ok(e.equals(e2));
  });
});

describe('Abbreviation', () => {
  it('stores abbreviation type booleans', () => {
    const a = new Abbreviation({
      designation: 'LED',
      acronym: true,
    });
    assert.equal(a.acronym, true);
    assert.equal(a.initialism, false);
    assert.equal(a.truncation, false);
    const json = a.toJSON();
    assert.equal(json.acronym, true);
    assert.equal(json.initialism, undefined);
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

  it('includes term_type when set', () => {
    const d = new Designation({ designation: 'test', term_type: 'full_form' });
    assert.equal(d.toJSON().term_type, 'full_form');
  });

  it('includes pronunciations', () => {
    const d = new Designation({
      designation: 'test',
      pronunciation: [{ content: 'IPA:tɛst', system: 'IPA' }],
    });
    assert.equal(d.pronunciations.length, 1);
    assert.equal(d.toJSON().pronunciation[0].content, 'IPA:tɛst');
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
