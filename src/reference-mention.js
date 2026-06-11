/**
 * Mention parser for {{...}} inline references in concept text.
 *
 * Pure function: takes a raw mention body (the text inside
 * {{...}}) and returns a structured MentionParseResult. The
 * extractor (in src/reference-resolver.js) consumes the
 * structured form to emit Reference objects.
 *
 * Two outcomes in v8:
 *  - 'cite-ref': the mention is {{cite:<key>}} or
 *    {{cite:<key>,<label>}}. The extractor looks the key up in
 *    the current concept's sources list.
 *  - 'numeric': the mention is a bare dotted or dashed id
 *    like {{3.1.1.1}} or {{103-01-02}}. Resolves to a
 *    same-dataset concept.
 *  - 'unresolved': the mention did not match a recognized
 *    form. The extractor silently drops it.
 *
 * The full v6 form-aware parser (URI schemes, short-ids,
 * quoting) is aspirational; v8 only supports the two forms
 * above plus a catch-all unresolved case.
 *
 * @typedef {Object} MentionParseResult
 * @property {'cite-ref' | 'numeric' | 'unresolved'} kind
 * @property {string} [key]   — for 'cite-ref': the local key
 * @property {string} [label] — for 'cite-ref': the inline label
 * @property {string} [id]    — for 'numeric': the bare id
 * @property {string} raw     — the original mention body
 */

const NUMERIC_RE = /^\d+(?:[.-]\d+)+$/;

/**
 * Parse the body of a {{...}} mention (without the braces).
 *
 * The function is pure: no I/O, no model lookups, no state.
 * Resolution of the parsed result is the extractor's job.
 *
 * @param {string} raw — the trimmed text inside {{...}}
 * @returns {MentionParseResult}
 */
export function parseMention(raw) {
  const body = raw.trim();

  // 1. cite:<key> form, with optional ,<label> after the key.
  //    The key must not contain a comma (the comma is the
  //    label separator). Labels can be quoted (CSV-style) to
  //    contain commas; if not quoted, the label is the text
  //    up to the next comma or the end of the mention. The
  //    label may be empty.
  const citeMatch = body.match(/^cite:([^,}]+)(?:,(.*))?$/);
  if (citeMatch) {
    const label = citeMatch[2] !== undefined ? unquoteLabel(citeMatch[2].trim()) : null;
    return {
      kind: 'cite-ref',
      key: citeMatch[1].trim(),
      label,
      raw: body,
    };
  }

  // 2. Bare numeric id: same-dataset concept id.
  if (NUMERIC_RE.test(body)) {
    return {
      kind: 'numeric',
      id: body,
      raw: body,
    };
  }

  // 3. Anything else is unresolved at the parse layer.
  return {
    kind: 'unresolved',
    raw: body,
  };
}

/**
 * Strip surrounding double quotes from a label, unescaping
 * CSV-style "" to a single ". If the input is not quoted,
 * return it unchanged.
 */
function unquoteLabel(label) {
  if (label.length >= 2 && label.startsWith('"') && label.endsWith('"')) {
    return label.slice(1, -1).replace(/""/g, '"');
  }
  return label;
}
