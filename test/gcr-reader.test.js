import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGcr, parseConceptYaml, naturalSort } from '../src/gcr-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

// --- parseConceptYaml unit tests ---

describe('parseConceptYaml', () => {
  it('parses canonical format (single doc with termid)', () => {
    const raw = [
      'termid: "001"',
      'eng:',
      '  terms:',
      '    - type: expression',
      '      designation: first concept',
      '  definition:',
      '    - content: The first concept.',
      '  entry_status: valid',
    ].join('\n');

    const concept = parseConceptYaml(raw);
    assert.equal(concept.termid, '001');
    assert.ok(concept.localizations.eng);
    assert.equal(concept.localizations.eng.terms[0].designation, 'first concept');
    assert.equal(concept.localizations.eng.definition[0].content, 'The first concept.');
    assert.equal(concept.localizations.eng.entry_status, 'valid');
  });

  it('parses managed concept format (multi-doc)', () => {
    const raw = [
      '---',
      'data:',
      '  identifier: 3.1.1.1',
      '  localized_concepts:',
      '    eng: uuid-aaa',
      '    fra: uuid-bbb',
      'id: uuid-main',
      '---',
      'data:',
      '  definition:',
      '    - content: concrete or abstract thing',
      '  terms:',
      '    - type: expression',
      '      designation: entity',
      '  language_code: eng',
      '  entry_status: valid',
      'id: uuid-aaa',
      '---',
      'data:',
      '  definition:',
      '    - content: chose concrète ou abstraite',
      '  terms:',
      '    - type: expression',
      '      designation: entité',
      '  language_code: fra',
      '  entry_status: valid',
      'id: uuid-bbb',
    ].join('\n');

    const concept = parseConceptYaml(raw);
    assert.equal(concept.termid, '3.1.1.1');
    assert.ok(concept.localizations.eng);
    assert.ok(concept.localizations.fra);
    assert.equal(concept.localizations.eng.terms[0].designation, 'entity');
    assert.equal(concept.localizations.fra.terms[0].designation, 'entité');
    assert.equal(concept.localizations.eng.entry_status, 'valid');
    // language_code should be stripped from localization data
    assert.equal(concept.localizations.eng.language_code, undefined);
  });

  it('handles single-lang managed concept', () => {
    const raw = [
      '---',
      'data:',
      '  identifier: "003"',
      '  localized_concepts:',
      '    eng: uuid-ccc',
      'id: uuid-main',
      '---',
      'data:',
      '  terms:',
      '    - type: expression',
      '      designation: test',
      '  language_code: eng',
      '  entry_status: draft',
      'id: uuid-ccc',
    ].join('\n');

    const concept = parseConceptYaml(raw);
    assert.equal(concept.termid, '003');
    assert.ok(concept.localizations.eng);
    assert.equal(concept.localizations.eng.entry_status, 'draft');
    assert.equal(Object.keys(concept.localizations).length, 1);
  });
});

// --- naturalSort ---

describe('naturalSort', () => {
  it('sorts dotted numeric IDs naturally', () => {
    const ids = ['3.1.10.1', '3.1.1.2', '3.1.2.1', '3.1.1.1'];
    assert.deepEqual(ids.sort(naturalSort), ['3.1.1.1', '3.1.1.2', '3.1.2.1', '3.1.10.1']);
  });

  it('sorts dash-delimited IDs', () => {
    const ids = ['551-12-39', '551-2-1', '551-12-1'];
    assert.deepEqual(ids.sort(naturalSort), ['551-2-1', '551-12-1', '551-12-39']);
  });
});

// --- GCR package tests (canonical format) ---

describe('GcrPackage (canonical format)', () => {
  let pkg;

  it('loads from file', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    pkg = await loadGcr(buf);
    assert.ok(pkg);
  });

  it('reads metadata', async () => {
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'test-canonical');
    assert.equal(meta.version, '1.0.0');
    assert.equal(meta.concept_count, 3);
    assert.deepEqual(meta.languages, ['eng', 'fra']);
  });

  it('lists concept IDs', async () => {
    const ids = await pkg.conceptIds();
    assert.deepEqual(ids, ['001', '002', '003']);
  });

  it('reads a concept by ID', async () => {
    const c = await pkg.concept('001');
    assert.equal(c.termid, '001');
    assert.ok(c.localizations.eng);
    assert.ok(c.localizations.fra);
    assert.equal(c.localizations.eng.terms[0].designation, 'first concept');
    assert.equal(c.localizations.fra.terms[0].designation, 'premier concept');
  });

  it('reads concept with notes and examples', async () => {
    const c = await pkg.concept('002');
    assert.equal(c.termid, '002');
    assert.equal(c.localizations.eng.notes[0].content, 'A note about the second concept.');
    assert.equal(c.localizations.eng.examples[0].content, 'An example for the second concept.');
  });

  it('reads concept with draft status', async () => {
    const c = await pkg.concept('003');
    assert.equal(c.localizations.eng.entry_status, 'draft');
  });

  it('returns null for missing concept', async () => {
    const c = await pkg.concept('999');
    assert.equal(c, null);
  });

  it('iterates all concepts via eachConcept', async () => {
    const ids = [];
    await pkg.eachConcept((c) => { ids.push(c.termid); });
    assert.deepEqual(ids, ['001', '002', '003']);
  });

  it('loads all concepts via allConcepts', async () => {
    const all = await pkg.allConcepts();
    assert.equal(all.length, 3);
  });
});

// --- GCR package tests (managed concept format) ---

describe('GcrPackage (managed concept format)', () => {
  let pkg;

  it('loads from file', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'managed.gcr'));
    pkg = await loadGcr(buf);
    assert.ok(pkg);
  });

  it('reads metadata', async () => {
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'test-managed');
    assert.equal(meta.concept_count, 2);
  });

  it('reads register.yaml', async () => {
    const reg = await pkg.register();
    assert.ok(reg);
    assert.equal(reg.shortname, 'test-managed');
  });

  it('lists concept IDs', async () => {
    const ids = await pkg.conceptIds();
    assert.deepEqual(ids, ['3.1.1.1', '3.1.1.2']);
  });

  it('reads multi-lang concept', async () => {
    const c = await pkg.concept('3.1.1.1');
    assert.equal(c.termid, '3.1.1.1');
    assert.ok(c.localizations.eng);
    assert.ok(c.localizations.fra);
    assert.equal(c.localizations.eng.terms[0].designation, 'entity');
    assert.equal(c.localizations.eng.definition[0].content, 'concrete or abstract thing');
    assert.equal(c.localizations.fra.terms[0].designation, 'entité');
    assert.ok(c.localizations.eng.sources);
    assert.equal(c.localizations.eng.sources[0].type, 'authoritative');
  });

  it('reads single-lang concept', async () => {
    const c = await pkg.concept('3.1.1.2');
    assert.equal(c.termid, '3.1.1.2');
    assert.ok(c.localizations.eng);
    assert.equal(c.localizations.eng.terms[0].designation, 'function');
    assert.equal(c.localizations.eng.notes[0].content, 'A note about functions.');
    assert.equal(Object.keys(c.localizations).length, 1);
  });
});
