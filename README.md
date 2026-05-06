# glossarist-js

[![CI](https://github.com/glossarist/glossarist-js/actions/workflows/ci.yml/badge.svg)](https://github.com/glossarist/glossarist-js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/glossarist.svg)](https://www.npmjs.com/package/glossarist)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

JavaScript library for reading [Glossarist](https://github.com/glossarist) GCR packages (ZIP archives) and v2 glossarist concept data (YAML files). Works in Node.js and browsers.

## Install

```bash
npm install glossarist
```

Requires Node.js 18+.

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

`loadGcr` accepts `Buffer`, `ArrayBuffer`, `Uint8Array`, `Blob`, or a base64-encoded string.

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

### Browser usage

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

## Concept format

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

Language codes are discovered dynamically from the YAML keys — any ISO 639-3 code works without code changes.

### Supported formats

| Format | Structure | Used by |
|--------|-----------|---------|
| **Canonical** | Single YAML document with `termid` and language keys (`eng:`, `fra:`) | IEV (iec-electropedia) |
| **Managed concept** | Multi-document YAML: first doc has `data.identifier` + `data.localized_concepts`, subsequent docs have `data.language_code` | isotc204, isotc211, osgeo |

## Error handling

All public functions validate inputs and throw descriptive errors with context:

```js
import { InvalidInputError, YamlParseError } from 'glossarist';

try {
  await pkg.concept('3.1.1.1');
} catch (err) {
  if (err instanceof YamlParseError) {
    // err.message: "Failed to parse YAML for 3.1.1.1: ..."
    // err.cause: the original YAML parse error
  } else if (err instanceof InvalidInputError) {
    // Invalid input (null, empty string, wrong type)
  }
}
```

Errors include the concept ID or filename in their message, making it easy to locate failures in large datasets.

- **`GlossaristError`** — base class for all library errors
- **`InvalidInputError`** — null, undefined, empty, or wrong-type arguments
- **`YamlParseError`** — malformed YAML with `cause` chaining the original error

## TypeScript

TypeScript declarations are included. No `@types/` package needed.

```ts
import { loadGcr, readConcepts, type Concept, type GcrMetadata } from 'glossarist';

const pkg = await loadGcr(buffer);
const meta: GcrMetadata | null = await pkg.metadata();
```

## API

### GCR Package (`glossarist/gcr`)

- `loadGcr(input)` — Load a GCR ZIP from Buffer/ArrayBuffer/Uint8Array/Blob/base64 string. Returns `GcrPackage`.
- `GcrPackage#metadata()` — Parse `metadata.yaml`.
- `GcrPackage#register()` — Parse optional `register.yaml`.
- `GcrPackage#conceptIds()` — Array of concept IDs (natural-sorted).
- `GcrPackage#concept(id)` — Read and normalize a single concept.
- `GcrPackage#eachConcept(callback)` — Stream all concepts.
- `GcrPackage#allConcepts()` — Load all concepts into an array.
- `parseConceptYaml(raw, context?)` — Parse raw YAML string into normalized concept object. `context` is an optional concept ID or filename for error messages.
- `naturalSort(a, b)` — Natural sort comparator for concept IDs.

### Concept Directory Reader (`glossarist/concept`)

Node.js only (uses `fs`).

- `readConcepts(dir)` — Read all concept YAML files from a directory.
- `readConcept(dir, id)` — Read a single concept by ID.
- `listConceptIds(dir, prefix?)` — List concept IDs, optionally filtered by prefix.
- `readRegister(dir)` — Read `register.yaml` if present.

### Errors

- `GlossaristError` — base error class
- `InvalidInputError` — bad input arguments
- `YamlParseError` — YAML parse failures (has `cause`, includes concept context)

## Development

```bash
npm install
npm test                # regenerate fixtures + run all tests
npm run lint            # lint src/ and test/
npm run test:coverage   # run with coverage report
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

## License

[MIT](./LICENSE)
