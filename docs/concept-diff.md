# Concept Diff

Structured, hierarchical diff for comparing two editions of a Glossarist
concept or concept collection. Combines object-level diffing (which
designations, definitions, notes, examples, sources changed) with
word-level string diffing (what text changed inside each modified item),
similarity scoring, human-readable rendering, and patch application.

## Quick start

```js
import {
  diffConcepts,
  diffConceptCollections,
  applyDiff,
  reverseDiff,
  renderConceptDiff,
} from 'glossarist/diff';

// Compare two editions of a single concept
const oldConcept = await loadGcr('edition-2024.gcr').conceptById('3.1.1');
const newConcept = await loadGcr('edition-2025.gcr').conceptById('3.1.1');

const diff = diffConcepts(oldConcept, newConcept, 'eng');

console.log(diff.similarity);                        // 0.85
console.log(diff.stats.toJSON());                    // { added: 3, removed: 1, changed: 2 }
console.log(renderConceptDiff(diff, { colors: true })); // human-readable

// Compare entire glossary editions
const collectionDiff = diffConceptCollections(oldConcepts, newConcepts);
console.log(collectionDiff.matched);   // Added<string>[] — IDs in both
console.log(collectionDiff.added);     // Added<string>[] — new in this edition
console.log(collectionDiff.removed);   // Removed<string>[] — dropped

// Apply a diff as a forward patch
const reconstructed = applyDiff(oldConcept, diff);

// Reverse a diff (swap added ↔ removed, old ↔ new)
const backToOld = applyDiff(newConcept, reverseDiff(diff));
```

## Architecture

```
ConceptDiff
├── oldId, newId
├── concept: ConceptLevelDiff              ← concept-wide fields
│   ├── sources: ListDiff<ConceptSource>
│   ├── dates: ListDiff<ConceptDate>
│   ├── relatedConcepts: ListDiff<RelatedConcept>
│   ├── groups: ListDiff<string>
│   ├── sections: ListDiff<string>
│   ├── tags: ListDiff<string>
│   └── metadata: MetadataDiff              (status, term, uri, schemaVersion)
├── languages: ListDiff<string>             ← languages added/removed between editions
├── localizations: { [lang]: LocalizedConceptDiff }
│   ├── designations: ListDiff<Designation>      (set-based: matched by type|text)
│   ├── definitions:  ListDiff<DetailedDefinition> (ordered LCS: full-equality match)
│   ├── notes:        ListDiff<DetailedDefinition> (ordered LCS)
│   ├── examples:     ListDiff<DetailedDefinition> (ordered LCS)
│   ├── sources:      ListDiff<ConceptSource>      (set-based: matched by type|ref)
│   ├── dates:        ListDiff<ConceptDate>         (set-based: matched by type)
│   ├── related:      ListDiff<RelatedConcept>      (set-based: matched by type|ref)
│   └── metadata:     MetadataDiff                  (14 scalar fields)
├── hasChanges: boolean
├── stats: DiffStats                        ← { added, removed, changed, total }
├── similarity: number                      ← 0.0–1.0 (1.0 = identical)
└── walk(): Generator                        ← visits every change with a dotted path
```

All diff result types extend `GlossaristModel` — they have `toJSON()`,
`fromJSON()`, `equals()`, and `clone()`.

## Import styles

```js
// From the main entry
import { diffConcepts, ConceptDiff } from 'glossarist';

// From the dedicated diff subpath (lighter, avoids pulling in GCR I/O)
import { diffConcepts, applyDiff, renderConceptDiff } from 'glossarist/diff';
```

## API surface

### Entry points

| Function | Purpose |
|---|---|
| `diffConcepts(old, new, lang)` | Diff two `Concept` instances. Pass `'all'` to diff every language. |
| `diffLocalizedConcepts(oldLoc, newLoc)` | Diff two `LocalizedConcept` instances directly. |
| `diffConceptCollections(old, new, opts)` | Diff two concept collections (editions). Matches by ID. |
| `diffText(oldText, newText)` | Standalone word-level string diff. |
| `diffList(old, new, opts)` | Ordered LCS list diff. |
| `diffSet(old, new, opts)` | Unordered identity-matched list diff. |
| `applyDiff(oldConcept, diff)` | Forward patch: reconstruct new concept from old + diff. |
| `reverseDiff(diff)` | Invert a diff (swap added ↔ removed, old ↔ new). |
| `renderConceptDiff(diff, opts)` | Human-readable text output for a concept diff. |
| `renderCollectionDiff(diff, opts)` | Human-readable text output for a collection diff. |
| `renderTextDiff(textDiff, opts)` | Human-readable text output for a word-level diff. |
| `concept.diff(other, lang)` | Convenience method on `Concept`. |

### `ConceptDiff`

| Property | Type | Description |
|---|---|---|
| `oldId` | `string\|null` | ID of the old concept |
| `newId` | `string\|null` | ID of the new concept |
| `concept` | `ConceptLevelDiff` | Concept-wide field changes |
| `languages` | `ListDiff<string>` | Languages added/removed between editions |
| `localizations` | `Record<string, LocalizedConceptDiff>` | Per-language diffs |
| `hasChanges` | `boolean` | True if anything differs |
| `stats` | `DiffStats` | Summary counts `{ added, removed, changed, total }` |
| `similarity` | `number` | Float in `[0.0, 1.0]` — 1.0 = identical |
| `localizationLanguages` | `string[]` | Languages that were diffed |
| `walk()` | `Generator` | Yields `{ path, change, language }` for every change |

### `ConceptCollectionDiff`

| Property | Type | Description |
|---|---|---|
| `oldCount` | `number` | Number of concepts in old collection |
| `newCount` | `number` | Number of concepts in new collection |
| `matched` | `Added<string>[]` | Concept IDs in both old and new |
| `added` | `Added<string>[]` | Concept IDs only in new |
| `removed` | `Removed<string>[]` | Concept IDs only in old |
| `conceptDiffs` | `Record<string, ConceptDiff>` | Per-concept diff for changed concepts |
| `changedIds` | `string[]` | IDs of concepts with changes |
| `hasChanges` | `boolean` | |
| `stats` | `DiffStats` | Aggregated counts across all per-concept diffs |
| `similarity` | `number` | Average per-concept similarity for matched concepts |
| `walk()` | `Generator` | Yields collection-level and per-concept entries |

### `LocalizedConceptDiff`

Per-language diff. Mirrors the structure of `LocalizedConcept`. Has the
same `hasChanges`, `stats`, `similarity`, and `walk()` interface as
`ConceptDiff` (scoped to one language).

### `ConceptLevelDiff`

Concept-wide fields that exist outside any single localization.

| Property | Type | Strategy |
|---|---|---|
| `sources` | `ListDiff<ConceptSource>` | Set-based (matched by `type\|ref.source\|ref.id`) |
| `dates` | `ListDiff<ConceptDate>` | Set-based (matched by `type`) |
| `relatedConcepts` | `ListDiff<RelatedConcept>` | Set-based (matched by `type\|ref`) |
| `groups` | `ListDiff<string>` | Set-based |
| `sections` | `ListDiff<string>` | Set-based |
| `tags` | `ListDiff<string>` | Set-based |
| `metadata` | `MetadataDiff` | Scalars: `status`, `term`, `uri`, `schemaVersion` |

### `ListDiff<T>`

| Property | Type | Description |
|---|---|---|
| `added` | `Added<T>[]` | Items present only in new |
| `removed` | `Removed<T>[]` | Items present only in old |
| `changed` | `Changed<T>[]` | Items present in both but different |
| `hasChanges` | `boolean` | |
| `count` | `number` | Total entries across all groups |
| `entries()` | `Generator<Change>` | Yields all entries |

### Change types

All extend `Change` (which extends `GlossaristModel`).

| Class | `type` | Extra fields |
|---|---|---|
| `Added` | `'added'` | `value` |
| `Removed` | `'removed'` | `value` |
| `Changed` | `'changed'` | `oldValue`, `newValue`, `textDiff?` |

`Change.fromJSON(data)` dispatches polymorphically by `data.type`.

### `TextDiff`

Word-level LCS string diff.

| Property | Type | Description |
|---|---|---|
| `oldText` | `string` | |
| `newText` | `string` | |
| `hunks` | `TextHunk[]` | Each: `{ type: 'equal'\|'added'\|'removed', text }` |
| `hasChanges` | `boolean` | |
| `addedText` | `string` | Concatenation of all `'added'` hunks |
| `removedText` | `string` | Concatenation of all `'removed'` hunks |

### `DiffStats`

| Property | Type |
|---|---|
| `added` | `number` |
| `removed` | `number` |
| `changed` | `number` |
| `total` | `number` |

## Diffing strategies

### Ordered LCS (`diffList`)

For positional collections where order carries meaning — **definitions,
notes, examples**. Uses Longest Common Subsequence alignment so that
inserting an item at the beginning of a list is reported as one addition,
not as every subsequent item being "changed."

Identity matching uses full object equality (`JSON.stringify(toJSON())`),
so a definition with the same content but different sources is correctly
detected as `Changed`, not silently treated as equal.

### Unordered identity (`diffSet`)

For collections where order does not carry meaning — **designations,
sources, dates, related concepts, groups, sections, tags**. Items are
matched across lists by an identity key:

| Collection | Identity key |
|---|---|
| Designations | `type \| normalized-text` |
| Sources | `type \| ref.source \| ref.id` |
| Dates | `type` |
| Related concepts | `type \| ref.source \| ref.id` |
| Groups / Sections / Tags | string value |

Items matched by identity but differing in other fields are reported as
`Changed`. Items present in only one list are `Added` or `Removed`.

### Word-level string diff

When a text-bearing item (definition, note, example, date) is `Changed`,
the entry carries a `TextDiff` with word-level LCS hunks:

```js
const change = diff.localization('eng').definitions.changed[0];
change.oldValue.content;   // 'old definition text'
change.newValue.content;   // 'new definition text'
change.textDiff.hunks;
// [
//   { type: 'removed', text: 'old' },
//   { type: 'added',   text: 'new' },
//   { type: 'equal',   text: ' definition text' }
// ]
```

## Similarity score

`ConceptDiff.similarity` and `ConceptCollectionDiff.similarity` return a
float in `[0.0, 1.0]` where 1.0 = identical and 0.0 = completely different.

The score is computed as `1 - (changes / totalComparableItems)` where
`totalComparableItems` is the count of every list item and metadata field
slot across both concepts, counted during diff computation.

```js
const diff = diffConcepts(old, newConcept, 'eng');
console.log(diff.similarity);       // 0.85
console.println(diff.stats.total);  // 6 changes out of ~40 comparable items
```

Collection similarity is the average of per-concept similarities for
matched concepts. Added and removed concepts do not affect the average
(they have no per-concept diff).

## Collection diff

`diffConceptCollections(old, new, options)` compares two editions at the
collection level — which concepts were added, removed, or changed.

```js
import { diffConceptCollections } from 'glossarist/diff';

const result = diffConceptCollections(oldConcepts, newConcepts, {
  language: 'eng',         // default: 'eng'; pass 'all' for all languages
  skipUnchanged: true,     // omit ConceptDiff for byte-identical concepts
});

result.oldCount;     // number of concepts in old
result.newCount;     // number of concepts in new
result.matched;      // Added<string>[] — concept IDs in both
result.added;        // Added<string>[] — concept IDs only in new
result.removed;      // Removed<string>[] — concept IDs only in old
result.conceptDiffs; // { [id]: ConceptDiff } — per-concept diff for changed
result.changedIds;   // string[] — IDs with changes
result.similarity;   // average per-concept similarity
result.stats;        // aggregated DiffStats
```

Accepts `ConceptCollection`, `ManagedConceptCollection`, plain `Concept[]`,
or any iterable.

`skipUnchanged` is a performance optimization for large collections: it
detects byte-identical concepts (via `equals()`) and omits their
`ConceptDiff` from the result, avoiding expensive per-field diffing.

## Rendering

`renderConceptDiff`, `renderCollectionDiff`, and `renderTextDiff` produce
human-readable text output:

```js
import { renderConceptDiff } from 'glossarist/diff';

const text = renderConceptDiff(diff, { colors: true });
console.log(text);
```

Output example:
```
Concept "3.1.1" — 71% similar

Concept-level:
  Tags:
    + updated

Languages:
  + fra

Localization (eng):
  Designations:
    + adjustment of a measuring system (preferred)
    - adjustment (preferred)
  Definitions:
    ~ old definition text → new definition text
  Notes:
    + Note 1: The calibration must be traceable.
  Metadata:
    ~ entryStatus: valid → superseded
```

Options:
- `colors` (boolean, default `false`) — ANSI color codes for terminal
- `showUnchanged` (boolean, default `false`) — show unchanged sections

Collection rendering produces a summary with counts, added/removed IDs,
and per-concept similarity percentages:

```
Collection comparison — 83% similar overall
  Old: 3 concepts
  New: 3 concepts
  Matched: 2
  Added: 1
  Removed: 1

Added concepts:
  + 3.1.4

Removed concepts:
  - 3.1.3

Changed concepts:
  3.1.1: 71%
  3.1.2: 95%
```

## Patch application

`applyDiff(oldConcept, diff)` applies a forward patch — takes an old
concept and a diff, produces what the new concept should be:

```js
import { applyDiff } from 'glossarist/diff';

const reconstructed = applyDiff(oldConcept, diff);
```

`reverseDiff(diff)` inverts a diff — swaps `Added` ↔ `Removed` and
`oldValue` ↔ `newValue` in every `Changed` entry, and reverses all
`TextDiff` hunks:

```js
import { reverseDiff, applyDiff } from 'glossarist/diff';

const reversePatch = reverseDiff(diff);
const backToOld = applyDiff(newConcept, reversePatch);
```

**Limitation:** when a list has simultaneous add + change operations (e.g.
one note edited and another inserted in the same list), the patch produces
the correct *set* of items but may not preserve exact *ordering*. This is
because the diff doesn't carry positional information for each operation.
For byte-exact round-trips, compare concepts semantically rather than by
JSON equality.

## Walker

`ConceptDiff#walk()` yields every change with a dotted path and the
language code (for localization-level changes):

```js
for (const { path, change, language } of diff.walk()) {
  // concept.tags.added[0]           — concept-level (language is undefined)
  // languages.added[0]              — language set (language is undefined)
  // localizations.eng.designations.changed[0]  — localization-level
}
```

Path patterns:
```
concept.sources.added[<i>]
concept.dates.changed[<i>]
concept.relatedConcepts.removed[<i>]
concept.groups.added[<i>]
concept.sections.removed[<i>]
concept.tags.added[<i>]
concept.metadata.<field>
languages.added[<i>]
languages.removed[<i>]
localizations.<lang>.designations.<type>[<i>]
localizations.<lang>.definitions.<type>[<i>]
localizations.<lang>.notes.<type>[<i>]
localizations.<lang>.examples.<type>[<i>]
localizations.<lang>.sources.<type>[<i>]
localizations.<lang>.dates.<type>[<i>]
localizations.<lang>.related.<type>[<i>]
localizations.<lang>.metadata.<field>
```

Where `<type>` is `added`, `removed`, or `changed`.

## Serialization

Every diff result type round-trips through `toJSON()` / `fromJSON()`:

```js
const json = diff.toJSON();
const restored = ConceptDiff.fromJSON(json);
diff.equals(restored); // true
```

This makes diffs persistable — store them alongside edition metadata, send
them over a wire, or render them in a UI.

## Module structure

```
src/diff/
├── text-diff.js       — TextHunk, TextDiff, diffText() — LCS word-level
├── change.js          — Change base + Added, Removed, Changed (polymorphic fromJSON)
├── list-diff.js       — ListDiff, diffList() (ordered LCS), diffSet() (identity)
├── concept-diff.js    — ConceptDiff, ConceptLevelDiff, LocalizedConceptDiff,
│                        MetadataDiff, DiffStats + similarity scoring
├── collection-diff.js — ConceptCollectionDiff, diffConceptCollections()
├── diff-renderer.js   — renderConceptDiff, renderCollectionDiff, renderTextDiff
├── diff-patch.js      — applyDiff, reverseDiff
├── index.js           — re-exports
└── index.d.ts         — TypeScript declarations
```

The diff module depends on the model layer (`GlossaristModel`). The model
layer's only dependency on the diff module is the `Concept#diff()`
convenience method, which delegates to `diffConcepts()` without pulling in
any diff internals.
