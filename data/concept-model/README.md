# data/concept-model — vendored data artifacts from concept-model repo

This directory holds **data-only** artifacts copied from
[glossarist/concept-model](https://github.com/glossarist/concept-model).

concept-model is a *model* repo (TTL, JSON-LD, YAML schemas). It holds no
code, no npm package, no Ruby gem. glossarist-js vendors the small set of
data files it needs at build time and generates its own language-native
predicate constants from them.

## Files

| File | Purpose |
|------|---------|
| `glossarist.context.jsonld` | JSON-LD term map — input for predicate-constant codegen |
| `glossarist.ttl` | OWL ontology (reference; not currently read at runtime) |
| `shapes/glossarist.shacl.ttl` | SHACL shapes — loaded by `src/rdf/shacl.js` at runtime |

## Syncing

Update these files from the latest concept-model tag:

```bash
npm run sync:model          # fetches latest from glossarist/concept-model
npm run sync:model -- v3.0.0   # pin to a specific tag
```

After syncing, regenerate predicate constants:

```bash
npm run gen:predicates
```

Both are wired into `npm run build`.

## Why vendor instead of `npm install`?

Because concept-model is not an npm package. Treating it as one (a prior
attempt, briefly landed as `@glossarist/concept-model` v3.0.1 on
2026-06-26) required bolting a codegen + packaging onto a repo that should
only hold data. The result was a broken release (unquoted `iso-thes:` JS
key). Vendoring the small data files we need + generating bindings in this
repo keeps the model repo clean and lets this repo's bindings evolve
independently.
