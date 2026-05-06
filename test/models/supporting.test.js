import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Citation } from '../../src/models/citation.js';
import { ConceptDate, DATE_TYPES } from '../../src/models/concept-date.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import { RelatedConcept, RELATIONSHIP_TYPES } from '../../src/models/related-concept.js';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
import { NonVerbRep } from '../../src/models/non-verb-rep.js';

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
    assert.equal(c.source, 'ISO 9000');
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

  it('round-trips via toJSON/fromJSON', () => {
    const c = new Citation({ source: { ref: 'ISO 9000' }, clause: '3.1' });
    const c2 = Citation.fromJSON(c.toJSON());
    assert.deepEqual(c.toJSON(), c2.toJSON());
    assert.ok(c.equals(c2));
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

  it('defaults to related type', () => {
    const rc = new RelatedConcept();
    assert.equal(rc.type, 'related');
  });

  it('RELATIONSHIP_TYPES is frozen', () => {
    assert.ok(RELATIONSHIP_TYPES.includes('supersedes'));
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
  it('stores image and sources', () => {
    const n = new NonVerbRep({ image: 'diagram.png', formula: 'E=mc^2' });
    assert.equal(n.image, 'diagram.png');
    assert.equal(n.formula, 'E=mc^2');
    assert.equal(n.table, null);
  });

  it('round-trips', () => {
    const n = new NonVerbRep({ image: 'x.png', sources: [{ ref: 'S' }] });
    assert.ok(n.equals(NonVerbRep.fromJSON(n.toJSON())));
  });
});
