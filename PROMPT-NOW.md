# PROMPT-NOW: parseMention extension + legacy <<>> deprecation + terminology alignment + raw-HTML validation

> **Context:** concept-browser is implementing a strict DATA/DEPLOYMENT boundary for inline content. This requires glossarist-js to parse the unified `{{kind:target}}` syntax and align terminology. Self-contained — no need to read concept-browser's TODO.

## Background: the principle

**Dataset authors** write `{{kind:target}}` mentions in concept text. They don't know where their dataset will be deployed.

**Concept-browser** resolves every mention at runtime via `ReferenceResolver`. For this to work, `parseMention()` must produce a canonical `{kind, target, label}` shape for every mention kind.

The current parser recognizes `cite:`, `urn:`, `fig:`/`figure:`, `table:`/`tbl:`, `formula:`/`eq:`, and bare designation/numeric. Three new kinds are needed: `link`, `image`, `bib`.

---

## P1: parseMention extension — recognize `link`, `image`, `bib` kinds

### New kinds to parse

| Kind | Example | Parsed shape |
|---|---|---|
| `link` | `{{link:https://example.com/page}}` | `{kind: 'link-ref', uri: 'https://example.com/page', label: null}` |
| `link` | `{{link:https://example.com, click here}}` | `{kind: 'link-ref', uri: 'https://example.com', label: 'click here'}` |
| `image` | `{{image:diagram.png}}` | `{kind: 'image-ref', src: 'diagram.png', alt: null}` |
| `image` | `{{image:diagram.png, The diagram}}` | `{kind: 'image-ref', src: 'diagram.png', alt: 'The diagram'}` |
| `bib` | `{{bib:ref_1}}` | `{kind: 'bib-ref', id: 'ref_1', label: null}` |
| `bib` | `{{bib:ref_1, ISO 704}}` | `{kind: 'bib-ref', id: 'ref_1', label: 'ISO 704'}` |

### Design notes

- `link` uses `uri` (not `id`) because the target is a URL, not a dataset-local handle. The URL is canonical — external to all datasets, deployment-independent.
- `image` uses `src` (not `uri`) and `alt` (not `label`) because it's an embed, not a link. The `alt` field is the accessibility text.
- `bib` uses `id` because it references a dataset-local bibliography entry. This is the case-3-only path — the author explicitly wants a flat bibliographic record, not a concept resolution.

### What these enable in concept-browser

- `{{link:URL}}` → renders as `<a href="URL" target="_blank" rel="noopener">URL or label</a>`. No raw HTML in YAML.
- `{{image:src, alt}}` → renders as `<img src="src" alt="alt">` (with basePath applied to local src). Accessibility contract enforced.
- `{{bib:id}}` → renders as a flat bibliographic record from `bibliography.yaml`. Distinct from `{{cite:id}}` which walks the full resolution cascade.

---

## P2: Legacy `<<target, caption>>` deprecation

### The problem

The AsciiDoc xref syntax `<<target, caption>>` has been overloaded for:
1. **Non-concept entity xrefs** (legitimate AsciiDoc use — should map to `{{fig/table/formula:target, caption}}`)
2. **Bibliography lookups** (wrong — bypasses the resolution cascade)
3. **Concept citations** (wrong — should use `{{cite:target, caption}}`)

### Proposed change

When `parseMention()` (or a pre-parser) encounters `<<target, caption>>`:

1. **Emit a deprecation warning** via a configurable callback:
   ```ts
   export interface ParseOptions {
     onDeprecated?: (message: string, source: string) => void;
   }
   // Usage: parseMention(text, { onDeprecated: console.warn })
   ```

2. **Re-parse** based on what `target` resolves to:
   - If `target` matches a figure/table/formula entity in the dataset → treat as `{{kind:target, caption}}`
   - Otherwise → treat as `{{cite:target, caption}}` (let concept-browser's resolution cascade handle it)

3. **Do NOT** treat as a bibliography lookup. Bibliography is reached only via `{{bib:id}}` (explicit) or via the resolution cascade's case-3 fallback (implicit).

### Migration path

- This release: deprecation warning + re-parse.
- Next minor: warning becomes louder (visible in build output).
- Next major: `<<target, caption>>` is removed. Data must use `{{kind:target}}`.

---

## P3: Citation classification as public API

### Current state

`ReferenceResolver.resolveCite()` returns a `CiteResolution` with `classification`. The types exist but aren't exported from the main entry point.

### Proposed change

```ts
// Export from main entry point
export type CitationClassification =
  | 'internal-citation'        // case 1: co-deployed, link locally
  | 'external-citation'        // case 2: routing table, link externally
  | 'self-contained-citation'  // case 3: flat bib record with link
  | 'unresolved-citation';     // no match

export interface CiteResolution {
  classification: CitationClassification;
  resolved: { registerId: string; conceptId: string } | null;
}

// Document as the canonical entry point
export class ReferenceResolver {
  /**
   * The canonical citation resolution entry point.
   * Walks the cascade: sourceRefs → routing → citation.link → unresolved.
   * Both classification and navigation target come from this one call,
   * so they can never disagree.
   */
  resolveCite(citation: CitationInput, sourceDatasetId?: string): CiteResolution;
}
```

The four classifications are now a public contract — concept-browser renders based on them, and dataset authors can reason about which classification their citations will get.

---

## P4: Non-concept entity naming alignment

### The terminology fix

`NonVerbalEntity` (when referring to Figure/Table/Formula) conflates two categorically different things:
- **Non-verbal designations** (`NonVerbalRepresentation`) — how a concept is designated (symbol `kg`).
- **Non-concept entities** (Figure/Table/Formula) — standalone entities that are NOT concepts.

### Proposed change

```ts
// BEFORE
export class NonVerbalEntity { ... }  // ambiguous — designation or entity?
export class SharedNonVerbalEntity extends NonVerbalEntity { ... }

// AFTER
export class NonConceptEntity { ... }  // clear — NOT a concept (Figure/Table/Formula)
export class NonVerbRep { ... }        // unchanged — IS a non-verbal designation

// Deprecated alias for backward compat
/** @deprecated Use NonConceptEntity instead. */
export const SharedNonVerbalEntity = NonConceptEntity;
```

Keep `NonVerbRep` unchanged — it IS a non-verbal representation (a designation of a concept).

Update `glossarist/models` subpath exports to use the new names. Provide deprecated aliases for one release cycle.

---

## P5: Raw-HTML validation in concept text

### The problem

Concept text sometimes contains raw HTML instead of typed mention syntax:
```yaml
# BAD — raw HTML in YAML
definition:
  - content: See <a href="http://std.iec.ch/...">IEV</a> for details.
```

This bypasses the renderer, is brittle, has no accessibility contract, and can embed deployment-specific URLs.

### Proposed change

Add a validator function:

```ts
export interface HtmlValidationIssue {
  severity: 'warning' | 'error';
  message: string;
  match: string;
  suggestion: string;
}

/**
 * Scan concept text for raw HTML and suggest typed mention replacements.
 * Opt-in — concept-browser can call this during data loading.
 */
export function validateNoRawHtml(text: string): HtmlValidationIssue[];
```

Replacement suggestions:

| Raw HTML | Suggested replacement |
|---|---|
| `<a href="URL">label</a>` | `{{link:URL, label}}` |
| `<a href="URL">URL</a>` | `{{link:URL}}` |
| `<img src="SRC">` | `{{image:SRC}}` |
| `<img src="SRC" alt="ALT">` | `{{image:SRC, ALT}}` |
| `<iframe src="URL">` | `{{link:URL}}` (iframes not supported as embeds) |

---

## Summary

| Change | Impact |
|---|---|
| P1: parseMention extension | New parsed shapes for `link`, `image`, `bib` |
| P2: Legacy `<<>>` deprecation | Warning + re-parse; no behavior break |
| P3: Citation classification API | Types exported; `resolveCite` documented as canonical |
| P4: Terminology rename | `NonVerbalEntity` → `NonConceptEntity` (with deprecated alias) |
| P5: Raw-HTML validator | New `validateNoRawHtml()` function |

## Coordination

- **concept-model** needs schema changes for the new kinds and terminology (parallel PROMPT-NOW.md).
- **glossarist-ruby** needs the same parser extension (parallel PROMPT-NOW.md).
- **concept-browser** wires the resolvers once glossarist-js ships the new parse output.
- A **shared contract test fixture** (a concept with every kind of mention) should be consumed by all implementations to prevent syntax drift.
