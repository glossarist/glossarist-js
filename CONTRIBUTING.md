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

## Ribose Contributor License Agreement

Before your first pull request can be merged in any Ribose GitHub
organization, you need to be covered by the Ribose Contributor License
Agreement (CLA). Sign once; one signature covers every Ribose
organization.

- **Individual contributors** — sign the Individual CLA at
  <https://cla.ribose.com/icla>. The `cla/ribose` check on your pull
  request reports the state, and you can also sign from the pull request
  by commenting `@ribose-cla agree` and completing the one-click link
  the App replies with.
- **Corporate contributors** — if your employer has an executed
  Organization CLA, the employer's Point of Contact adds your GitHub
  handle to its Schedule A at
  <https://cla.ribose.com/organizations>, or you can request coverage
  there yourself. No individual signature is then needed.
- **The full guide** — the signing flows and the agreement text are at
  <https://github.com/riboseinc/cla/blob/main/docs/SIGNING.md>.
