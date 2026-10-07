# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

- `npm install` — install dependencies
- `npm run build` — compile TypeScript to `dist/` (tsc, `tsconfig.build.json`; regenerates RDF predicates first)
- `npm run typecheck` — `tsc --noEmit` over `src/` (strict); `npm run typecheck:test` — over `src/` + `test/` (non-strict)
- `npm test` — regenerate fixtures (pretest) then run all tests (tsx + Node built-in test runner)
- `npm run test:verbose` / `npm run test:coverage` — spec reporter / coverage
- `npm run lint` — eslint over `src/` and `test/`
- Run a single test file: `node --import tsx --test test/models/bibliography-data.test.ts`
- Run tests matching a pattern: `node --import tsx --test --test-name-pattern 'pattern' test/**/*.test.ts`
- Rebuild test fixture GCR files manually: `node test/fixtures/build-fixtures.mjs`
- Sync vendored concept-model artifacts + regenerate RDF predicates: `npm run sync:model && npm run gen:predicates`

Integration tests in `test/integration.test.js` look for real GCR packages at `/tmp/isotc204-release.gcr` and `/tmp/iev-release.gcr` and skip automatically if absent.

## Architecture

This is a TypeScript package (`"type": "module"`) compiled to `dist/` by tsc (published via `prepublishOnly`; `main`/`types` point into `dist`). The public API lives in `src/index.ts` and is re-exported through package `exports` entry points (`glossarist/gcr`, `glossarist/models`, `glossarist/rdf`, `glossarist/transforms`, `glossarist/output`, `glossarist/validators`). Sources are `.ts`; tests run through tsx.

### Layers (top to bottom)

- **Public API** (`src/index.js`) — re-exports everything
- **Collection layer** — `ConceptCollection` (Proxy-based, indexed access, query methods), `ManagedConceptCollection` (load/save lifecycle)
- **I/O layer** — `loadGcr`/`GcrPackage` (ZIP), `readConcepts`/`writeConcepts` (filesystem)
- **Compiled formats** — `CompiledFormatRegistry` in `src/compiled-format.js` defines the known machine formats (tbx, jsonld, turtle, jsonl) and their file extensions inside GCR. `GcrPackage` exposes read methods (`compiledFormats()`, `compiledFile()`, `allCompiledFiles()`); `GcrWriter` accepts `compiledFormats` option for writing. Directory convention: `compiled/{format}/{id}.{ext}`.
- **Dataset assets** — `DATASET_ASSETS` in `src/dataset-asset.js` defines the known file/directory assets (bibliography.yaml, images/) bundled in GCR packages. `GcrPackage` exposes `bibliography()`, `hasImages()`, `imageFile()`, `imageFileNames()`, `allImageFiles()`; `GcrWriter` accepts `bibliography` and `images` options. Mirrors Ruby glossarist gem's `GcrPackage::DATASET_ASSETS`.
- **Serialization layer** — `ConceptSerializer` (canonical + managed YAML output)
- **Parsing layer** — `ConceptParser` (format detection + normalization), `parseConceptYaml` (backward compat)
- **Model layer** — domain classes with no I/O dependencies: `Concept`, `LocalizedConcept`, `Designation` hierarchy, `Citation`, `DetailedDefinition`, `NonVerbRep`, `ConceptSource`, `RelatedConcept`, `ConceptDate`, `GcrMetadata`, `GcrStatistics`, `BibliographyData`/`BibliographyEntry` (plus `BibliographyData.fromRelaton` importing Relaton records via the npm `relaton` package — lazily imported, so browser bundles that never call it stay light)
- **Supporting** — `GlossaristModel` base class, `ValidationRule` framework, `GcrValidator` (full-package async validation), `ValidationResult`, UUID generation, reference resolution, V1 migration, `naturalSort` (in `src/sort.ts`)

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

Uses Node.js built-in test runner (`node:test` + `node:assert/strict`) executed through tsx. Test glob: `test/**/*.test.ts` (includes `test/models/` subdirectory). Fixtures are regenerated automatically via `pretest` hook.

### Linting

ESLint 10 with flat config (`eslint.config.js`). Uses `@eslint/js` recommended config with Node.js globals.

### CI/CD

- **CI** (`.github/workflows/ci.yml`): lint + typecheck + test matrix (Node 20/22/24) + coverage + `model-drift` job (regenerates `src/rdf/predicates.ts` from the vendored concept-model context; fails when it doesn't reproduce). Vendored-shape provenance: `data/concept-model/SOURCE.json` claims a release tag but the artifacts were synced from concept-model **main** (they contain both `completeness` and the `PartitiveHyperedge` terms). NOTE: upgrading to the v3.1.1 tag remodels partitives (`PartitiveHyperedge`/`PartitiveEnumeration`, `completeness`/`criterion` gone from the context) and requires porting `src/rdf/gloss-partitive-relation.ts` and the Ruby twin first.
- **Release** (`.github/workflows/release.yml`): publish to npm + create GitHub release — triggered by `v*` tag push or `workflow_dispatch` with a `version` input
- **Dependabot** (`.github/dependabot.yml`): weekly npm + GitHub Actions dependency updates

## ABSOLUTE RULE: NEVER HARDCODE DEPLOYMENT CONFIGURATION

### What happened
glossarist-js emitter functions had hardcoded `'https://glossarist.org'` as a default base URI. When a consumer (oimlsmart/vocab, iala-vocab, geolexica sites) called an emitter without explicitly passing their domain, all instance IRIs said `glossarist.org` instead of the consumer's own domain. This is an identity leak and a configuration hardcoding violation.

### Why this is wrong
- **Breaks encapsulation.** Deployment configuration (domain, basePath, uriBase) is the CONSUMER's decision, not the library's. Hardcoding it forces every consumer to override or patch.
- **Violates OCP.** Adding a new deployment should NOT require editing source code. It should only require configuration.
- **Silent failure.** The hardcoded defaults don't throw — they silently produce wrong-namespace IRIs.
- **Configuration is NOT code.** `uriBase`, `basePath`, `domain` belong in the consumer's configuration, not in `.js` files as string literals.

### THE RULES

1. **NEVER hardcode deployment-specific values** (domain names, hostnames, base paths, URI roots) in source code. These are configuration, not code.

2. **NEVER use a hostname string as a default fallback.** If a configuration value is missing, THROW with a descriptive error. Do not silently substitute a hardcoded default.

3. **ALL URI construction must derive the base from an explicit parameter** passed by the caller. No `'https://glossarist.org'` as a `??` or `||` fallback.

4. **The ontology namespace** `https://www.glossarist.org/ontologies/` is NOT a deployment URL — it's the canonical ontology identity and IS correct to hardcode. The rule applies to INSTANCE DATA URIs only.

5. **When in doubt, throw.** A missing `baseUri` should produce a clear error message pointing at the required parameter, not silently emit wrong data.
