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
console.log('Done!');
