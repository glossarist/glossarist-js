# Concept Diff

Structured, hierarchical diff for comparing two editions of a Glossarist
concept. Combines object-level diffing (which designations, definitions,
notes, examples, sources changed) with word-level string diffing (what
text changed inside each modified item).

## Quick start

```js
import { diffConcepts } from 'glossarist';

const oldConcept = await loadGcr('edition-2024.gcr')
  .conceptById('3.1.1');
const newConcept = await loadGcr('edition-2025.gcr')
  .conceptById('3.1.1');

const diff = diffConcepts(oldConcept, newConcept, 'eng');

if (diff.hasChanges) {
  for (const { path, change } of diff.walk()) {
    console.log(`${path}: ${change.type}`);
  }
}
```

## API surface

### Entry points

| Function | Purpose |
|---|---|
| `diffConcepts(old, new, lang)` | Diff two `Concept` instances for one language (pass `'all'` for every language). |
| `diffLocalizedConcepts(oldLoc, newLoc)` | Diff two `LocalizedConcept` instances directly. |
| `diffText(oldText, newText)` | Standalone word-level string diff. |
| `diffList(old, new, opts)` | Ordered LCS list diff. |
| `diffSet(old, new, opts)` | Unordered identity-matched list diff. |
| `concept.diff(other, lang)` | Convenience method on `Concept`. |

### Result models

All diff result types extend `GlossaristModel` — they have `toJSON()`,
`fromJSON()`, `equals()`, and `clone()`.

```
ConceptDiff
├── oldId, newId
├── localizations: { [lang]: LocalizedConceptDiff }
├── hasChanges
├── languages
├── localization(lang)
└── walk() → yields { path, change, language }

LocalizedConceptDiff
├── designations: ListDiff<Designation>      (set-based: matched by type|text)
├── definitions:  ListDiff<DetailedDefinition> (ordered LCS: matched by content)
├── notes:        ListDiff<DetailedDefinition> (ordered LCS)
├── examples:     ListDiff<DetailedDefinition> (ordered LCS)
├── sources:      ListDiff<ConceptSource>      (set-based: matched by type|ref)
├── dates:        ListDiff<ConceptDate>         (set-based: matched by type)
├── related:      ListDiff<RelatedConcept>      (set-based: matched by type|ref)
├── metadata:     MetadataDiff                  (scalar fields: entryStatus, domain, etc.)
├── hasChanges
└── walk() → yields { path, change }

ListDiff<T>
├── added:   Added<T>[]     — present only in new
├── removed: Removed<T>[]   — present only in old
├── changed: Changed<T>[]   — present in both but different
├── hasChanges
├── count
└── entries() → yields all Change entries

Change (abstract base)
├── type: 'added' | 'removed' | 'changed'
└── path: string | null

Added      → { type: 'added',    value }
Removed    → { type: 'removed',  value }
Changed    → { type: 'changed',  oldValue, newValue, textDiff? }

MetadataDiff
├── changes: { [field]: Changed }
└── hasChanges

TextDiff
├── oldText, newText
├── hunks: TextHunk[]   (each: type = 'equal'|'added'|'removed', text)
├── hasChanges
├── addedText           (concatenation of all 'added' hunks)
└── removedText         (concatenation of all 'removed' hunks)
```

## Diffing strategies

Two strategies cover the different semantics of Glossarist collections:

### Ordered LCS (`diffList`)

For positional collections where order carries meaning — **definitions,
notes, examples**. Uses Longest Common Subsequence alignment so that
inserting an item at the beginning of a list is reported as one addition,
not as every subsequent item being "changed."

### Unordered identity (`diffSet`)

For collections where order does not carry meaning — **designations,
sources, dates, related concepts**. Items are matched across lists by an
identity key:

| Collection | Identity key |
|---|---|
| Designations | `type \| normalized-text` |
| Sources | `type \| ref.source \| ref.id` |
| Dates | `type` |
| Related concepts | `type \| ref.source \| ref.id` |

Items matched by identity but differing in other fields are reported as
`Changed`. Items present in only one list are `Added` or `Removed`.

### Word-level string diff

When a text-bearing item (definition, note, example) is `Changed`, the
entry carries a `TextDiff` with word-level LCS hunks:

```js
const change = diff.definitions.changed[0];
change.oldValue.content;   // 'old definition text'
change.newValue.content;   // 'new definition text'
change.textDiff.hunks;
// [
//   { type: 'removed', text: 'old' },
//   { type: 'added',   text: 'new' },
//   { type: 'equal',   text: ' definition text' }
// ]
```

## Walker

`ConceptDiff#walk()` yields every change with a dotted path:

```js
for (const { path, change, language } of diff.walk()) {
  // path: 'localizations.eng.designations.changed[0]'
  // change: Changed instance
  // language: 'eng'
}
```

Paths follow the pattern:
```
localizations.<lang>.<section>.<type>[<index>]
localizations.<lang>.<metadata-field>
```

Where `<section>` is one of `designations`, `definitions`, `notes`,
`examples`, `sources`, `dates`, `related`, and `<type>` is `added`,
`removed`, or `changed`.

## Serialization

Every diff result round-trips through `toJSON()` / `fromJSON()`:

```js
const json = diff.toJSON();
const restored = ConceptDiff.fromJSON(json);
diff.equals(restored); // true
```

This makes diffs persistable — store them alongside edition metadata, send
them over a wire, or render them in a UI.

## Common patterns

### Detecting a renamed designation

A renamed term appears as `removed` + `added` (not `changed`), because the
identity key is the designation text:

```js
const d = diff.designations;
if (d.removed.length === 1 && d.added.length === 1 && d.changed.length === 0) {
  console.log(`Renamed: "${d.removed[0].value.designation}" → "${d.added[0].value.designation}"`);
}
```

### Detecting a normative-status change

Same text, different `normativeStatus` → one `changed` entry:

```js
for (const c of diff.designations.changed) {
  if (c.oldValue.normativeStatus !== c.newValue.normativeStatus) {
    console.log(`${c.oldValue.designation}: ${c.oldValue.normativeStatus} → ${c.newValue.normativeStatus}`);
  }
}
```

### Rendering a unified-diff view of a definition change

```js
for (const hunk of diff.definitions.changed[0].textDiff.hunks) {
  const prefix = hunk.type === 'added' ? '+' : hunk.type === 'removed' ? '-' : ' ';
  console.log(`${prefix} ${hunk.text}`);
}
```

## Architecture

The diff module lives in `src/diff/` and is organized by responsibility:

```
src/diff/
├── text-diff.js     — TextHunk, TextDiff, diffText() — LCS word-level
├── change.js        — Change base + Added, Removed, Changed subclasses
├── list-diff.js     — ListDiff, diffList() (ordered LCS), diffSet() (identity)
├── concept-diff.js  — ConceptDiff, LocalizedConceptDiff, MetadataDiff + entry points
├── index.js         — re-exports
└── index.d.ts       — TypeScript declarations
```

All diff result types extend `GlossaristModel`, inheriting `toJSON`,
`fromJSON`, `equals`, and `clone`. The diff module depends on the model
layer; the model layer does not depend on the diff module (the
`Concept#diff` convenience method is the sole exception, and it delegates
to `diffConcepts` without pulling in any diff internals).
