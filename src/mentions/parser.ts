/**
 * Strict inline mention parser — implements the grammar defined in
 * concept-model/docs/design/inline-mentions-implementation-guide.md.
 *
 * Key principle: invalid mentions produce errors, they are NEVER
 * silently passed through.
 */

export type TargetType = 'urn' | 'dataset_qualified' | 'entity_id' | 'url' | 'path';

export interface Target {
  type: TargetType;
  urn?: string;
  dataset?: string;
  id?: string;
  url?: string;
  path?: string;
}

export type MentionKind = 'concept' | 'cite' | 'fig' | 'table' | 'formula' | 'bib' | 'link' | 'image';

export interface Mention {
  kind: MentionKind;
  target: Target;
  label: string | null;
  raw: string;
  start: number;
  end: number;
}

export interface TextSegment {
  kind: 'text';
  content: string;
  start: number;
  end: number;
}

export type Segment = Mention | TextSegment;

export class InvalidMentionError extends Error {
  constructor(
    public readonly raw: string,
    public readonly reason: string,
    public readonly position: number,
  ) {
    super(`Invalid mention at position ${position}: ${reason}`);
    this.name = 'InvalidMentionError';
  }
}

const URL_RE = /^https?:\/\/.+/;
const URN_RE = /^urn:[^:]+:.+/;
const DATASET_QUALIFIED_RE = /^([A-Za-z][A-Za-z0-9_-]*):(.+)$/;

/**
 * Parse a target string into a structured Target object.
 * Colon splitting: for DATASET:ID, split on the LAST colon.
 */
function parseTarget(text: string): Target {
  const trimmed = text.trim();

  if (URN_RE.test(trimmed)) {
    return { type: 'urn', urn: trimmed };
  }
  if (URL_RE.test(trimmed)) {
    return { type: 'url', url: trimmed };
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return { type: 'path', path: trimmed };
  }
  const dsMatch = trimmed.match(DATASET_QUALIFIED_RE);
  if (dsMatch) {
    const lastColon = trimmed.lastIndexOf(':');
    return {
      type: 'dataset_qualified',
      dataset: trimmed.slice(0, lastColon),
      id: trimmed.slice(lastColon + 1),
    };
  }
  return { type: 'entity_id', id: trimmed };
}

/**
 * Validate that a target type is acceptable for a given mention kind.
 * Throws InvalidMentionError if the combination is invalid.
 */
function validateTargetForKind(kind: MentionKind, target: Target, raw: string, position: number): void {
  const allowed: Record<MentionKind, TargetType[]> = {
    concept: ['dataset_qualified', 'urn', 'entity_id'],
    cite: ['dataset_qualified', 'urn'],
    fig: ['entity_id', 'urn'],
    table: ['entity_id', 'urn'],
    formula: ['entity_id', 'urn'],
    bib: ['entity_id'],
    link: ['url'],
    image: ['path', 'url'],
  };

  const accepted = allowed[kind];
  if (!accepted.includes(target.type)) {
    const targetDesc = target.type === 'dataset_qualified'
      ? `DATASET:ID '${target.dataset}:${target.id}'`
      : target.type === 'urn'
        ? `URN '${target.urn}'`
        : target.type === 'url'
          ? `URL '${target.url}'`
          : target.type === 'path'
            ? `path '${target.path}'`
            : `bare ID '${target.id}'`;

    const acceptDesc = accepted.join(' or ');
    throw new InvalidMentionError(
      raw,
      `${kind} target must be ${acceptDesc}; got ${targetDesc}`,
      position,
    );
  }
}

/**
 * Parse a single mention body (the content inside {{...}}).
 * Returns a Mention object or throws InvalidMentionError.
 */
export function parseMentionStrict(raw: string, position: number = 0): Mention {
  const body = raw.trim();

  // Implicit same-dataset concept reference — no kind prefix needed.
  // {{17-12, label}} and {{designation text, label}} are valid local
  // concept references within the same dataset.
  // Only check for implicit forms when there's no recognized kind: prefix.
  const colonIdx = body.indexOf(':');
  const KNOWN_KINDS = ['concept', 'cite', 'fig', 'table', 'formula', 'bib', 'link', 'image'];

  // Check if the text before the first colon is a known kind
  const possibleKind = colonIdx > 0 ? body.slice(0, colonIdx).trim().toLowerCase() : '';
  const hasKnownKind = KNOWN_KINDS.includes(possibleKind);

  if (!hasKnownKind) {
    // No kind prefix → implicit same-dataset concept reference.
    // Split target,label (same as explicit kinds)
    const commaIdx = body.indexOf(',');
    const targetStr = (commaIdx >= 0 ? body.slice(0, commaIdx) : body).trim();
    const label = commaIdx >= 0 ? body.slice(commaIdx + 1).trim() : null;
    const target = parseTarget(targetStr);
    return {
      kind: 'concept',
      target,
      label,
      raw: body,
      start: position,
      end: position + raw.length,
    };
  }

  const kindStr = possibleKind;
  const rest = body.slice(colonIdx + 1);

  // Split target,label
  const commaIdx = rest.indexOf(',');
  const targetStr = (commaIdx >= 0 ? rest.slice(0, commaIdx) : rest).trim();
  const label = commaIdx >= 0 ? rest.slice(commaIdx + 1).trim() : null;

  const VALID_KINDS: MentionKind[] = ['concept', 'cite', 'fig', 'table', 'formula', 'bib', 'link', 'image'];
  if (!VALID_KINDS.includes(kindStr as MentionKind)) {
    throw new InvalidMentionError(
      raw,
      `unknown kind '${kindStr}' — valid kinds: ${VALID_KINDS.join(', ')}`,
      position,
    );
  }

  const kind = kindStr as MentionKind;
  const target = parseTarget(targetStr);
  validateTargetForKind(kind, target, raw, position);

  return { kind, target, label, raw: body, start: position, end: position + raw.length };
}

/**
 * Parse a text string into an array of segments (text + mentions).
 * Throws InvalidMentionError on any invalid mention.
 */
export function parseMentions(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\{\{([^{}]*?)\}\}/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    // Text before this mention
    if (m.index > lastEnd) {
      segments.push({
        kind: 'text',
        content: text.slice(lastEnd, m.index),
        start: lastEnd,
        end: m.index,
      });
    }

    // Parse the mention
    const mention = parseMentionStrict(m[1] as string, m.index);
    segments.push(mention);
    lastEnd = m.index + m[0].length;
  }

  // Trailing text
  if (lastEnd < text.length) {
    segments.push({
      kind: 'text',
      content: text.slice(lastEnd),
      start: lastEnd,
      end: text.length,
    });
  }

  return segments;
}
