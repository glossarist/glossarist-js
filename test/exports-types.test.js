// Verifies that every entry in package.json `exports` declares a `types`
// path that actually exists on disk. Catches the TODO 20 / PR #31 defect
// class: runtime exports with missing TypeScript declarations.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const exports = pkg.exports ?? {};

describe('package.json exports *.d.ts presence', () => {
  for (const [entry, spec] of Object.entries(exports)) {
    const typesPath = spec?.types;
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
