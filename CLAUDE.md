# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

- `npm install` — install dependencies
- `npm test` — regenerate fixtures (pretest) then run all tests
- `npm run test:verbose` — run tests with spec reporter
- `npm run test:coverage` — run tests with coverage report
- `npm run lint` — lint src/ and test/
- Run a single test file: `node --test test/gcr-reader.test.js`
- Run tests matching a pattern: `node --test --test-name-pattern 'pattern' test/*.test.js`
- Rebuild test fixture GCR files manually: `node test/fixtures/build-fixtures.js`

Integration tests in `test/integration.test.js` look for real GCR packages at `/tmp/isotc204-release.gcr` and `/tmp/iev-release.gcr` and skip automatically if absent.

## Architecture

This is a pure ESM package (`"type": "module"`) with no build step. The public API is re-exported from `src/index.js`. Only `src/` is published to npm.

### Error hierarchy

`src/errors.js` defines `GlossaristError` (base) → `InvalidInputError` (bad input) and `YamlParseError` (YAML parse failures with `cause`). All public entry points validate inputs and throw these error types. `parseConceptYaml` accepts an optional `context` parameter (concept ID or filename) for actionable error messages. They are exported so consumers can catch them selectively.

### Two concept storage formats

The library normalizes two different YAML concept formats into a single structure:

- **Canonical format** (used by IEV/iec-electropedia): Single YAML document with top-level `termid` and language keys (`eng:`, `fra:`, etc.)
- **Managed concept format** (used by isotc204, isotc211, osgeo): Multi-document YAML where doc 0 has `data.identifier` + `data.localized_concepts`, and subsequent docs have `data.language_code` + localized term data

`parseConceptYaml()` in `gcr-reader.js` detects which format and dispatches to `normalizeCanonical()` or `normalizeManaged()`.

### Dynamic language discovery

Language codes are discovered dynamically from YAML keys — any object-valued key that isn't a structural key (`termid`, `term`) is treated as a localization. No hardcoded language list.

### Two readers

- **`src/gcr-reader.js`** — `GcrPackage` class wraps a JSZip instance. Reads concepts from `concepts/*.yaml` inside a ZIP archive. Works in both Node.js and browsers (no `fs` dependency). Contains `parseConceptYaml` (format detection), `naturalSort` (shared sort utility with module-level cached regexes), and base64 auto-detection for `loadGcr`.
- **`src/concept-reader.js`** — Reads concept YAML files from a filesystem directory. Node.js only. Delegates parsing to `parseConceptYaml` from gcr-reader, passing filenames as context.

### Package entry points

- `glossarist` → `src/index.js` (re-exports both readers + errors)
- `glossarist/gcr` → `src/gcr-reader.js` (browser-friendly, no fs)
- `glossarist/concept` → `src/concept-reader.js`

Each entry point has a corresponding `.d.ts` TypeScript declaration file with types conditions in the exports map.

### Testing

Uses Node.js built-in test runner (`node:test` + `node:assert/strict`). No third-party test framework. Fixtures are regenerated automatically via `pretest` hook.

### Linting

ESLint 10 with flat config (`eslint.config.js`). Uses `@eslint/js` recommended config with Node.js globals.

### CI/CD

- **CI** (`.github/workflows/ci.yml`): lint + test on Node 18/20/22 + coverage
- **Release** (`.github/workflows/release.yml`): publish to npm + create GitHub release on `v*` tag push
- **Dependabot** (`.github/dependabot.yml`): weekly npm + GitHub Actions dependency updates
