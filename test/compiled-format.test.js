import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  COMPILED_EXTENSIONS,
  COMPILED_FORMATS,
  isKnownFormat,
  compiledFilename,
  compiledPath,
  parseCompiledPath,
} from '../src/compiled-format.js';
import { loadGcr } from '../src/gcr-reader.js';
import { GcrWriter } from '../src/gcr-writer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

// --- CompiledFormat registry ---

describe('CompiledFormat registry', () => {
  it('COMPILED_EXTENSIONS is a Map with correct entries', () => {
    assert.ok(COMPILED_EXTENSIONS instanceof Map);
    assert.equal(COMPILED_EXTENSIONS.get('tbx'), 'tbx.xml');
    assert.equal(COMPILED_EXTENSIONS.get('jsonld'), 'jsonld');
    assert.equal(COMPILED_EXTENSIONS.get('turtle'), 'ttl');
    assert.equal(COMPILED_EXTENSIONS.get('jsonl'), 'jsonl');
    assert.equal(COMPILED_EXTENSIONS.size, 4);
  });

  it('COMPILED_FORMATS is a frozen array of known formats', () => {
    assert.ok(Array.isArray(COMPILED_FORMATS));
    assert.ok(COMPILED_FORMATS.includes('tbx'));
    assert.ok(COMPILED_FORMATS.includes('jsonld'));
    assert.ok(COMPILED_FORMATS.includes('turtle'));
    assert.ok(COMPILED_FORMATS.includes('jsonl'));
    assert.throws(() => COMPILED_FORMATS.push('x'));
  });

  it('compiledFilename returns correct filename', () => {
    assert.equal(compiledFilename('tbx', 'glossary'), 'glossary.tbx.xml');
    assert.equal(compiledFilename('jsonld', '3.1.1.1'), '3.1.1.1.jsonld');
    assert.equal(compiledFilename('turtle', '001'), '001.ttl');
    assert.equal(compiledFilename('jsonl', '001'), '001.jsonl');
  });

  it('compiledFilename throws for unknown format', () => {
    assert.throws(() => compiledFilename('csv', '001'), RangeError);
  });

  it('compiledPath returns full ZIP path', () => {
    assert.equal(compiledPath('jsonld', '3.1.1.1'), 'compiled/jsonld/3.1.1.1.jsonld');
    assert.equal(compiledPath('tbx', 'glossary'), 'compiled/tbx/glossary.tbx.xml');
    assert.equal(compiledPath('turtle', '001'), 'compiled/turtle/001.ttl');
  });

  it('isKnownFormat returns true for known formats', () => {
    assert.equal(isKnownFormat('tbx'), true);
    assert.equal(isKnownFormat('jsonld'), true);
    assert.equal(isKnownFormat('turtle'), true);
    assert.equal(isKnownFormat('jsonl'), true);
    assert.equal(isKnownFormat('csv'), false);
    assert.equal(isKnownFormat(''), false);
  });

  it('parseCompiledPath extracts format and id from valid paths', () => {
    assert.deepEqual(parseCompiledPath('compiled/jsonld/3.1.1.1.jsonld'), { format: 'jsonld', id: '3.1.1.1' });
    assert.deepEqual(parseCompiledPath('compiled/tbx/glossary.tbx.xml'), { format: 'tbx', id: 'glossary' });
    assert.deepEqual(parseCompiledPath('compiled/turtle/001.ttl'), { format: 'turtle', id: '001' });
    assert.deepEqual(parseCompiledPath('compiled/jsonl/001.jsonl'), { format: 'jsonl', id: '001' });
  });

  it('parseCompiledPath returns null for non-compiled paths', () => {
    assert.equal(parseCompiledPath('concepts/001.yaml'), null);
    assert.equal(parseCompiledPath('metadata.yaml'), null);
    assert.equal(parseCompiledPath('compiled/'), null);
    assert.equal(parseCompiledPath('compiled/unknown/001.txt'), null);
    assert.equal(parseCompiledPath(''), null);
  });
});

// --- GcrPackage compiled format reading ---

describe('GcrPackage compiled formats', () => {
  let pkg;

  it('loads compiled.gcr fixture', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'compiled.gcr'));
    pkg = await loadGcr(buf);
    assert.ok(pkg);
  });

  it('lists compiled formats present', async () => {
    const formats = await pkg.compiledFormats();
    assert.deepEqual(formats.sort(), ['jsonld', 'tbx', 'turtle']);
  });

  it('lists entry IDs for jsonld', async () => {
    const ids = await pkg.compiledFormatIds('jsonld');
    assert.deepEqual(ids, ['001', '002']);
  });

  it('lists entry IDs for tbx (whole-document)', async () => {
    const ids = await pkg.compiledFormatIds('tbx');
    assert.deepEqual(ids, ['test-compiled']);
  });

  it('lists entry IDs for turtle', async () => {
    const ids = await pkg.compiledFormatIds('turtle');
    assert.deepEqual(ids, ['001', '002']);
  });

  it('returns empty array for absent format', async () => {
    const ids = await pkg.compiledFormatIds('jsonl');
    assert.deepEqual(ids, []);
  });

  it('hasCompiledFormat returns true for present formats', async () => {
    assert.equal(await pkg.hasCompiledFormat('tbx'), true);
    assert.equal(await pkg.hasCompiledFormat('jsonld'), true);
    assert.equal(await pkg.hasCompiledFormat('turtle'), true);
  });

  it('hasCompiledFormat returns false for absent formats', async () => {
    assert.equal(await pkg.hasCompiledFormat('jsonl'), false);
    assert.equal(await pkg.hasCompiledFormat('csv'), false);
  });

  it('reads a single jsonld file', async () => {
    const content = await pkg.compiledFile('jsonld', '001');
    assert.ok(content);
    const parsed = JSON.parse(content);
    assert.equal(parsed.notation, '001');
    assert.equal(parsed.prefLabel.eng, 'entity');
  });

  it('reads a single turtle file', async () => {
    const content = await pkg.compiledFile('turtle', '001');
    assert.ok(content);
    assert.ok(content.includes('skos:Concept'));
    assert.ok(content.includes('"entity"@eng'));
  });

  it('reads a tbx whole-document file', async () => {
    const content = await pkg.compiledFile('tbx', 'test-compiled');
    assert.ok(content);
    assert.ok(content.includes('conceptEntry'));
    assert.ok(content.includes('<term>entity</term>'));
  });

  it('returns null for missing compiled file', async () => {
    assert.equal(await pkg.compiledFile('jsonld', '999'), null);
    assert.equal(await pkg.compiledFile('jsonl', '001'), null);
  });

  it('reads compiled file as Uint8Array', async () => {
    const buf = await pkg.compiledFileBuffer('jsonld', '001');
    assert.ok(buf instanceof Uint8Array);
    const text = new TextDecoder().decode(buf);
    assert.ok(text.includes('"notation": "001"'));
  });

  it('returns null buffer for missing file', async () => {
    assert.equal(await pkg.compiledFileBuffer('jsonl', '001'), null);
  });

  it('iterates compiled files via eachCompiledFile', async () => {
    const entries = [];
    await pkg.eachCompiledFile('jsonld', (id, content) => {
      entries.push({ id, content });
    });
    assert.equal(entries.length, 2);
    assert.equal(entries[0].id, '001');
    assert.equal(entries[1].id, '002');
    assert.ok(entries[0].content.includes('entity'));
    assert.ok(entries[1].content.includes('function'));
  });

  it('loads all compiled files via allCompiledFiles', async () => {
    const map = await pkg.allCompiledFiles('turtle');
    assert.ok(map instanceof Map);
    assert.equal(map.size, 2);
    assert.ok(map.has('001'));
    assert.ok(map.has('002'));
    assert.ok(map.get('001').includes('entity'));
    assert.ok(map.get('002').includes('function'));
  });

  it('returns empty map for absent format', async () => {
    const map = await pkg.allCompiledFiles('jsonl');
    assert.ok(map instanceof Map);
    assert.equal(map.size, 0);
  });

  it('still reads concepts alongside compiled formats', async () => {
    const ids = await pkg.conceptIds();
    assert.deepEqual(ids, ['001', '002']);
    const c = await pkg.concept('001');
    assert.equal(c.termid, '001');
    assert.equal(c.localizations.eng.terms[0].designation, 'entity');
  });

  it('still reads metadata alongside compiled formats', async () => {
    const meta = await pkg.metadata();
    assert.equal(meta.shortname, 'test-compiled');
    assert.deepEqual(meta.compiled_formats, ['tbx', 'jsonld', 'turtle']);
  });
});

// --- GCR without compiled formats ---

describe('GcrPackage without compiled formats', () => {
  it('returns empty array from compiledFormats()', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    const formats = await pkg.compiledFormats();
    assert.deepEqual(formats, []);
  });

  it('hasCompiledFormat returns false', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    assert.equal(await pkg.hasCompiledFormat('tbx'), false);
  });

  it('compiledFile returns null', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    assert.equal(await pkg.compiledFile('jsonld', '001'), null);
  });
});

// --- GcrWriter with compiled formats ---

describe('GcrWriter with compiled formats', () => {
  it('writes compiled formats into GCR', async () => {
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test', schema_version: '1' },
      compiledFormats: {
        jsonld: { '001': '{"notation":"001"}', '002': '{"notation":"002"}' },
        tbx: { glossary: '<tbx>test</tbx>' },
      },
    });

    const pkg = await loadGcr(buf);
    const formats = await pkg.compiledFormats();
    assert.deepEqual(formats.sort(), ['jsonld', 'tbx']);

    const jsonld = await pkg.compiledFile('jsonld', '001');
    assert.equal(jsonld, '{"notation":"001"}');

    const tbx = await pkg.compiledFile('tbx', 'glossary');
    assert.equal(tbx, '<tbx>test</tbx>');
  });

  it('accepts Map entries for compiled formats', async () => {
    const turtleMap = new Map([['001', '@prefix skos: .'], ['002', '@prefix skos: .']]);
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test' },
      compiledFormats: { turtle: turtleMap },
    });

    const pkg = await loadGcr(buf);
    const map = await pkg.allCompiledFiles('turtle');
    assert.equal(map.size, 2);
    assert.equal(map.get('001'), '@prefix skos: .');
  });

  it('throws for unknown format', async () => {
    await assert.rejects(
      () => GcrWriter.createBuffer({
        concepts: [],
        compiledFormats: { csv: { '001': 'data' } },
      }),
      RangeError,
    );
  });

  it('works without compiledFormats option', async () => {
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test' },
    });
    const pkg = await loadGcr(buf);
    const formats = await pkg.compiledFormats();
    assert.deepEqual(formats, []);
  });
});
