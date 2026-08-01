// Extensional definition completeness check.
//
// ISO 704:2022 §6.4.5.1 requires extensional definitions to enumerate
// exhaustively. Open-ended wording ("etc.", "...", "and so on") in an
// extensional definition violates this — the reader cannot reconstruct
// the full set from the definition text.
//
// This is a pure function, not a ValidationRule, because the check
// applies per-definition, not per-concept. Callers (validators, UI
// components) iterate definitions and call this on each.
//
// Per TODO 14 (external-concepts-ellipsis-rendering), mirroring the
// concept-model `check-definition-rules` §6.4.5.1.

export const OPEN_ENDED_PATTERNS = [
  /\.\.\./,
  /\betc\b\.?/i,
  /\band similar\b/i,
  /\band so on\b/i,
  /\band the like\b/i,
  /\band others?\b/i,
  /\bincluding\b/i,
] as readonly ReadonlyRegExp[];

export interface ExtensionalDefinitionLike {
  type?: string | null;
  content?: string | null;
}

export interface ExtensionalCompletenessIssue {
  rule: 'ISO-704-6.4.5.1';
  severity: 'warning';
  message: string;
  match: string;
}

export function checkExtensionalCompleteness(
  definition: ExtensionalDefinitionLike | null | undefined,
): ExtensionalCompletenessIssue | null {
  if (definition?.type !== 'extensional') return null;
  const content = definition?.content ?? '';
  for (const pattern of OPEN_ENDED_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      return {
        rule: 'ISO-704-6.4.5.1',
        severity: 'warning',
        message:
          `Extensional definition contains open-ended wording '${match[0]}'; ` +
          'ISO 704:2022 §6.4.5.1 requires exhaustive enumeration.',
        match: match[0],
      };
    }
  }
  return null;
}

interface ReadonlyRegExp extends RegExp {
  readonly source: string;
  readonly flags: string;
}
