// Builds test fixture GCR ZIP files in both canonical and managed formats.
// Run: node test/fixtures/build-fixtures.js

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildCanonicalGcr() {
  const zip = new JSZip();

  zip.file('metadata.yaml', [
    'shortname: test-canonical',
    'version: 1.0.0',
    'title: Test Canonical Dataset',
    'concept_count: 3',
    'languages:',
    '  - eng',
    '  - fra',
    'schema_version: "1"',
    'glossarist_version: 2.5.2',
    'created_at: 2026-01-01T00:00:00Z',
    'statistics:',
    '  total_concepts: 3',
    '  concepts_with_definitions: 3',
    '  concepts_by_status:',
    '    valid: 3',
  ].join('\n'));

  // Canonical format: single doc per file, termid + language keys
  zip.file('concepts/001.yaml', [
    'termid: "001"',
    'term: first concept',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: first concept',
    '  definition:',
    '    - content: The first test concept.',
    '  entry_status: valid',
    'fra:',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: premier concept',
    '  definition:',
    '    - content: Le premier concept de test.',
    '  entry_status: valid',
  ].join('\n'));

  zip.file('concepts/002.yaml', [
    'termid: "002"',
    'term: second concept',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: second concept',
    '  definition:',
    '    - content: The second test concept.',
    '  notes:',
    '    - content: A note about the second concept.',
    '  examples:',
    '    - content: An example for the second concept.',
    '  entry_status: valid',
  ].join('\n'));

  zip.file('concepts/003.yaml', [
    'termid: "003"',
    'term: third concept',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: third concept',
    '  definition:',
    '    - content: The third test concept.',
    '  entry_status: draft',
  ].join('\n'));

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(__dirname, 'canonical.gcr'), buf);
  console.log('Created canonical.gcr');
}

async function buildManagedGcr() {
  const zip = new JSZip();

  zip.file('metadata.yaml', [
    'shortname: test-managed',
    'version: 1.0.0',
    'title: Test Managed Dataset',
    'concept_count: 2',
    'languages:',
    '  - eng',
    '  - fra',
    'schema_version: "1"',
    'glossarist_version: 2.5.2',
    'created_at: 2026-01-01T00:00:00Z',
    'statistics:',
    '  total_concepts: 2',
    '  concepts_with_definitions: 2',
    '  concepts_by_status:',
    '    valid: 2',
  ].join('\n'));

  zip.file('register.yaml', [
    'schema_version: "1"',
    'shortname: test-managed',
  ].join('\n'));

  // Managed concept format: multi-doc YAML per file
  zip.file('concepts/3.1.1.1.yaml', [
    '---',
    'data:',
    '  identifier: 3.1.1.1',
    '  localized_concepts:',
    '    eng: aaaaaaaa-1111-5555-aaaa-aaaaaaaaaaaa',
    '    fra: bbbbbbbb-2222-5555-bbbb-bbbbbbbbbbbb',
    '  domains:',
    '    - concept_id: area-103',
    '      ref_type: domain',
    '    - concept_id: section-103-01',
    '      ref_type: domain',
    'id: cccccccc-3333-5555-cccc-cccccccccccc',
    '---',
    'data:',
    '  definition:',
    '    - content: concrete or abstract thing',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: entity',
    '  sources:',
    '    - origin:',
    '        ref: ISO/TS 14812:2022',
    '      type: authoritative',
    '  language_code: eng',
    '  entry_status: valid',
    '  domain: section-103-01',
    'id: aaaaaaaa-1111-5555-aaaa-aaaaaaaaaaaa',
    '---',
    'data:',
    '  definition:',
    '    - content: chose concrète ou abstraite',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: entité',
    '  language_code: fra',
    '  entry_status: valid',
    '  domain: section-103-01',
    'id: bbbbbbbb-2222-5555-bbbb-bbbbbbbbbbbb',
  ].join('\n'));

  zip.file('concepts/3.1.1.2.yaml', [
    '---',
    'data:',
    '  identifier: 3.1.1.2',
    '  localized_concepts:',
    '    eng: dddddddd-4444-5555-dddd-dddddddddddd',
    'id: eeeeeeee-5555-5555-eeee-eeeeeeeeeeee',
    '---',
    'data:',
    '  definition:',
    '    - content: action or activity that can be performed',
    '  terms:',
    '    - type: expression',
    '      normative_status: preferred',
    '      designation: function',
    '  notes:',
    '    - content: A note about functions.',
    '  language_code: eng',
    '  entry_status: valid',
    'id: dddddddd-4444-5555-dddd-dddddddddddd',
  ].join('\n'));

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(__dirname, 'managed.gcr'), buf);
  console.log('Created managed.gcr');
}

await buildCanonicalGcr();
await buildManagedGcr();
await buildCompiledGcr();
await buildAssetsGcr();
console.log('Done!');

async function buildCompiledGcr() {
  const zip = new JSZip();

  zip.file('metadata.yaml', [
    'shortname: test-compiled',
    'version: 1.0.0',
    'title: Test Dataset with Compiled Formats',
    'concept_count: 2',
    'languages:',
    '  - eng',
    'schema_version: "1"',
    'glossarist_version: 2.5.2',
    'created_at: 2026-01-01T00:00:00Z',
    'compiled_formats:',
    '  - tbx',
    '  - jsonld',
    '  - turtle',
  ].join('\n'));

  // Concepts in canonical format
  zip.file('concepts/001.yaml', [
    'termid: "001"',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      designation: entity',
    '  definition:',
    '    - content: A concrete or abstract thing.',
    '  entry_status: valid',
  ].join('\n'));

  zip.file('concepts/002.yaml', [
    'termid: "002"',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      designation: function',
    '  definition:',
    '    - content: An action or activity.',
    '  entry_status: valid',
  ].join('\n'));

  // TBX: single whole-document file
  zip.file('compiled/tbx/test-compiled.tbx.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<tbx style="dca" type="TBX-Basic" xml:lang="en">',
    '  <tbxHeader>',
    '    <fileDesc><titleStmt><title>Test Compiled Dataset</title></titleStmt></fileDesc>',
    '  </tbxHeader>',
    '  <text>',
    '    <body>',
    '      <conceptEntry id="c001">',
    '        <langSec xml:lang="en">',
    '          <tig>',
    '            <term>entity</term>',
    '          </tig>',
    '        </langSec>',
    '      </conceptEntry>',
    '      <conceptEntry id="c002">',
    '        <langSec xml:lang="en">',
    '          <tig>',
    '            <term>function</term>',
    '          </tig>',
    '        </langSec>',
    '      </conceptEntry>',
    '    </body>',
    '  </text>',
    '</tbx>',
  ].join('\n'));

  // JSON-LD: per-concept files
  zip.file('compiled/jsonld/001.jsonld', JSON.stringify({
    '@context': { skos: 'http://www.w3.org/2004/02/skos/core#', dcterms: 'http://purl.org/dc/terms/' },
    '@id': 'https://glossarist.org/concept/001',
    '@type': 'skos:Concept',
    notation: '001',
    prefLabel: { eng: 'entity' },
    definition: { eng: 'A concrete or abstract thing.' },
  }, null, 2));

  zip.file('compiled/jsonld/002.jsonld', JSON.stringify({
    '@context': { skos: 'http://www.w3.org/2004/02/skos/core#', dcterms: 'http://purl.org/dc/terms/' },
    '@id': 'https://glossarist.org/concept/002',
    '@type': 'skos:Concept',
    notation: '002',
    prefLabel: { eng: 'function' },
    definition: { eng: 'An action or activity.' },
  }, null, 2));

  // Turtle: per-concept files
  zip.file('compiled/turtle/001.ttl', [
    '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
    '@prefix dcterms: <http://purl.org/dc/terms/> .',
    '',
    '<https://glossarist.org/concept/001> a skos:Concept ;',
    '  skos:notation "001" ;',
    '  skos:prefLabel "entity"@eng ;',
    '  skos:definition "A concrete or abstract thing."@eng .',
  ].join('\n'));

  zip.file('compiled/turtle/002.ttl', [
    '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
    '@prefix dcterms: <http://purl.org/dc/terms/> .',
    '',
    '<https://glossarist.org/concept/002> a skos:Concept ;',
    '  skos:notation "002" ;',
    '  skos:prefLabel "function"@eng ;',
    '  skos:definition "An action or activity."@eng .',
  ].join('\n'));

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(__dirname, 'compiled.gcr'), buf);
  console.log('Created compiled.gcr');
}

async function buildAssetsGcr() {
  const zip = new JSZip();

  zip.file('metadata.yaml', [
    'shortname: test-assets',
    'version: 1.0.0',
    'title: Test Dataset with Assets',
    'concept_count: 1',
    'languages:',
    '  - eng',
    'schema_version: "1"',
    'glossarist_version: 2.6.1',
    'created_at: 2026-01-01T00:00:00Z',
  ].join('\n'));

  zip.file('concepts/001.yaml', [
    'termid: "001"',
    'eng:',
    '  terms:',
    '    - type: expression',
    '      designation: latitude',
    '  definition:',
    '    - content: Angular distance from the equatorial plane.',
    '  entry_status: valid',
  ].join('\n'));

  // Bibliography
  zip.file('bibliography.yaml', [
    'ISO_19111_2019:',
    '  type: standard',
    '  title: Geographic information — Referencing by coordinates',
    'ISO_8601_2019:',
    '  type: standard',
    '  title: Date and time — Representations for information interchange',
  ].join('\n'));

  // Images
  const pngHeader = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  zip.file('images/figure1.png', pngHeader);

  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
  zip.file('images/diagrams/schema.svg', svgContent);

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(__dirname, 'assets.gcr'), buf);
  console.log('Created assets.gcr');
}
