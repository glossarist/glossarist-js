// PartitivePresence — ISO 704:2022 partitive member presence.
//
// presence (line style):
//   required — solid line (must exist in every instance)
//   optional — dashed line (may exist; exists in some instances)
//
// Default: required.

import { makeEnum } from './enum.js';

export const PARTITIVE_PRESENCE = makeEnum('PARTITIVE_PRESENCE', {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
});

export const PARTITIVE_PRESENCE_VALUES = PARTITIVE_PRESENCE.VALUES;
export const DEFAULT_PRESENCE = PARTITIVE_PRESENCE.REQUIRED;
export const isValidPresence = PARTITIVE_PRESENCE.isValid;
