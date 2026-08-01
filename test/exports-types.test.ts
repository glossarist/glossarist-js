// Verifies that every entry in package.json `exports` declares a `types`
// path that actually exists on disk. Catches the TODO 20 / PR #31 defect
// class: runtime exports with missing TypeScript declarations.
//
// The ./package.json self-reference is excluded — it is a JSON file,
// not a TypeScript module.
//
// Types point at `dist/*.d.ts` (compiled output). If `dist/` doesn't
// exist (e.g. fresh clone without `npm run build`), the suite is
// skipped with a reminder to run the build. CI runs the build before
// tests; local developers can opt in via `npm run build && npm test`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const exports = pkg.exports ?? {};
const DIST_EXISTS = existsSync(resolve(ROOT, 'dist'));

describe('package.json exports *.d.ts presence', { skip: !DIST_EXISTS && 'dist/ not built — run `npm run build`' }, () => {
  for (const [entry, spec] of Object.entries(exports)) {
    if (entry === './package.json') continue;
    const typesPath = (spec as { types?: string }).types;
    it(`${entry} → ${typesPath ?? '(no types)'}`, () => {
      assert.ok(typesPath, `exports entry ${entry} is missing the "types" field`);
      const resolved = resolve(ROOT, typesPath.replace(/^\.\//, ''));
      const relPath = relative(ROOT, resolved);
      assert.ok(
        existsSync(resolved) && statSync(resolved).isFile(),
        `expected declaration file "${relPath}" (referenced by exports.${entry}.types) does not exist`,
      );
      assert.ok(
        relPath.endsWith('.d.ts'),
        `exports.${entry}.types must point at a .d.ts file, got: ${relPath}`,
      );
    });
  }
});
