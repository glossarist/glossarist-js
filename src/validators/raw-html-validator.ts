// Raw-HTML validator for concept text.
//
// Concept text should use typed mention syntax ({{link:URL}},
// {{image:SRC,ALT}}) instead of raw HTML. Raw HTML bypasses the
// renderer, is brittle, has no accessibility contract, and can embed
// deployment-specific URLs.
//
// This validator scans text and suggests typed mention replacements.
// Opt-in — concept-browser calls this during data loading.
//
// Per PROMPT-NOW.md P5.

export interface HtmlValidationIssue {
  severity: 'warning' | 'error';
  message: string;
  match: string;
  suggestion: string;
}

interface RawHtmlPattern {
  readonly regex: RegExp;
  readonly message: string;
  readonly buildSuggestion: (match: string) => string;
}

const PATTERNS: readonly RawHtmlPattern[] = [
  {
    // <a href="URL">label</a> → {{link:URL, label}}
    regex: /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,
    message: 'Raw <a> tag — use typed mention syntax for links',
    buildSuggestion: (match) => {
      const m = match.match(/href=["']([^"']+)["']/i);
      const labelMatch = match.match(/>([^<]*)<\//);
      const url = m?.[1] ?? 'URL';
      const label = labelMatch?.[1]?.trim();
      return label && label !== url
        ? `{{link:${url}, ${label}}}`
        : `{{link:${url}}}`;
    },
  },
  {
    // <img src="SRC" alt="ALT"> → {{image:SRC, ALT}}
    regex: /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,
    message: 'Raw <img> tag — use typed mention syntax for images',
    buildSuggestion: (match) => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      const altMatch = match.match(/alt=["']([^"']+)["']/i);
      const src = srcMatch?.[1] ?? 'SRC';
      const alt = altMatch?.[1];
      return alt ? `{{image:${src}, ${alt}}}` : `{{image:${src}}}`;
    },
  },
  {
    // <iframe src="URL"> → {{link:URL}} (iframes not supported as embeds)
    regex: /<iframe\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/iframe>/gi,
    message: 'Raw <iframe> tag — iframes are not supported as embeds; use a link',
    buildSuggestion: (match) => {
      const m = match.match(/src=["']([^"']+)["']/i);
      return `{{link:${m?.[1] ?? 'URL'}}}`;
    },
  },
];

/**
 * Scan concept text for raw HTML and suggest typed mention replacements.
 *
 * Returns one issue per raw HTML tag found. Callers can display these
 * as warnings during data loading or as errors in CI.
 */
export function validateNoRawHtml(text: string): HtmlValidationIssue[] {
  if (!text || typeof text !== 'string') return [];
  const issues: HtmlValidationIssue[] = [];
  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.regex.exec(text)) !== null) {
      issues.push({
        severity: 'warning',
        message: pattern.message,
        match: m[0]!,
        suggestion: pattern.buildSuggestion(m[0]!),
      });
    }
  }
  return issues;
}
