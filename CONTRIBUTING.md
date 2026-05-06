# Contributing

Contributions are welcome! Here's how to get started.

## Setup

```bash
git clone https://github.com/glossarist/glossarist-js.git
cd glossarist-js
npm install
```

Requires **Node.js 20+** (uses ESM and `node:test`).

## Development

```bash
npm test                # run all tests
npm run test:verbose    # run with spec reporter
npm run test:coverage   # run with coverage report
npm run lint            # lint src/ and test/
```

Run a single test file:

```bash
node --test test/gcr-reader.test.js
```

Run all tests matching a pattern:

```bash
node --test --test-name-pattern 'canonical' test/**/*.test.js
```

## Test fixtures

Test GCR files live in `test/fixtures/`. Rebuild them after changing fixture data:

```bash
node test/fixtures/build-fixtures.js
```

Integration tests in `test/integration.test.js` use real GCR packages placed at `/tmp/isotc204-release.gcr` and `/tmp/iev-release.gcr`. They skip automatically when these files are absent.

## Pull requests

- Keep PRs focused on a single concern.
- Add or update tests for any changed behavior.
- Run `npm run lint && npm test` before pushing — CI runs the same checks.
- Follow the existing code style (no semicolons, no build step, pure ESM).

## Releasing

1. Update `version` in `package.json`.
2. Add an entry to `CHANGELOG.md`.
3. Commit, tag (`vX.Y.Z`), and push.
4. `npm publish` (requires npm access to the glossarist org).
