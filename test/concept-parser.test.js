import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptParser, conceptParser } from '../src/concept-parser.js';
import { Concept } from '../src/models/concept.js';
import { InvalidInputError, YamlParseError } from '../src/errors.js';

describe('ConceptParser', () => {
  describe('format detection', () => {
    it('detects canonical format (termid present)', () => {
      const p = new ConceptParser();
      const concept = p.parse('termid: "001"\neng:\n  terms:\n    - designation: test');
      assert.ok(concept instanceof Concept);
      assert.equal(concept.id, '001');
      assert.equal(concept.term, null);
    });

    it('detects canonical format with term', () => {
      const concept = conceptParser.parse('termid: "001"\nterm: alpha\neng:\n  terms:\n    - designation: alpha');
      assert.equal(concept.id, '001');
      assert.equal(concept.term, 'alpha');
    });

    it('detects managed format (data.identifier)', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts:',
        '    eng: uuid-a',
        'id: uuid-main',
        '---',
        'data:',
        '  terms:',
        '    - designation: entity',
        '  language_code: eng',
        'id: uuid-a',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.id, '3.1.1.1');
      assert.equal(concept.primaryDesignation('eng'), 'entity');
    });
  });

  describe('canonical format', () => {
    it('extracts localizations from language keys', () => {
      const raw = [
        'termid: "001"',
        'eng:',
        '  terms:',
        '    - designation: test',
        'fra:',
        '  terms:',
        '    - designation: test FR',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.deepEqual(concept.languages, ['eng', 'fra']);
      assert.equal(concept.primaryDesignation('eng'), 'test');
      assert.equal(concept.primaryDesignation('fra'), 'test FR');
    });

    it('stores raw document', () => {
      const concept = conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: test');
      assert.ok(concept.raw);
      assert.equal(concept.raw.termid, '001');
    });
  });

  describe('managed format', () => {
    it('parses multi-document YAML', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts:',
        '    eng: uuid-a',
        '    fra: uuid-b',
        'id: uuid-main',
        '---',
        'data:',
        '  definition:',
        '    - content: An entity',
        '  terms:',
        '    - designation: entity',
        '  sources:',
        '    - origin:',
        '        ref: ISO/TS 14812:2022',
        '      type: authoritative',
        '  language_code: eng',
        '  entry_status: valid',
        'id: uuid-a',
        '---',
        'data:',
        '  terms:',
        '    - designation: entité',
        '  language_code: fra',
        'id: uuid-b',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.id, '3.1.1.1');
      assert.equal(concept.languages.length, 2);
      assert.equal(concept.localization('eng').entryStatus, 'valid');
      assert.equal(concept.localization('eng').sources[0].origin.toString(), 'ISO/TS 14812:2022');
    });

    it('skips docs without language_code', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts: {}',
        'id: uuid-main',
        '---',
        'data:',
        '  terms:',
        '    - designation: entity',
        '  language_code: eng',
        'id: uuid-a',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.deepEqual(concept.languages, ['eng']);
    });
  });

  describe('error handling', () => {
    it('throws InvalidInputError for null', () => {
      assert.throws(() => conceptParser.parse(null), InvalidInputError);
    });

    it('throws InvalidInputError for empty string', () => {
      assert.throws(() => conceptParser.parse(''), InvalidInputError);
    });

    it('throws InvalidInputError for whitespace', () => {
      assert.throws(() => conceptParser.parse('   '), InvalidInputError);
    });

    it('throws InvalidInputError for non-string', () => {
      assert.throws(() => conceptParser.parse(42), InvalidInputError);
    });

    it('throws YamlParseError for invalid YAML', () => {
      assert.throws(() => conceptParser.parse(': [invalid', 'test-concept'), YamlParseError);
    });

    it('throws YamlParseError for empty document', () => {
      assert.throws(() => conceptParser.parse('---\nnull', 'test-concept'), YamlParseError);
    });

    it('includes context in error messages', () => {
      try {
        conceptParser.parse(': [invalid', 'my-concept.yaml');
      } catch (err) {
        assert.ok(err.message.includes('my-concept.yaml') || err.context === 'my-concept.yaml');
      }
    });
  });
});
