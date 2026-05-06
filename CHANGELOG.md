# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- GitHub Actions CI workflow (Node 18, 20, 22)
- Test suite with 66 tests including edge cases and input validation
- Coverage reporting via `--experimental-test-coverage`

[0.1.0]: https://github.com/glossarist/glossarist-js/releases/tag/v0.1.0
