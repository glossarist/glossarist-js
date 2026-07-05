// Verifies that the committed src/rdf/predicates.{js,d.ts} match what
// scripts/gen-predicates.mjs would regenerate from the vendored
// JSON-LD context. Catches drift if someone edits the context but
// forgets to run `npm run gen:predicates`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatePredicates, ROOT } from '../../scripts/gen-predicates.mjs';

const CTX_PATH = resolve(ROOT, 'data', 'concept-model', 'glossarist.context.jsonld');
const COMMITTED_JS = resolve(ROOT, 'src', 'rdf', 'predicates.js');
const COMMITTED_TS = resolve(ROOT, 'src', 'rdf', 'predicates.d.ts');

describe('predicates drift', () => {
  it('committed predicates.js matches regenerated output', () => {
    const ctx = JSON.parse(readFileSync(CTX_PATH, 'utf8'))['@context'];
    const { js } = generatePredicates(ctx);
    const committed = readFileSync(COMMITTED_JS, 'utf8');
    assert.equal(
      committed,
      js,
      'predicates.js is out of sync with glossarist.context.jsonld. Run: npm run gen:predicates',
    );
  });

  it('committed predicates.d.ts matches regenerated output', () => {
    const ctx = JSON.parse(readFileSync(CTX_PATH, 'utf8'))['@context'];
    const { ts } = generatePredicates(ctx);
    const committed = readFileSync(COMMITTED_TS, 'utf8');
    assert.equal(
      committed,
      ts,
      'predicates.d.ts is out of sync with glossarist.context.jsonld. Run: npm run gen:predicates',
    );
  });
});
