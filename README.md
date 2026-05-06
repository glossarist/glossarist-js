# glossarist-js

[![CI](https://github.com/glossarist/glossarist-js/actions/workflows/ci.yml/badge.svg)](https://github.com/glossarist/glossarist-js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/glossarist.svg)](https://www.npmjs.com/package/glossarist)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

JavaScript SDK for reading and writing [Glossarist](https://github.com/glossarist) GCR packages — manages terminology concepts with rich domain models, bidirectional YAML serialization, validation, and cross-reference resolution.

## Install

```bash
npm install glossarist
```

Requires Node.js 20+.

## Usage

### Read a GCR package

```js
import { loadGcr } from 'glossarist';

const pkg = await loadGcr(fs.readFileSync('my-dataset.gcr'));
const meta = await pkg.metadata();

// Stream concepts (memory-efficient for large datasets)
await pkg.eachConcept((concept) => {
  console.log(concept.id, concept.primaryDesignation('eng'));
});
```

### Read from a directory

```js
import { readConcepts, readRegister } from 'glossarist';

const concepts = readConcepts('./geolexica-v2/');
const register = readRegister('./geolexica-v2/');
```

### Write a GCR package

```js
import { createGcr, ManagedConceptCollection, conceptParser } from 'glossarist';

const concept = conceptParser.parse(`
  termid: "3.1.1.1"
  eng:
    terms:
      - type: expression
        designation: entity
    definition:
      - content: A concrete or abstract thing.
`);

const buf = await createGcr([concept], { shortname: 'test' });
fs.writeFileSync('out.gcr', buf);
```

### Domain model

Every domain entity is a class instance with `toJSON()`, `fromJSON()`, `equals()`, and `clone()`:

```js
import { Concept, LocalizedConcept, Expression, DetailedDefinition } from 'glossarist/models';

const lc = new LocalizedConcept({
  language_code: 'eng',
  terms: [{ type: 'expression', designation: 'entity', normative_status: 'preferred' }],
  definition: [{ content: 'A concrete or abstract thing.' }],
  entry_status: 'valid',
});

const concept = new Concept({
  id: '3.1.1.1',
  localizations: { eng: lc.toJSON() },
});

console.log(concept.primaryDesignation('eng')); // 'entity'
console.log(concept.definition('eng'));         // 'A concrete or abstract thing.'

// Round-trip invariant
const restored = Concept.fromJSON(concept.toJSON());
console.log(concept.equals(restored)); // true
```

### Validation

```js
import { validateConcept, validateRegister, createConceptValidator, ValidationRule } from 'glossarist';

// Built-in rules: language codes, designation types, entry status
const result = validateConcept(concept);
if (!result.valid) {
  for (const err of result.errors) {
    console.log(`[${err.severity}] ${err.path}: ${err.message}`);
  }
}

// Custom rules
class NoDuplicateTermsRule extends ValidationRule {
  constructor() { super('no-duplicate-terms', 'warning'); }
  validate(value, path) {
    // check for duplicate designations...
  }
}

const validator = createConceptValidator().addRule(new NoDuplicateTermsRule());
validator.validate(concept);

// Register validation
validateRegister({ schema_version: '1', shortname: 'my-dataset' });
```

### UUID generation

Deterministic UUID v5 matching the Ruby glossarist gem:

```js
import { conceptUuid, localizedConceptUuid } from 'glossarist';

conceptUuid('3.1.1.1');                    // → UUID v5 (stable across runs)
localizedConceptUuid('3.1.1.1', 'eng');   // → different UUID v5
```

### Reference resolution

Extract and resolve cross-references between concepts:

```js
import { referenceResolver } from 'glossarist';
import { ConceptCollection } from 'glossarist';

const collection = new ConceptCollection(allConcepts);

// Find all references in a concept
const refs = referenceResolver.extractReferences(concept);

// Resolve against a collection
const resolved = referenceResolver.resolveAll(concept, collection);
for (const [target, resolvedConcept] of resolved) {
  if (!resolvedConcept) console.warn(`Broken reference: ${target}`);
}
```

### Managed collection lifecycle

```js
import { ManagedConceptCollection, conceptParser } from 'glossarist';

const mcc = new ManagedConceptCollection();

// Load from GCR
await mcc.loadFromGcr(fs.readFileSync('dataset.gcr'));

// Load from directory
mcc.loadFromDirectory('./concepts/');

// Add or replace a concept
mcc.add(newConcept);

// Save back
mcc.saveToDirectory('./out/');
const buf = await mcc.saveToGcr({ metadata: { shortname: 'test' } });
```

### V1 format migration

```js
import { V1Reader, migrateV1ToV2 } from 'glossarist';

if (V1Reader.isV1Directory('./concepts-v1/')) {
  const concepts = V1Reader.readAll('./concepts-v1/');
  await migrateV1ToV2('./concepts-v1/', './concepts-v2/');
}
```

### Concept serialization

Serialize to canonical (single-doc) or managed (multi-doc) format:

```js
import { conceptSerializer } from 'glossarist';

conceptSerializer.toCanonicalYaml(concept);   // single YAML doc with termid + lang keys
conceptSerializer.toManagedYaml(concept);   // multi-doc YAML with data.identifier
conceptSerializer.toYaml(concept);          // auto-detect: uses term for canonical, id for managed
conceptSerializer.toRegisterYaml(register); // register.yaml format
```

## Sub-path exports

```js
import 'glossarist';          // everything
import 'glossarist/gcr';     // browser-friendly GCR reader (no fs)
import 'glossarist/concept';  // Node.js filesystem reader
import 'glossarist/models';   // domain model classes
import 'glossarist/validators'; // validation framework
```

## Architecture

```
Public API (index.js)
├── Domain models     → Concept, LocalizedConcept, Designation (Expression, Symbol, ...),
│                       Citation, ConceptSource, RelatedConcept, DetailedDefinition, NonVerbRep
├── Parsing           → ConceptParser (canonical + managed format detection)
├── Serialization     → ConceptSerializer (canonical + managed YAML output)
├── I/O               → loadGcr, readConcepts, createGcr, writeConcepts
├── Collections       → ConceptCollection (Proxy-based, queryable), ManagedConceptCollection
├── Validation        → ConceptValidator, RegisterValidator, ValidationRule (pluggable)
├── Utilities         → conceptUuid, referenceResolver, V1Reader
└── Errors            → GlossaristError, InvalidInputError, YamlParseError
```

Models are pure — no I/O, serialization, or filesystem dependencies. Serialization formats are pluggable. Validation rules are pluggable.

## Error handling

All public functions validate inputs and throw typed errors:

```js
import { InvalidInputError, YamlParseError } from 'glossarist';

try {
  await pkg.concept('3.1.1.1');
} catch (err) {
  if (err instanceof YamlParseError) {
    // Malformed YAML — err.cause chains the original error
    // err.message includes the concept ID for easy location
  } else if (err instanceof InvalidInputError) {
    // Null, empty, or wrong-type arguments
  }
}
```

## TypeScript

TypeScript declarations are included. No `@types/` package needed.

```ts
import { loadGcr, type Concept, type GcrMetadata } from 'glossarist';
import { Concept, LocalizedConcept, Designation } from 'glossarist/models';

const pkg = await loadGcr(buffer);
const meta: GcrMetadata | null = await pkg.metadata();
```

## Development

```bash
npm install
npm test                # regenerate fixtures + run all tests
npm run lint            # lint src/ and test/
npm run test:coverage   # run with coverage report
```

## License

[MIT](./LICENSE)
