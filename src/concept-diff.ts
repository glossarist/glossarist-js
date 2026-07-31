/**
 * @deprecated Import from `glossarist/diff` (i.e. `src/diff/index.js`)
 * instead. This file is a backwards-compatibility shim left over from
 * the pre-`eb6e61c` layout. It will be removed in the next major
 * release.
 *
 * Migration:
 *   - `import { diffConcepts } from 'glossarist/concept-diff'`
 *   + `import { diffConcepts } from 'glossarist/diff'`
 *
 * See TODO.hyperedges-v2/12 for the deprecation rationale.
 */
export {
  diffConcepts,
  diffLocalizedConcepts,
  diffText,
  diffList,
  diffSet,
  ConceptDiff,
  ConceptLevelDiff,
  LocalizedConceptDiff,
  MetadataDiff,
  DiffStats,
  ListDiff,
  TextDiff,
  TextHunk,
  Change,
  Added,
  Removed,
  Changed,
  Matched,
} from './diff/index.js';
