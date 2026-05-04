# glossarist-js

JavaScript library for reading [Glossarist](https://github.com/glossarist) GCR packages (ZIP archives) and v2 glossarist concept data (YAML files).

## Install

```bash
npm install glossarist
```

## Usage

### Reading a GCR package

```js
import { loadGcr } from 'glossarist';
import fs from 'fs';

const buf = fs.readFileSync('my-dataset.gcr');
const pkg = await loadGcr(buf);

// Metadata
const meta = await pkg.metadata();
console.log(meta.shortname, meta.version, meta.concept_count);

// List concept IDs
const ids = await pkg.conceptIds();

// Read a specific concept
const concept = await pkg.concept('3.1.1.1');
console.log(concept.termid);
console.log(concept.localizations.eng.terms[0].designation);

// Iterate all concepts (streaming)
await pkg.eachConcept((concept) => {
  console.log(concept.termid);
});
```

### Reading concept YAML files from a directory

```js
import { readConcepts, readConcept, listConceptIds } from 'glossarist';

// Read all concepts
const concepts = readConcepts('./geolexica-v2/');
console.log(`Loaded ${concepts.length} concepts`);

// Read a single concept by ID
const concept = readConcept('./geolexica-v2/', '3.1.1.1');

// List IDs with optional prefix filter
const ids = listConceptIds('./geolexica-v2/', '3.1.');
```

### Concept format

Glossarist-js normalizes both storage formats into a consistent structure:

```js
{
  termid: '3.1.1.1',           // concept identifier
  term: 'entity',               // primary term (canonical format only)
  localizations: {
    eng: {
      terms: [{ type: 'expression', designation: 'entity', normative_status: 'preferred' }],
      definition: [{ content: 'concrete or abstract thing...' }],
      notes: [],
      examples: [],
      sources: [{ type: 'authoritative', origin: { ref: 'ISO/TS 14812:2022' } }],
      entry_status: 'valid',
    },
    fra: { ... },
  },
  raw: { ... },                 // original parsed YAML
}
```

### Supported formats

The library transparently handles both GCR concept formats:

| Format | Structure | Used by |
|--------|-----------|---------|
| **Canonical** | Single YAML document with `termid` and language keys (`eng:`, `fra:`) | IEV (iec-electropedia) |
| **Managed concept** | Multi-document YAML: first doc has `data.identifier` + `data.localized_concepts`, subsequent docs have localized data with `data.language_code` | isotc204, isotc211, osgeo |

## API

### GCR Package (`gcr-reader.js`)

- `loadGcr(input)` — Load a GCR ZIP from Buffer/ArrayBuffer/Uint8Array/Blob/base64 string. Returns `GcrPackage`.
- `GcrPackage#metadata()` — Parse `metadata.yaml`.
- `GcrPackage#register()` — Parse optional `register.yaml`.
- `GcrPackage#conceptIds()` — Array of concept IDs (natural-sorted).
- `GcrPackage#concept(id)` — Read and normalize a single concept.
- `GcrPackage#eachConcept(callback)` — Stream all concepts.
- `GcrPackage#allConcepts()` — Load all concepts into an array.
- `parseConceptYaml(raw)` — Parse raw YAML string into normalized concept object.
- `naturalSort(a, b)` — Natural sort comparator for concept IDs.

### Concept Directory Reader (`concept-reader.js`)

Node.js only (uses `fs`).

- `readConcepts(dir)` — Read all concept YAML files from a directory.
- `readConcept(dir, id)` — Read a single concept by ID.
- `listConceptIds(dir, prefix?)` — List concept IDs, optionally filtered by prefix.
- `readRegister(dir)` — Read `register.yaml` if present.

## Browser usage

The GCR reader works in browsers via jszip. The concept directory reader requires Node.js `fs`.

```html
<script type="module">
  import { loadGcr } from 'glossarist/gcr';

  const response = await fetch('/datasets/isotc204.gcr');
  const buf = await response.arrayBuffer();
  const pkg = await loadGcr(buf);
  const meta = await pkg.metadata();
</script>
```

## Development

```bash
npm install
npm test
```

## License

MIT
