#!/usr/bin/env node
// Sync vendored concept-model data artifacts from the upstream git repo.
//
// concept-model is a data-only repo. It is not an npm package. We vendor
// the small set of artifacts we actually need (glossarist.context.jsonld,
// glossarist.ttl, shapes/glossarist.shacl.ttl) and regenerate our own
// predicate constants from them via scripts/gen-predicates.mjs.
//
// Usage:
//   npm run sync:model                # latest release tag
//   npm run sync:model -- v3.0.0      # specific tag
//   node scripts/sync-concept-model.mjs --ref main   # any git ref
//
// Output: data/concept-model/* updated in place. Review the diff and commit.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'data', 'concept-model');
const REPO = 'glossarist/concept-model';

function parseArgs(argv) {
  const out = { ref: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') out.ref = argv[++i];
    else if (!a.startsWith('--')) out.ref = a;
  }
  return out;
}

function latestTag() {
  return execSync(`gh api repos/${REPO}/releases/latest --jq .tag_name`, { encoding: 'utf8' }).trim();
}

function fetchFile(ref, path) {
  // Use GitHub's raw endpoint via the API to avoid cloning the whole repo.
  const url = `https://raw.githubusercontent.com/${REPO}/${ref}/${path}`;
  return execSync(`curl -fsSL ${url}`, { encoding: 'utf8' });
}

const args = parseArgs(process.argv);
const ref = args.ref || latestTag();
if (!ref) {
  console.error('Could not determine concept-model ref to sync.');
  process.exit(1);
}

console.log(`Syncing from ${REPO}@${ref}`);

const FILES = [
  ['glossarist.context.jsonld', 'glossarist.context.jsonld'],
  ['glossarist.ttl', 'glossarist.ttl'],
  ['ontologies/glossarist.context.jsonld', 'glossarist.context.jsonld'],
  ['ontologies/glossarist.ttl', 'glossarist.ttl'],
  ['ontologies/shapes/glossarist.shacl.ttl', 'shapes/glossarist.shacl.ttl'],
];

mkdirSync(resolve(OUT_DIR, 'shapes'), { recursive: true });

// Try both root and ontologies/ paths — the repo layout has shifted over time.
function fetchAny(ref, candidates) {
  for (const p of candidates) {
    try {
      return fetchFile(ref, p);
    } catch (e) {
      // try next
    }
  }
  throw new Error(`Could not fetch any of: ${candidates.join(', ')}`);
}

const targets = {
  'glossarist.context.jsonld': ['ontologies/glossarist.context.jsonld', 'glossarist.context.jsonld'],
  'glossarist.ttl': ['ontologies/glossarist.ttl', 'glossarist.ttl'],
  'shapes/glossarist.shacl.ttl': ['ontologies/shapes/glossarist.shacl.ttl', 'shapes/glossarist.shacl.ttl'],
};

let updated = 0;
for (const [outPath, candidates] of Object.entries(targets)) {
  const content = fetchAny(ref, candidates);
  writeFileSync(resolve(OUT_DIR, outPath), content);
  console.log(`  ✓ ${outPath} (${content.length} bytes)`);
  updated++;
}

// Record the source ref so reviewers can verify what we vendored.
writeFileSync(
  resolve(OUT_DIR, 'SOURCE.json'),
  JSON.stringify({ repo: REPO, ref, syncedAt: new Date().toISOString() }, null, 2) + '\n',
);

console.log(`\nSynced ${updated} file(s) from ${REPO}@${ref}.`);
console.log('Review the diff, then run `npm run gen:predicates` to regenerate constants.');
