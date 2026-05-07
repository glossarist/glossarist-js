import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DATASET_ASSETS,
  FILE_ASSETS,
  DIRECTORY_ASSETS,
  findFileAsset,
  findDirectoryAssetPath,
  isDatasetAssetPath,
} from '../src/dataset-asset.js';
import { loadGcr } from '../src/gcr-reader.js';
import { GcrWriter } from '../src/gcr-writer.js';
import { GcrMetadata } from '../src/models/gcr-metadata.js';
import { ManagedConceptCollection } from '../src/managed-concept-collection.js';
import { Concept } from '../src/models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

// --- DatasetAsset registry ---

describe('DatasetAsset registry', () => {
  it('DATASET_ASSETS includes bibliography and images', () => {
    assert.ok(DATASET_ASSETS.length >= 2);
    const paths = DATASET_ASSETS.map((a) => a.path);
    assert.ok(paths.includes('bibliography.yaml'));
    assert.ok(paths.includes('images'));
  });

  it('FILE_ASSETS filters to file type only', () => {
    assert.ok(FILE_ASSETS.every((a) => a.type === 'file'));
    assert.ok(FILE_ASSETS.some((a) => a.path === 'bibliography.yaml'));
  });

  it('DIRECTORY_ASSETS filters to directory type only', () => {
    assert.ok(DIRECTORY_ASSETS.every((a) => a.type === 'directory'));
    assert.ok(DIRECTORY_ASSETS.some((a) => a.path === 'images'));
  });

  it('findFileAsset matches exact path', () => {
    assert.equal(findFileAsset('bibliography.yaml')?.path, 'bibliography.yaml');
    assert.equal(findFileAsset('images'), undefined);
    assert.equal(findFileAsset('nonexistent.yaml'), undefined);
  });

  it('findDirectoryAssetPath matches directory prefix', () => {
    assert.equal(findDirectoryAssetPath('images')?.path, 'images');
    assert.equal(findDirectoryAssetPath('images/fig.png')?.path, 'images');
    assert.equal(findDirectoryAssetPath('images/sub/deep.png')?.path, 'images');
    assert.equal(findDirectoryAssetPath('bibliography.yaml'), undefined);
    assert.equal(findDirectoryAssetPath('concepts/001.yaml'), undefined);
  });

  it('isDatasetAssetPath detects known assets', () => {
    assert.equal(isDatasetAssetPath('bibliography.yaml'), true);
    assert.equal(isDatasetAssetPath('images'), true);
    assert.equal(isDatasetAssetPath('images/fig.png'), true);
    assert.equal(isDatasetAssetPath('concepts/001.yaml'), false);
    assert.equal(isDatasetAssetPath('metadata.yaml'), false);
  });
});

// --- GcrPackage dataset asset reading ---

describe('GcrPackage dataset assets', () => {
  let pkg;

  it('loads assets.gcr fixture', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'assets.gcr'));
    pkg = await loadGcr(buf);
    assert.ok(pkg);
  });

  it('reads bibliography as raw YAML string', async () => {
    const bib = await pkg.bibliography();
    assert.ok(bib);
    assert.ok(bib.includes('ISO_19111_2019'));
    assert.ok(bib.includes('ISO_8601_2019'));
  });

  it('hasImages returns true', async () => {
    assert.equal(await pkg.hasImages(), true);
  });

  it('lists image file names', async () => {
    const names = await pkg.imageFileNames();
    assert.deepEqual(names, ['images/diagrams/schema.svg', 'images/figure1.png']);
  });

  it('reads a single image file', async () => {
    const content = await pkg.imageFile('images/figure1.png');
    assert.ok(content instanceof Uint8Array);
    assert.equal(content[0], 0x89); // PNG header
  });

  it('reads image file without images/ prefix', async () => {
    const content = await pkg.imageFile('figure1.png');
    assert.ok(content instanceof Uint8Array);
    assert.equal(content[0], 0x89);
  });

  it('returns null for missing image', async () => {
    assert.equal(await pkg.imageFile('nonexistent.png'), null);
  });

  it('reads SVG image as text-like binary', async () => {
    const content = await pkg.imageFile('images/diagrams/schema.svg');
    assert.ok(content instanceof Uint8Array);
    const text = new TextDecoder().decode(content);
    assert.ok(text.includes('<svg'));
  });

  it('iterates images via eachImageFile', async () => {
    const entries = [];
    await pkg.eachImageFile((p, content) => {
      entries.push({ path: p, size: content.length });
    });
    assert.equal(entries.length, 2);
    assert.equal(entries[0].path, 'images/diagrams/schema.svg');
    assert.equal(entries[1].path, 'images/figure1.png');
  });

  it('loads all images via allImageFiles', async () => {
    const map = await pkg.allImageFiles();
    assert.ok(map instanceof Map);
    assert.equal(map.size, 2);
    assert.ok(map.has('images/figure1.png'));
    assert.ok(map.has('images/diagrams/schema.svg'));
  });

  it('still reads concepts alongside assets', async () => {
    const ids = await pkg.conceptIds();
    assert.deepEqual(ids, ['001']);
    const c = await pkg.concept('001');
    assert.equal(c.termid, '001');
    assert.equal(c.localizations.eng.terms[0].designation, 'latitude');
  });

  it('datasetAssetEntries discovers all assets', async () => {
    const entries = await pkg.datasetAssetEntries();
    assert.ok(entries.length >= 3);
    const paths = entries.map((e) => e.path);
    assert.ok(paths.includes('bibliography.yaml'));
    assert.ok(paths.some((p) => p.startsWith('images/')));
    const bibEntry = entries.find((e) => e.path === 'bibliography.yaml');
    assert.equal(bibEntry.type, 'file');
    const imgEntry = entries.find((e) => e.path.startsWith('images/'));
    assert.equal(imgEntry.type, 'directory');
  });

  it('metadata returns GcrMetadata instance', async () => {
    const meta = await pkg.metadata();
    assert.ok(meta instanceof GcrMetadata);
    assert.equal(meta.shortname, 'test-assets');
    assert.equal(meta.concept_count, 1);
    assert.equal(meta.conceptCount, 1);
  });
});

// --- GCR without dataset assets ---

describe('GcrPackage without dataset assets', () => {
  it('bibliography returns null', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    assert.equal(await pkg.bibliography(), null);
  });

  it('hasImages returns false', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    assert.equal(await pkg.hasImages(), false);
  });

  it('imageFileNames returns empty', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    assert.deepEqual(await pkg.imageFileNames(), []);
  });

  it('imageFile returns null', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'canonical.gcr'));
    const pkg = await loadGcr(buf);
    assert.equal(await pkg.imageFile('test.png'), null);
  });
});

// --- GcrWriter with dataset assets ---

describe('GcrWriter with dataset assets', () => {
  it('writes bibliography into GCR', async () => {
    const bib = 'ISO_9000:\n  type: standard\n  title: Quality management';
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test' },
      bibliography: bib,
    });

    const pkg = await loadGcr(buf);
    const readBib = await pkg.bibliography();
    assert.equal(readBib, bib);
  });

  it('writes images into GCR with object', async () => {
    const pngData = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test' },
      images: { 'figure.png': pngData, 'diagrams/x.svg': '<svg/>' },
    });

    const pkg = await loadGcr(buf);
    assert.equal(await pkg.hasImages(), true);
    const names = await pkg.imageFileNames();
    assert.deepEqual(names, ['images/diagrams/x.svg', 'images/figure.png']);

    const content = await pkg.imageFile('figure.png');
    assert.deepEqual(content, pngData);
  });

  it('writes images with Map', async () => {
    const map = new Map([['a.png', Uint8Array.from([1, 2, 3])]]);
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test' },
      images: map,
    });

    const pkg = await loadGcr(buf);
    const content = await pkg.imageFile('a.png');
    assert.deepEqual(content, Uint8Array.from([1, 2, 3]));
  });

  it('works without assets', async () => {
    const buf = await GcrWriter.createBuffer({
      concepts: [],
      metadata: { shortname: 'test' },
    });
    const pkg = await loadGcr(buf);
    assert.equal(await pkg.bibliography(), null);
    assert.equal(await pkg.hasImages(), false);
  });
});

// --- ManagedConceptCollection with assets ---

describe('ManagedConceptCollection with assets', () => {
  it('loads bibliography and images from GCR', async () => {
    const buf = fs.readFileSync(path.join(FIXTURES, 'assets.gcr'));
    const mcc = new ManagedConceptCollection();
    await mcc.loadFromGcr(buf);

    assert.equal(mcc.concepts.length, 1);
    assert.ok(mcc.bibliography);
    assert.ok(mcc.bibliography.includes('ISO_19111_2019'));
    assert.ok(mcc.images instanceof Map);
    assert.equal(mcc.images.size, 2);
  });

  it('round-trips assets through save/load GCR', async () => {
    const concept = new Concept({ id: '100', localizations: {} });
    const bib = 'STD_1:\n  title: Test Standard';
    const pngData = Uint8Array.from([0x89, 0x50]);

    const mcc = new ManagedConceptCollection();
    mcc.add(concept);
    mcc.setBibliography(bib);
    mcc.setImages({ 'test.png': pngData });

    const buf = await mcc.saveToGcr({ metadata: { shortname: 'roundtrip' } });

    const mcc2 = new ManagedConceptCollection();
    await mcc2.loadFromGcr(buf);

    assert.equal(mcc2.bibliography, bib);
    assert.ok(mcc2.images instanceof Map);
    assert.deepEqual(mcc2.images.get('images/test.png'), pngData);
  });

  it('setBibliography and setImages are chainable', () => {
    const mcc = new ManagedConceptCollection();
    const result = mcc.setBibliography('test').setImages({ 'x.png': new Uint8Array(0) });
    assert.ok(result instanceof ManagedConceptCollection);
  });
});
