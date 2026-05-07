# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

- `npm install` — install dependencies
- `npm test` — regenerate fixtures (pretest) then run all tests
- `npm run test:verbose` — run tests with spec reporter
- `npm run test:coverage` — run tests with coverage report
- `npm run lint` — lint src/ and test/
- Run a single test file: `node --test test/gcr-reader.test.js`
- Run tests matching a pattern: `node --test --test-name-pattern 'pattern' test/**/*.test.js`
- Rebuild test fixture GCR files manually: `node test/fixtures/build-fixtures.js`

Integration tests in `test/integration.test.js` look for real GCR packages at `/tmp/isotc204-release.gcr` and `/tmp/iev-release.gcr` and skip automatically if absent.

## Architecture

This is a pure ESM package (`"type": "module"`) with no build step. The public API is re-exported from `src/index.js`. Only `src/` is published to npm.

### Layers (top to bottom)

- **Public API** (`src/index.js`) — re-exports everything
- **Collection layer** — `ConceptCollection` (Proxy-based, indexed access, query methods), `ManagedConceptCollection` (load/save lifecycle)
- **I/O layer** — `loadGcr`/`GcrPackage` (ZIP), `readConcepts`/`writeConcepts` (filesystem)
- **Compiled formats** — `CompiledFormatRegistry` in `src/compiled-format.js` defines the known machine formats (tbx, jsonld, turtle, jsonl) and their file extensions inside GCR. `GcrPackage` exposes read methods (`compiledFormats()`, `compiledFile()`, `allCompiledFiles()`); `GcrWriter` accepts `compiledFormats` option for writing. Directory convention: `compiled/{format}/{id}.{ext}`.
- **Dataset assets** — `DATASET_ASSETS` in `src/dataset-asset.js` defines the known file/directory assets (bibliography.yaml, images/) bundled in GCR packages. `GcrPackage` exposes `bibliography()`, `hasImages()`, `imageFile()`, `imageFileNames()`, `allImageFiles()`; `GcrWriter` accepts `bibliography` and `images` options. Mirrors Ruby glossarist gem's `GcrPackage::DATASET_ASSETS`.
- **Serialization layer** — `ConceptSerializer` (canonical + managed YAML output)
- **Parsing layer** — `ConceptParser` (format detection + normalization), `parseConceptYaml` (backward compat)
- **Model layer** — domain classes with no I/O dependencies: `Concept`, `LocalizedConcept`, `Designation` hierarchy, `Citation`, `DetailedDefinition`, `NonVerbRep`, `ConceptSource`, `RelatedConcept`, `ConceptDate`, `GcrMetadata`, `GcrStatistics`
- **Supporting** — `GlossaristModel` base class, `ValidationRule` framework, UUID generation, reference resolution, V1 migration, `naturalSort` (in `src/sort.js`)

### Error hierarchy

`src/errors.js` defines `GlossaristError` (base) → `InvalidInputError` (bad input) and `YamlParseError` (YAML parse failures with `cause`). All public entry points validate inputs and throw these error types. `parseConceptYaml` accepts an optional `context` parameter (concept ID or filename) for actionable error messages.

### Two concept storage formats

The library normalizes two different YAML concept formats into a single structure:

- **Canonical format** (used by IEV/iec-electropedia): Single YAML document with top-level `termid` and language keys (`eng:`, `fra:`, etc.)
- **Managed concept format** (used by isotc204, isotc211, osgeo): Multi-document YAML where doc 0 has `data.identifier` + `data.localized_concepts`, and subsequent docs have `data.language_code` + localized term data

`ConceptParser` in `src/concept-parser.js` detects which format and dispatches to `_parseCanonical()` or `_parseManaged()`. The singleton `conceptParser` is used by both `gcr-reader.js` and `concept-reader.js`.

### Dynamic language discovery

Language codes are discovered dynamically from YAML keys — any object-valued key that isn't a structural key (`termid`, `term`) is treated as a localization. No hardcoded language list.

### Two readers

- **`src/gcr-reader.js`** — `GcrPackage` class wraps a JSZip instance. Reads concepts from `concepts/*.yaml` inside a ZIP archive. Works in both Node.js and browsers (no `fs` dependency). Contains `loadGcr`, base64 auto-detection, and backward-compatible `parseConceptYaml`. `naturalSort` is re-exported from `src/sort.js`. Dataset asset methods use the `dataset-asset.js` registry for discovery.
- **`src/concept-reader.js`** — Reads concept YAML files from a filesystem directory. Node.js only. Delegates to `conceptParser.parse()`.

### Package entry points

- `glossarist` → `src/index.js` (all exports)
- `glossarist/gcr` → `src/gcr-reader.js` (browser-friendly, no fs)
- `glossarist/concept` → `src/concept-reader.js` (Node.js only)
- `glossarist/models` → `src/models/index.js` (domain model classes)
- `glossarist/validators` → `src/validators/index.js` (validation framework)

### Testing

Uses Node.js built-in test runner (`node:test` + `node:assert/strict`). Test glob: `test/**/*.test.js` (includes `test/models/` subdirectory). Fixtures are regenerated automatically via `pretest` hook.

### Linting

ESLint 10 with flat config (`eslint.config.js`). Uses `@eslint/js` recommended config with Node.js globals.

### CI/CD

- **CI** (`.github/workflows/ci.yml`): lint + test on Node 20/22/24 + coverage
- **Release** (`.github/workflows/release.yml`): publish to npm + create GitHub release on `v*` tag push
- **Dependabot** (`.github/dependabot.yml`): weekly npm + GitHub Actions dependency updates
