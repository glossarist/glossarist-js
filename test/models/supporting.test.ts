import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Citation } from '../../src/models/citation.js';
import { ConceptRef } from '../../src/models/concept-ref.js';
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
  it('stores structured ref', () => {
    const c = new Citation({ ref: { source: 'ISO', id: '9000:2015' } });
    assert.ok(c.ref instanceof Citation.Ref);
    assert.equal(c.ref.source, 'ISO');
    assert.equal(c.ref.id, '9000:2015');
    assert.equal(c.toString(), 'ISO 9000:2015');
  });

  it('stores ref with version', () => {
    const c = new Citation({ ref: { source: 'ISO', id: '9000', version: '2015' } });
    assert.equal(c.ref.version, '2015');
  });

  it('handles null input', () => {
    const c = new Citation(null);
    assert.equal(c.ref, null);
    assert.equal(c.toString(), '');
  });

  it('handles undefined input', () => {
    const c = new Citation();
    assert.equal(c.ref, null);
  });

  it('stores locality', () => {
    const c = new Citation({
      ref: { source: 'ISO', id: '9001' },
      locality: { type: 'clause', reference_from: '3.1' },
    });
    assert.ok(c.locality instanceof Locality);
    assert.equal(c.locality.type, 'clause');
    assert.equal(c.locality.referenceFrom, '3.1');
  });

  it('round-trips via toJSON/fromJSON', () => {
    const c = new Citation({
      ref: { source: 'ISO', id: '9000' },
      locality: { type: 'clause', reference_from: '3.1' },
    });
    const c2 = Citation.fromJSON(c.toJSON());
    assert.deepEqual(c.toJSON(), c2.toJSON());
    assert.ok(c.equals(c2));
  });

  it('serializes ref as object', () => {
    const c = new Citation({ ref: { source: 'ISO', id: '9000' } });
    const json = c.toJSON();
    assert.deepEqual(json.ref, { source: 'ISO', id: '9000' });
  });
});

// --- Citation.Ref ---

describe('Citation.Ref', () => {
  it('stores source, id, version', () => {
    const r = new Citation.Ref({ source: 'IEC', id: '60050-121', version: '2020' });
    assert.equal(r.source, 'IEC');
    assert.equal(r.id, '60050-121');
    assert.equal(r.version, '2020');
  });

  it('round-trips', () => {
    const r = new Citation.Ref({ source: 'ISO', id: '9000' });
    const r2 = Citation.Ref.fromJSON(r.toJSON());
    assert.ok(r.equals(r2));
  });
});

// --- ConceptRef ---

describe('ConceptRef', () => {
  it('stores source and id', () => {
    const cr = new ConceptRef({ source: 'IEV', id: '103-01-02' });
    assert.equal(cr.source, 'IEV');
    assert.equal(cr.id, '103-01-02');
    assert.equal(cr.toString(), 'IEV 103-01-02');
  });

  it('round-trips', () => {
    const cr = new ConceptRef({ source: 'ISO', id: 'section-3-5' });
    const cr2 = ConceptRef.fromJSON(cr.toJSON());
    assert.ok(cr.equals(cr2));
    assert.deepEqual(cr.toJSON(), { source: 'ISO', id: 'section-3-5' });
  });

  it('handles partial data', () => {
    const cr = new ConceptRef({ source: 'IEV' });
    assert.equal(cr.id, null);
    assert.equal(cr.toString(), 'IEV');
  });

  it('stores text', () => {
    const cr = new ConceptRef({ source: 'IEV', id: '103-01-02', text: 'see also' });
    assert.equal(cr.text, 'see also');
    assert.equal(cr.toString(), 'IEV 103-01-02 (see also)');
  });

  it('round-trips with text', () => {
    const cr = new ConceptRef({ source: 'ISO', id: '9000', text: 'quality management' });
    const json = cr.toJSON();
    assert.equal(json.text, 'quality management');
    const cr2 = ConceptRef.fromJSON(json);
    assert.ok(cr.equals(cr2));
  });

  it('toString with text and no source/id', () => {
    const cr = new ConceptRef({ text: 'explanatory note' });
    assert.equal(cr.toString(), 'explanatory note');
  });

  it('omits text from toJSON when null', () => {
    const cr = new ConceptRef({ source: 'IEV', id: '103' });
    assert.equal(cr.toJSON().text, undefined);
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
    const s = new ConceptSource({ type: 'authoritative', origin: { ref: { source: 'ISO', id: '9000' } } });
    assert.equal(s.type, 'authoritative');
    assert.ok(s.origin instanceof Citation);
    assert.ok(s.origin.ref instanceof Citation.Ref);
    assert.equal(s.origin.ref.source, 'ISO');
    assert.equal(s.origin.ref.id, '9000');
  });

  it('round-trips through YAML-compatible structure', () => {
    const s = new ConceptSource({ type: 'authoritative', origin: { ref: { source: 'ISO/TS 14812', id: '2022' } } });
    const json = s.toJSON();
    assert.equal(json.type, 'authoritative');
    assert.deepEqual(json.origin.ref, { source: 'ISO/TS 14812', id: '2022' });
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
    // Content is normalized to localized hash form
    assert.deepEqual(rc.content, { default: '3.1.1.1' });
    assert.equal(rc.contentString, '3.1.1.1');
  });

  it('defaults to see type', () => {
    const rc = new RelatedConcept();
    assert.equal(rc.type, 'see');
  });

  it('wraps ref as ConceptRef', () => {
    const rc = new RelatedConcept({ type: 'broader', ref: { source: 'IEV', id: '103-01' } });
    assert.ok(rc.ref instanceof ConceptRef);
    assert.equal(rc.ref.source, 'IEV');
    assert.equal(rc.ref.id, '103-01');
  });

  it('serializes ref as ConceptRef', () => {
    const rc = new RelatedConcept({ type: 'see', ref: { source: 'ISO', id: '9000' } });
    const json = rc.toJSON();
    assert.deepEqual(json.ref, { source: 'ISO', id: '9000' });
  });

  it('RELATIONSHIP_TYPES includes all concept-level types', () => {
    assert.ok(RELATIONSHIP_TYPES.includes('broader_generic'));
    assert.ok(RELATIONSHIP_TYPES.includes('close_match'));
    assert.ok(RELATIONSHIP_TYPES.includes('sequentially_related_concept'));
    assert.ok(RELATIONSHIP_TYPES.includes('false_friend'));
    assert.ok(!RELATIONSHIP_TYPES.includes('abbreviated_form_for'));
    assert.ok(RELATIONSHIP_TYPES.length >= 25);
  });

  it('RELATIONSHIP_TYPES is frozen', () => {
    assert.throws(() => RELATIONSHIP_TYPES.push('x'));
  });
});

// --- DetailedDefinition ---

describe('DetailedDefinition', () => {
  it('stores content and sources', () => {
    const d = new DetailedDefinition({ content: 'A thing', sources: [{ ref: { source: 'ISO', id: '9000' } }] });
    assert.equal(d.content, 'A thing');
    assert.equal(d.sources.length, 1);
    assert.ok(d.sources[0] instanceof Citation);
  });

  it('round-trips', () => {
    const d = new DetailedDefinition({ content: 'test', sources: [{ ref: { source: 'X' } }] });
    assert.ok(d.equals(DetailedDefinition.fromJSON(d.toJSON())));
  });

  it('defaults examples to an empty array', () => {
    const d = new DetailedDefinition({ content: 'note' });
    assert.deepEqual(d.examples, []);
  });

  it('wraps raw examples as DetailedDefinition instances (recursive)', () => {
    const d = new DetailedDefinition({
      content: 'note with scoped examples',
      examples: [
        { content: 'first example' },
        { content: 'second example' },
      ],
    });
    assert.equal(d.examples.length, 2);
    assert.ok(d.examples[0] instanceof DetailedDefinition);
    assert.equal(d.examples[0].content, 'first example');
    assert.equal(d.examples[1].content, 'second example');
  });

  it('round-trips scoped examples inside a note', () => {
    const note = new DetailedDefinition({
      content: 'Resistance depends on dimensions and material.',
      examples: [
        { content: 'copper resistivity ≈ 1.68e-8 Ω·m at 20 °C' },
        { content: '1 m of 1 mm² copper wire ≈ 0.017 Ω' },
      ],
    });
    const roundTripped = DetailedDefinition.fromJSON(note.toJSON());
    assert.equal(roundTripped.content, note.content);
    assert.equal(roundTripped.examples.length, 2);
    assert.ok(roundTripped.examples[0] instanceof DetailedDefinition);
    assert.equal(roundTripped.examples[0].content, 'copper resistivity ≈ 1.68e-8 Ω·m at 20 °C');
    assert.equal(roundTripped.examples[1].content, '1 m of 1 mm² copper wire ≈ 0.017 Ω');
  });

  it('preserves examples nested inside examples', () => {
    const note = new DetailedDefinition({
      content: 'outer',
      examples: [
        {
          content: 'inner-note',
          examples: [{ content: 'innermost' }],
        },
      ],
    });
    const roundTripped = DetailedDefinition.fromJSON(note.toJSON());
    assert.equal(roundTripped.examples[0].content, 'inner-note');
    assert.equal(roundTripped.examples[0].examples[0].content, 'innermost');
  });

  it('omits examples from toJSON when empty', () => {
    const d = new DetailedDefinition({ content: 'just content' });
    const json = d.toJSON();
    assert.deepEqual(json, { content: 'just content' });
  });

  it('walkTexts yields own content with a path-rooted source', () => {
    const d = new DetailedDefinition({ content: 'hello' });
    const out = [...d.walkTexts('localizations.eng.notes[0]')];
    assert.deepEqual(out, [
      { text: 'hello', source: 'localizations.eng.notes[0].content' },
    ]);
  });

  it('walkTexts skips empty content but still descends into examples', () => {
    const d = new DetailedDefinition({
      content: '',
      examples: [{ content: 'inner' }],
    });
    const out = [...d.walkTexts('note')];
    assert.deepEqual(out, [{ text: 'inner', source: 'note.examples[0].content' }]);
  });

  it('walkTexts recurses through arbitrarily nested examples', () => {
    const d = new DetailedDefinition({
      content: 'outer',
      examples: [
        {
          content: 'mid',
          examples: [
            { content: 'deep' },
          ],
        },
      ],
    });
    const out = [...d.walkTexts('root')];
    assert.deepEqual(out, [
      { text: 'outer', source: 'root.content' },
      { text: 'mid', source: 'root.examples[0].content' },
      { text: 'deep', source: 'root.examples[0].examples[0].content' },
    ]);
  });

  it('walkTexts yields nothing for a content-less definition', () => {
    const d = new DetailedDefinition({});
    assert.deepEqual([...d.walkTexts('root')], []);
  });
});

// --- NonVerbRep ---

describe('NonVerbRep', () => {
  it('stores type and images', () => {
    const n = new NonVerbRep({
      type: 'image',
      images: [{ src: 'diagram.png', format: 'png' }],
      alt: { eng: 'A diagram' },
    });
    assert.equal(n.type, 'image');
    assert.equal(n.images[0].src, 'diagram.png');
    assert.equal(n.alt.eng, 'A diagram');
  });

  it('stores formula type', () => {
    const n = new NonVerbRep({ type: 'formula' });
    assert.equal(n.type, 'formula');
    assert.deepEqual(n.images, []);
  });

  it('round-trips', () => {
    const n = new NonVerbRep({
      type: 'image',
      images: [{ src: 'x.png', format: 'png' }],
      sources: [{ ref: { source: 'S' } }],
    });
    assert.ok(n.equals(NonVerbRep.fromJSON(n.toJSON())));
  });
});
