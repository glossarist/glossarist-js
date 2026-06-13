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
 *   {{numeric_id}}                local concept ID
 *   {{numeric_id, render term}}   local concept ID + render term
 *   {{designation}}               designation matching
 *   {{designation, render term}}  designation + render term
 *
 * @typedef {Object} MentionParseResult
 * @property {'cite-ref' | 'urn-ref' | 'numeric' | 'designation' | 'unresolved'} kind
 * @property {string} [key]   — for 'cite-ref': the local key
 * @property {string} [uri]   — for 'urn-ref': the URN
 * @property {string} [label] — render text (always last)
 * @property {string} [id]    — for 'numeric' / 'designation': the id
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

  // 1. cite:<key>[,render] — explicit citation reference.
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

  // 2. urn:...[,render] — URN reference.
  const urnMatch = body.match(/^(urn:[^,}]+)(?:,(.*))?$/);
  if (urnMatch) {
    const label = urnMatch[2] !== undefined ? unquoteLabel(urnMatch[2].trim()) : null;
    return {
      kind: 'urn-ref',
      uri: urnMatch[1].trim(),
      label,
      raw: body,
    };
  }

  // 3. Comma-separated form: {{id, render}}.
  //    ID always comes first, render text always comes last.
  const commaIdx = body.indexOf(',');
  if (commaIdx !== -1) {
    const id = body.slice(0, commaIdx).trim();
    const label = unquoteLabel(body.slice(commaIdx + 1).trim());

    if (NUMERIC_RE.test(id)) {
      return { kind: 'numeric', id, label, raw: body };
    }
    return { kind: 'designation', id, label, raw: body };
  }

  // 4. Bare numeric id.
  if (NUMERIC_RE.test(body)) {
    return { kind: 'numeric', id: body, label: null, raw: body };
  }

  // 5. Anything else is unresolved at the parse layer.
  return { kind: 'unresolved', raw: body };
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
