// Percent-encode the characters Turtle's IRIREF production forbids:
// C0 controls, space (U+0020), and <>"{}|^`\. Every character that is
// legal in an IRI (colon, slash, hyphen, dot, non-ASCII, bare %) passes
// through unchanged, so encoding is a no-op for any identifier that is
// already a valid IRI path segment — applying it at construction sites
// never churns existing identifiers.

const IRIREF_FORBIDDEN = new RegExp(`[\\u0000-\\u0020<>"{}|^\`\\\\]`, 'g');

export function encodeIriPathSegment(segment: string): string {
  return segment.replace(IRIREF_FORBIDDEN, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).toUpperCase();
    return `%${hex.length < 2 ? `0${hex}` : hex}`;
  });
}
