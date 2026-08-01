// Verifies that vendored concept-model data files are internally
// consistent with the JS-generated predicate constants.
//
// Catches two classes of drift:
//   1. Someone edited src/rdf/predicates.js manually instead of
//      regenerating from glossarist.context.jsonld (caught by the
//      predicates-drift test).
//   2. Someone edited data/concept-model/prefixes.ttl but forgot to
//      regen, or vice-versa — the canonical prefix bindings and the
//      JSON-LD context's namespace declarations disagree.
//
// SOURCE.json must be present so reviewers can verify which upstream
// ref the vendored data came from.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PREFIXES } from '../../src/rdf/predicates.js';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..', '..');
const DATA_DIR = resolve(ROOT, 'data', 'concept-model');
const PREFIXES_TTL_PATH = resolve(DATA_DIR, 'prefixes.ttl');
const SOURCE_JSON_PATH = resolve(DATA_DIR, 'SOURCE.json');

// Parse @prefix lines from a Turtle file. Returns a Map<prefix, uri>.
function parsePrefixes(turtle) {
  const out = new Map();
  const re = /@prefix\s+([a-zA-Z][a-zA-Z0-9-]*)\s*:\s*<([^>]+)>\s*\./g;
  let m;
  while ((m = re.exec(turtle)) !== null) {
    out.set(m[1], m[2]);
  }
  return out;
}

describe('concept-model drift — vendored data consistency', () => {
  it('PREFIXES in predicates.js matches prefixes.ttl canonical bindings', () => {
    const ttl = readFileSync(PREFIXES_TTL_PATH, 'utf8');
    const canonical = parsePrefixes(ttl);

    // Every JS PREFIX must match a canonical binding. JS only emits the
    // subset of prefixes used by Glossarist emitters — extras in
    // prefixes.ttl (e.g. `sh:` for SHACL) are fine.
    for (const [prefix, uri] of Object.entries(PREFIXES)) {
      assert.ok(
        canonical.has(prefix),
        `prefix '${prefix}' in predicates.js is missing from prefixes.ttl`,
      );
      assert.equal(
        canonical.get(prefix),
        uri,
        `prefix '${prefix}' URI differs between predicates.js and prefixes.ttl`,
      );
    }
  });

  it('SOURCE.json is present and records the upstream ref', () => {
    const json = JSON.parse(readFileSync(SOURCE_JSON_PATH, 'utf8'));
    assert.equal(json.repo, 'glossarist/concept-model');
    assert.ok(typeof json.ref === 'string' && json.ref.length > 0, 'ref must be a non-empty string');
    assert.ok(typeof json.syncedAt === 'string', 'syncedAt must be an ISO timestamp');
    // Validate the timestamp parses.
    assert.ok(!Number.isNaN(Date.parse(json.syncedAt)), 'syncedAt must be valid ISO 8601');
  });

  it('uses skosxl: prefix (not xl:)', () => {
    const ttl = readFileSync(PREFIXES_TTL_PATH, 'utf8');
    assert.match(ttl, /@prefix\s+skosxl\s*:/, 'prefixes.ttl must declare skosxl:');
    assert.doesNotMatch(ttl, /@prefix\s+xl\s*:/, "prefixes.ttl must not use the non-standard 'xl:' prefix");
  });
});
