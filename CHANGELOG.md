# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-05-06

### Fixed

- `GcrWriter.createBuffer` now accepts any iterable (not just `Array`) — fixes `ManagedConceptCollection.saveToGcr()` failing because `ConceptCollection` is Proxy-based
- `RegisterValidator` extracted into its own file for MECE compliance

### Added

- `test/models/base.test.js` — GlossaristModel round-trip invariant and equality
- `test/models/localized-concept.test.js` — lazy parsing, caching, snake/camelCase compat
- `test/concept-parser.test.js` — format detection, canonical/managed parsing, error handling
- `test/managed-concept-collection.test.js` — load/save lifecycle, CRUD, GCR round-trip
- `test/v1-reader.test.js` — V1 format detection, read, migration to V2

## [0.1.2] - 2026-05-06

### Added

- Rich domain model classes (`Concept`, `LocalizedConcept`, `Designation` hierarchy with open/closed registry, `Citation`, `ConceptSource`, `RelatedConcept`, `ConceptDate`, `DetailedDefinition`, `NonVerbRep`)
- `GlossaristModel` base class with `toJSON()`, `fromJSON()`, `equals()`, `clone()`
- `ConceptParser` extracted from `gcr-reader.js` with format detection and normalization
- `ConceptSerializer` with `toCanonicalYaml()`, `toManagedYaml()`, `toYaml()` (auto-detect), `toRegisterYaml()`
- `GcrWriter` and `createGcr()` for writing GCR ZIP archives
- `writeConcept()` and `writeConcepts()` for filesystem output
- `ConceptCollection` with Proxy-based indexed access and query methods (`byId`, `byPrefix`, `byLanguage`, `byStatus`, `search`, `sorted`, `index`)
- `ManagedConceptCollection` with load/save lifecycle for directories and GCR archives
- Pluggable `ValidationRule` framework with built-in `LanguageCodeRule`, `DesignationTypeRule`, `EntryStatusRule`
- `validateConcept()`, `validateRegister()`, `createConceptValidator()` entry points
- `conceptUuid()`, `localizedConceptUuid()`, `uuidV5()` for deterministic UUID v5 generation
- `referenceResolver` with `extractReferences()`, `resolveReference()`, `resolveAll()`
- `V1Reader` with `isV1Directory()`, `readConcept()`, `readAll()`, and `migrateV1ToV2()`
- `./models` and `./validators` sub-path exports
- 166 tests (47 new), lint clean

### Changed

- `parseConceptYaml()` and `concept-reader.js` now return `Concept` model instances (backward-compatible)
- Test glob updated to `test/**/*.test.js` (includes subdirectories)

## [0.1.1] - 2026-05-05

### Changed

- CI/CD updated to npm trusted publishing, GitHub Actions bumped to v6, Node 24

## [0.1.0] - 2025-05-05

### Added

- `loadGcr()` — load GCR ZIP packages from Buffer, ArrayBuffer, Uint8Array, Blob, or base64 string
- `GcrPackage` class with `metadata()`, `register()`, `conceptIds()`, `concept(id)`, `eachConcept(cb)`, `allConcepts()`
- `parseConceptYaml()` — parse canonical and managed concept YAML formats into normalized objects
- `naturalSort()` — natural sort comparator for dotted/dashed concept IDs
- `readConcepts(dir)`, `readConcept(dir, id)`, `listConceptIds(dir, prefix?)`, `readRegister(dir)` — filesystem-based concept reader
- `GlossaristError`, `InvalidInputError`, `YamlParseError` — custom error hierarchy with descriptive messages and cause chaining
- TypeScript declarations (`.d.ts`) for all public APIs
- JSDoc type annotations on all exported functions and classes
- ESLint with flat config
- GitHub Actions CI workflow (Node 20, 22, 24)
- Test suite with 66 tests including edge cases and input validation
- Coverage reporting via `--experimental-test-coverage`

[0.1.3]: https://github.com/glossarist/glossarist-js/releases/tag/v0.1.3
[0.1.2]: https://github.com/glossarist/glossarist-js/releases/tag/v0.1.2
[0.1.1]: https://github.com/glossarist/glossarist-js/releases/tag/v0.1.1
[0.1.0]: https://github.com/glossarist/glossarist-js/releases/tag/v0.1.0
