import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Citation } from '../../src/models/citation.js';
import { ConceptDate, DATE_TYPES } from '../../src/models/concept-date.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import { RelatedConcept, RELATIONSHIP_TYPES } from '../../src/models/related-concept.js';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
import { NonVerbRep } from '../../src/models/non-verb-rep.js';
import { GrammarInfo } from '../../src/models/grammar-info.js';
import { Pronunciation } from '../../src/models/pronunciation.js';
import { Locality } from '../../src/models/locality.js';

// --- Citation ---

describe('Citation', () => {
  it('stores structured source', () => {
    const c = new Citation({ source: 'ISO 9000:2015' });
    assert.equal(c.source, 'ISO 9000:2015');
    assert.equal(c.toString(), 'ISO 9000:2015');
  });

  it('stores ref-based source', () => {
    const c = new Citation({ ref: 'ISO/TS 14812:2022' });
    assert.equal(c.ref, 'ISO/TS 14812:2022');
    assert.equal(c.toString(), 'ISO/TS 14812:2022');
  });

  it('handles plain string input', () => {
    const c = new Citation('ISO 9000');
    assert.equal(c.text, 'ISO 9000');
    assert.equal(c.toString(), 'ISO 9000');
  });

  it('handles null input', () => {
    const c = new Citation(null);
    assert.equal(c.source, null);
    assert.equal(c.toString(), '');
  });

  it('handles undefined input', () => {
    const c = new Citation();
    assert.equal(c.source, null);
  });

  it('isStructured returns true for object source', () => {
    const c = new Citation({ source: { ref: 'ISO 9000' } });
    assert.equal(c.isStructured, true);
  });

  it('isStructured returns false for string source', () => {
    const c = new Citation({ source: 'ISO 9000' });
    assert.equal(c.isStructured, false);
  });

  it('isStructured returns false for null source', () => {
    const c = new Citation();
    assert.equal(c.isStructured, false);
  });

  it('stores locality', () => {
    const c = new Citation({ source: 'ISO', id: '9001', locality: { type: 'clause', reference_from: '3.1' } });
    assert.ok(c.locality instanceof Locality);
    assert.equal(c.locality.type, 'clause');
    assert.equal(c.locality.referenceFrom, '3.1');
  });

  it('round-trips via toJSON/fromJSON', () => {
    const c = new Citation({ source: { ref: 'ISO 9000' }, clause: '3.1' });
    const c2 = Citation.fromJSON(c.toJSON());
    assert.deepEqual(c.toJSON(), c2.toJSON());
    assert.ok(c.equals(c2));
  });
});

// --- GrammarInfo ---

describe('GrammarInfo', () => {
  it('stores gender and number', () => {
    const gi = new GrammarInfo({ gender: 'm', number: 'singular', noun: true });
    assert.equal(gi.gender, 'm');
    assert.equal(gi.number, 'singular');
    assert.equal(gi.noun, true);
    assert.equal(gi.verb, false);
  });

  it('stores part_of_speech', () => {
    const gi = new GrammarInfo({ part_of_speech: 'noun' });
    assert.equal(gi.partOfSpeech, 'noun');
    const json = gi.toJSON();
    assert.equal(json.part_of_speech, 'noun');
  });

  it('round-trips', () => {
    const gi = new GrammarInfo({ gender: 'f', verb: true });
    const json = gi.toJSON();
    assert.equal(json.gender, 'f');
    assert.equal(json.verb, true);
    assert.equal(json.noun, undefined);
    assert.ok(gi.equals(GrammarInfo.fromJSON(json)));
  });
});

// --- Pronunciation ---

describe('Pronunciation', () => {
  it('stores content and system', () => {
    const p = new Pronunciation({ content: 'toːkjoː', system: 'IPA', language: 'jpn' });
    assert.equal(p.content, 'toːkjoː');
    assert.equal(p.system, 'IPA');
    assert.equal(p.language, 'jpn');
  });

  it('round-trips', () => {
    const p = new Pronunciation({ content: 'test', country: 'US' });
    assert.ok(p.equals(Pronunciation.fromJSON(p.toJSON())));
  });
});

// --- Locality ---

describe('Locality', () => {
  it('stores type and references', () => {
    const loc = new Locality({ type: 'clause', reference_from: '3.1', reference_to: '3.5' });
    assert.equal(loc.type, 'clause');
    assert.equal(loc.referenceFrom, '3.1');
    assert.equal(loc.referenceTo, '3.5');
  });

  it('round-trips with snake_case keys', () => {
    const loc = new Locality({ type: 'page', reference_from: '42' });
    const json = loc.toJSON();
    assert.equal(json.reference_from, '42');
    assert.ok(loc.equals(Locality.fromJSON(json)));
  });
});

// --- ConceptDate ---

describe('ConceptDate', () => {
  it('stores date and type', () => {
    const d = new ConceptDate({ date: '2020-01-01', type: 'accepted' });
    assert.equal(d.date, '2020-01-01');
    assert.equal(d.type, 'accepted');
    assert.ok(d.parsedDate instanceof Date);
  });

  it('defaults to null', () => {
    const d = new ConceptDate();
    assert.equal(d.date, null);
    assert.equal(d.type, null);
    assert.equal(d.parsedDate, null);
  });

  it('round-trips', () => {
    const d = new ConceptDate({ date: '2024-06-15', type: 'amended' });
    assert.ok(d.equals(ConceptDate.fromJSON(d.toJSON())));
  });

  it('DATE_TYPES is frozen', () => {
    assert.ok(Array.isArray(DATE_TYPES));
    assert.throws(() => DATE_TYPES.push('x'));
  });
});

// --- ConceptSource ---

describe('ConceptSource', () => {
  it('wraps origin as Citation', () => {
    const s = new ConceptSource({ type: 'authoritative', origin: { ref: 'ISO 9000' } });
    assert.equal(s.type, 'authoritative');
    assert.ok(s.origin instanceof Citation);
    assert.equal(s.origin.ref, 'ISO 9000');
  });

  it('round-trips through YAML-compatible structure', () => {
    const s = new ConceptSource({ type: 'authoritative', origin: { ref: 'ISO/TS 14812:2022' } });
    const json = s.toJSON();
    assert.equal(json.type, 'authoritative');
    assert.deepEqual(json.origin, { ref: 'ISO/TS 14812:2022' });
    assert.ok(s.equals(ConceptSource.fromJSON(json)));
  });

  it('handles missing origin', () => {
    const s = new ConceptSource({ type: 'adapted' });
    assert.equal(s.origin, null);
  });
});

// --- RelatedConcept ---

describe('RelatedConcept', () => {
  it('stores type and content', () => {
    const rc = new RelatedConcept({ type: 'supersedes', content: '3.1.1.1' });
    assert.equal(rc.type, 'supersedes');
    assert.equal(rc.content, '3.1.1.1');
  });

  it('defaults to see type', () => {
    const rc = new RelatedConcept();
    assert.equal(rc.type, 'see');
  });

  it('RELATIONSHIP_TYPES includes all 27+ types', () => {
    assert.ok(RELATIONSHIP_TYPES.includes('broader_generic'));
    assert.ok(RELATIONSHIP_TYPES.includes('close_match'));
    assert.ok(RELATIONSHIP_TYPES.includes('sequentially_related_concept'));
    assert.ok(RELATIONSHIP_TYPES.includes('false_friend'));
    assert.ok(RELATIONSHIP_TYPES.includes('abbreviated_form_for'));
    assert.ok(RELATIONSHIP_TYPES.length >= 27);
  });

  it('RELATIONSHIP_TYPES is frozen', () => {
    assert.throws(() => RELATIONSHIP_TYPES.push('x'));
  });
});

// --- DetailedDefinition ---

describe('DetailedDefinition', () => {
  it('stores content and sources', () => {
    const d = new DetailedDefinition({ content: 'A thing', sources: [{ ref: 'ISO 9000' }] });
    assert.equal(d.content, 'A thing');
    assert.equal(d.sources.length, 1);
    assert.ok(d.sources[0] instanceof Citation);
  });

  it('round-trips', () => {
    const d = new DetailedDefinition({ content: 'test', sources: [{ ref: 'X' }] });
    assert.ok(d.equals(DetailedDefinition.fromJSON(d.toJSON())));
  });
});

// --- NonVerbRep ---

describe('NonVerbRep', () => {
  it('stores type, ref, and text', () => {
    const n = new NonVerbRep({ type: 'image', ref: 'diagram.png', text: 'A diagram' });
    assert.equal(n.type, 'image');
    assert.equal(n.ref, 'diagram.png');
    assert.equal(n.text, 'A diagram');
  });

  it('stores formula type', () => {
    const n = new NonVerbRep({ type: 'formula', ref: 'E=mc^2' });
    assert.equal(n.type, 'formula');
    assert.equal(n.ref, 'E=mc^2');
  });

  it('round-trips', () => {
    const n = new NonVerbRep({ type: 'image', ref: 'x.png', sources: [{ ref: 'S' }] });
    assert.ok(n.equals(NonVerbRep.fromJSON(n.toJSON())));
  });
});
