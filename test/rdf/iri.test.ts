// Tests for encodeIriPathSegment — the IRIREF-safe path-segment encoder.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeIriPathSegment } from '../../src/rdf/iri.js';

describe('encodeIriPathSegment', () => {
  it('percent-encodes spaces — the Turtle IRIREF failure mode', () => {
    assert.equal(encodeIriPathSegment('ISO/IEC 17000:2004'), 'ISO/IEC%2017000:2004');
    assert.equal(encodeIriPathSegment('OIML V 2-200:2012'), 'OIML%20V%202-200:2012');
  });

  it('encodes the remaining IRIREF-forbidden characters', () => {
    assert.equal(encodeIriPathSegment('a<b'), 'a%3Cb');
    assert.equal(encodeIriPathSegment('q"uote'), 'q%22uote');
    assert.equal(encodeIriPathSegment('{curly}'), '%7Bcurly%7D');
    assert.equal(encodeIriPathSegment('p|pe'), 'p%7Cpe');
    assert.equal(encodeIriPathSegment('c^aret'), 'c%5Earet');
    assert.equal(encodeIriPathSegment('back`tick'), 'back%60tick');
    assert.equal(encodeIriPathSegment('back\\slash'), 'back%5Cslash');
  });

  it('encodes C0 control characters as uppercase two-digit hex', () => {
    assert.equal(encodeIriPathSegment('a\tb'), 'a%09b');
    assert.equal(encodeIriPathSegment('a\nb'), 'a%0Ab');
  });

  it('is a no-op for identifiers that are already valid IRI segments', () => {
    assert.equal(encodeIriPathSegment('ref1'), 'ref1');
    assert.equal(encodeIriPathSegment('1.12'), '1.12');
    assert.equal(encodeIriPathSegment('image-01'), 'image-01');
    assert.equal(encodeIriPathSegment('ISO/IEC%2017000:2004'), 'ISO/IEC%2017000:2004');
  });
});
