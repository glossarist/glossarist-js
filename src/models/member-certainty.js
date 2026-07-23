// MemberCertainty — per-partitive certainty for a PartitiveMember.
//
// Glossarist extension beyond ISO 704 notation. ISO 704's broken-line
// notation marks plurality-level uncertainty; per-member certainty
// lets a relation assert "member b is confirmed, member d is possible"
// at the member level.
//
// Defaults to `confirmed` when omitted (a member with no certainty
// field is implicitly confirmed).

import { makeEnum } from './enum.js';

export const MEMBER_CERTAINTY = makeEnum('MEMBER_CERTAINTY', {
  CONFIRMED: 'confirmed',
  POSSIBLE: 'possible',
});

export const MEMBER_CERTAINTY_VALUES = MEMBER_CERTAINTY.VALUES;
export const isValidMemberCertainty = MEMBER_CERTAINTY.isValid;

export const DEFAULT_MEMBER_CERTAINTY = MEMBER_CERTAINTY.CONFIRMED;
