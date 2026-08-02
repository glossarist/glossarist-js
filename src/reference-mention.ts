/**
 * Mention parser for {{...}} inline references in concept text.
 *
 * Pure function: takes a raw mention body (the text inside
 * {{...}}) and returns a structured MentionParseResult.
 *
 * Convention: the ID always comes first, the display (render) text
 * always comes last.  Every comma-separated form follows this:
 *
 *   {{cite:key}}                  cite-key (source id)
 *   {{cite:key, render term}}     cite-key + render term
 *   {{urn:...}}                   URN reference
 *   {{urn:..., render term}}      URN + render term
 *   {{link:URL}}                  external link
 *   {{link:URL, label}}           external link with label
 *   {{image:src}}                 embedded image
 *   {{image:src, alt}}            embedded image with alt text
 *   {{bib:id}}                    bibliography record
 *   {{bib:id, label}}             bibliography record with label
 *   {{numeric_id}}                local concept ID
 *   {{numeric_id, render term}}   local concept ID + render term
 *   {{designation}}               designation matching
 *   {{designation, render term}}  designation + render term
 */

const NUMERIC_RE = /^\d+(?:[.-]\d+)+$/;

interface NvrPrefixEntry {
  readonly prefix: string;
  readonly kind: MentionKind;
}

const NVR_PREFIXES: readonly NvrPrefixEntry[] = Object.freeze([
  { prefix: 'fig:', kind: 'fig-ref' },
  { prefix: 'table:', kind: 'table-ref' },
  { prefix: 'formula:', kind: 'formula-ref' },
]);

export type MentionKind =
  | 'cite-ref'
  | 'urn-ref'
  | 'link-ref'
  | 'image-ref'
  | 'bib-ref'
  | 'numeric'
  | 'designation'
  | 'unresolved'
  | 'fig-ref'
  | 'table-ref'
  | 'formula-ref';

export interface MentionParseResult {
  kind: MentionKind;
  /** cite-ref / fig-ref / table-ref / formula-ref: the local key */
  key?: string;
  /** urn-ref / link-ref: the URI */
  uri?: string;
  /** image-ref: the image source path */
  src?: string;
  /** image-ref: accessibility text */
  alt?: string | null;
  /** bib-ref / numeric / designation: the identifier */
  id?: string;
  /** render text (cite-ref, urn-ref, numeric, designation, bib-ref, fig/table/formula-ref) */
  label?: string | null;
  raw: string;
}

export interface ParseOptions {
  /**
   * Called when a deprecated syntax is encountered (e.g. `<<target, caption>>`).
   * The callback receives a human-readable message and the source text.
   */
  onDeprecated?: (message: string, source: string) => void;
}

/**
 * Parse the body of a {{...}} mention (without the braces).
 *
 * Pure: no I/O, no model lookups, no state. Resolution is the caller's job.
 */
export function parseMention(raw: string, _options?: ParseOptions): MentionParseResult {
  const body = raw.trim();

  // 1. cite:<key>[,label] — explicit citation reference.
  const citeMatch = body.match(/^cite:([^,}]+)(?:,(.*))?$/);
  if (citeMatch) {
    return {
      kind: 'cite-ref',
      key: citeMatch[1]!.trim(),
      label: citeMatch[2] !== undefined ? unquoteLabel(citeMatch[2]!.trim()) : null,
      raw: body,
    };
  }

  // 2. bib:<id>[,label] — flat bibliography record (case-3-only path).
  const bibMatch = body.match(/^bib:([^,}]+)(?:,(.*))?$/);
  if (bibMatch) {
    return {
      kind: 'bib-ref',
      id: bibMatch[1]!.trim(),
      label: bibMatch[2] !== undefined ? unquoteLabel(bibMatch[2]!.trim()) : null,
      raw: body,
    };
  }

  // 3. link:<uri>[,label] — external link.
  const linkMatch = body.match(/^link:([^,}]+)(?:,(.*))?$/);
  if (linkMatch) {
    return {
      kind: 'link-ref',
      uri: linkMatch[1]!.trim(),
      label: linkMatch[2] !== undefined ? unquoteLabel(linkMatch[2]!.trim()) : null,
      raw: body,
    };
  }

  // 4. image:<src>[,alt] — embedded image.
  const imageMatch = body.match(/^image:([^,}]+)(?:,(.*))?$/);
  if (imageMatch) {
    return {
      kind: 'image-ref',
      src: imageMatch[1]!.trim(),
      alt: imageMatch[2] !== undefined ? unquoteLabel(imageMatch[2]!.trim()) : null,
      raw: body,
    };
  }

  // 5. urn:...[,label] — URN reference.
  const urnMatch = body.match(/^(urn:[^,}]+)(?:,(.*))?$/);
  if (urnMatch) {
    return {
      kind: 'urn-ref',
      uri: urnMatch[1]!.trim(),
      label: urnMatch[2] !== undefined ? unquoteLabel(urnMatch[2]!.trim()) : null,
      raw: body,
    };
  }

  // 6. NVR prefixes (fig:/table:/formula:).
  for (const { prefix, kind } of NVR_PREFIXES) {
    const escPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = body.match(new RegExp(`^${escPrefix}([^,}]+)(?:,(.*))?$`));
    if (match) {
      return {
        kind,
        key: match[1]!.trim(),
        label: match[2] !== undefined ? unquoteLabel(match[2]!.trim()) : null,
        raw: body,
      };
    }
  }

  // 7. Comma-separated form: {{id, label}}.
  const commaIdx = body.indexOf(',');
  if (commaIdx !== -1) {
    const id = body.slice(0, commaIdx).trim();
    const label = unquoteLabel(body.slice(commaIdx + 1).trim());
    if (NUMERIC_RE.test(id)) {
      return { kind: 'numeric', id, label, raw: body };
    }
    return { kind: 'designation', id, label, raw: body };
  }

  // 8. Bare numeric id.
  if (NUMERIC_RE.test(body)) {
    return { kind: 'numeric', id: body, label: null, raw: body };
  }

  // 9. Unresolved.
  return { kind: 'unresolved', raw: body };
}

export interface ExtractedMention {
  /** The parsed mention result */
  result: MentionParseResult;
  /** Full text including braces, e.g. `{{cite:foo}}` or `<<target,caption>>` */
  fullMatch: string;
  /** Start offset in the source text */
  start: number;
  /** End offset in the source text */
  end: number;
}

/**
 * Extract all inline mentions from concept text. Handles both:
 * - `{{kind:target[,label]}}` — the canonical syntax
 * - `<<target, caption>>` — legacy AsciiDoc xref (deprecated)
 *
 * For `<<...>>` syntax, emits a deprecation warning via `options.onDeprecated`
 * and re-parses the inner content as if it were a `{{...}}` mention.
 *
 * The re-parse strategy:
 * - If the target looks like a fig/table/formula entity → treat as that kind
 * - Otherwise → treat as a cite (let the resolution cascade handle it)
 */
export function* extractMentionsFromText(
  text: string,
  options: ParseOptions = {},
): Generator<ExtractedMention> {
  // Combined regex: matches either {{...}} or <<...>>.
  // {{...}} takes precedence (non-greedy on inner content).
  const re = /\{\{([^{}]*?)\}\}|<<([^<>]*?)>>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0]!;
    const start = m.index;
    const end = start + fullMatch.length;

    if (m[1] !== undefined) {
      // {{...}} — canonical syntax
      const result = parseMention(m[1]!, options);
      yield { result, fullMatch, start, end };
    } else if (m[2] !== undefined) {
      // <<...>> — deprecated AsciiDoc xref syntax
      const inner = m[2]!;
      if (options.onDeprecated) {
        options.onDeprecated(
          `Deprecated syntax: <<${inner}>>. Use {{kind:target}} instead. ` +
          `For figures/tables/formulas: {{fig:target}}, {{table:target}}, {{formula:target}}. ` +
          `For citations: {{cite:target}}.`,
          fullMatch,
        );
      }
      // Re-parse: check if target matches an entity prefix, else fall back to cite.
      const result = reparseLegacyXref(inner);
      yield { result, fullMatch, start, end };
    }
  }
}

/**
 * Re-parse a `<<target, caption>>` body into a MentionParseResult.
 *
 * Strategy:
 * - If target starts with fig:/table:/formula: → use that kind
 * - Otherwise → treat as {{cite:target, caption}} (resolution cascade handles it)
 */
function reparseLegacyXref(inner: string): MentionParseResult {
  const body = inner.trim();
  const commaIdx = body.indexOf(',');
  const target = commaIdx !== -1 ? body.slice(0, commaIdx).trim() : body;
  const caption = commaIdx !== -1 ? unquoteLabel(body.slice(commaIdx + 1).trim()) : null;

  // Check for entity prefixes first.
  for (const { prefix, kind } of NVR_PREFIXES) {
    if (target.startsWith(prefix)) {
      const entityId = target.slice(prefix.length).trim();
      return {
        kind,
        key: entityId,
        label: caption,
        raw: body,
      };
    }
  }

  // Default: treat as a cite reference. The resolution cascade
  // (sourceRefs → routing → citation.link → unresolved) handles it.
  return {
    kind: 'cite-ref',
    key: target,
    label: caption,
    raw: body,
  };
}

function unquoteLabel(label: string): string {
  if (label.length >= 2 && label.startsWith('"') && label.endsWith('"')) {
    return label.slice(1, -1).replace(/""/g, '"');
  }
  return label;
}
