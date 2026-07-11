# Concept Diff

Structured, hierarchical diff for comparing two editions of a Glossarist
concept. Combines object-level diffing (which designations, definitions,
notes, examples, sources changed) with word-level string diffing (what
text changed inside each modified item).

## Quick start

```js
import { diffConcepts } from 'glossarist';

const oldConcept = await loadGcr('edition-2024.gcr').conceptById('3.1.1');
const newConcept = await loadGcr('edition-2025.gcr').conceptById('3.1.1');

const diff = diffConcepts(oldConcept, newConcept, 'eng');

if (diff.hasChanges) {
  console.log(diff.stats); // { added: 3, removed: 1, changed: 2, total: 6 }
  for (const { path, change } of diff.walk()) {
    console.log(`${path}: ${change.type}`);
  }
}
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
│   ├── added: Added<string>[]              (e.g. French localization appeared)
│   └── removed: Removed<string>[]          (e.g. German localization dropped)
├── localizations: { [lang]: LocalizedConceptDiff }
│   ├── designations: ListDiff<Designation>      (set-based: matched by type|text)
│   ├── definitions:  ListDiff<DetailedDefinition> (ordered LCS: matched by full equality)
│   ├── notes:        ListDiff<DetailedDefinition> (ordered LCS)
│   ├── examples:     ListDiff<DetailedDefinition> (ordered LCS)
│   ├── sources:      ListDiff<ConceptSource>      (set-based: matched by type|ref)
│   ├── dates:        ListDiff<ConceptDate>         (set-based: matched by type)
│   ├── related:      ListDiff<RelatedConcept>      (set-based: matched by type|ref)
│   └── metadata:     MetadataDiff                  (14 scalar fields)
├── hasChanges: boolean
├── stats: DiffStats                        ← summary counts
└── walk(): Generator                        ← visits every change with a dotted path
```

All diff result types extend `GlossaristModel` — they have `toJSON()`,
`fromJSON()`, `equals()`, and `clone()`.

## API surface

### Entry points

| Function | Purpose |
|---|---|
| `diffConcepts(old, new, lang)` | Diff two `Concept` instances. Pass `'all'` to diff every language. |
| `diffLocalizedConcepts(oldLoc, newLoc)` | Diff two `LocalizedConcept` instances directly. |
| `diffText(oldText, newText)` | Standalone word-level string diff. |
| `diffList(old, new, opts)` | Ordered LCS list diff. |
| `diffSet(old, new, opts)` | Unordered identity-matched list diff. |
| `concept.diff(other, lang)` | Convenience method on `Concept`. |

### Import styles

```js
// From the main entry — re-exports everything
import { diffConcepts, ConceptDiff } from 'glossarist';

// From the dedicated diff subpath — lighter import
import { diffConcepts, ConceptDiff } from 'glossarist/diff';
```

### Result models

#### `ConceptDiff`

Top-level result. Contains concept-level sections, language set diff,
per-localization diffs, and summary statistics.

| Property | Type | Description |
|---|---|---|
| `oldId` | `string\|null` | ID of the old concept |
| `newId` | `string\|null` | ID of the new concept |
| `concept` | `ConceptLevelDiff` | Concept-wide field changes |
| `languages` | `ListDiff<string>` | Languages added/removed between editions |
| `localizations` | `Record<string, LocalizedConceptDiff>` | Per-language diffs |
| `hasChanges` | `boolean` | True if anything differs anywhere |
| `stats` | `DiffStats` | Summary counts `{ added, removed, changed, total }` |
| `localizationLanguages` | `string[]` | Languages that were actually diffed |

#### `ConceptLevelDiff`

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

#### `LocalizedConceptDiff`

Per-language diff. Mirrors the structure of `LocalizedConcept`.

#### `ListDiff<T>`

Ordered collection of changes.

| Property | Type | Description |
|---|---|---|
| `added` | `Added<T>[]` | Items present only in new |
| `removed` | `Removed<T>[]` | Items present only in old |
| `changed` | `Changed<T>[]` | Items present in both but different |
| `hasChanges` | `boolean` | |
| `count` | `number` | Total entries across all groups |
| `entries()` | `Generator<Change>` | Yields all entries |

#### Change types

All extend `Change` (which extends `GlossaristModel`).

| Class | `type` | Extra fields |
|---|---|---|
| `Added` | `'added'` | `value` |
| `Removed` | `'removed'` | `value` |
| `Changed` | `'changed'` | `oldValue`, `newValue`, `textDiff?` |

`Change.fromJSON(data)` dispatches polymorphically by `data.type` —
returns `Added`, `Removed`, or `Changed` as appropriate.

#### `TextDiff`

Word-level LCS string diff.

| Property | Type | Description |
|---|---|---|
| `oldText` | `string` | |
| `newText` | `string` | |
| `hunks` | `TextHunk[]` | Each: `{ type: 'equal'\|'added'\|'removed', text }` |
| `hasChanges` | `boolean` | |
| `addedText` | `string` | Concatenation of all `'added'` hunks |
| `removedText` | `string` | Concatenation of all `'removed'` hunks |

#### `DiffStats`

Summary counts.

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
const change = diff.localizations.eng.definitions.changed[0];
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
├── text-diff.js     — TextHunk, TextDiff, diffText() — LCS word-level
├── change.js        — Change base + Added, Removed, Changed (polymorphic fromJSON)
├── list-diff.js     — ListDiff, diffList() (ordered LCS), diffSet() (identity)
├── concept-diff.js  — ConceptDiff, ConceptLevelDiff, LocalizedConceptDiff,
│                      MetadataDiff, DiffStats + entry points
├── index.js         — re-exports
└── index.d.ts       — TypeScript declarations
```

The diff module depends on the model layer (`GlossaristModel`). The model
layer's only dependency on the diff module is the `Concept#diff()`
convenience method, which delegates to `diffConcepts()` without pulling in
any diff internals.
