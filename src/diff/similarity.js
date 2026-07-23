// Similarity scoring for the diff layer.
//
// `computeSimilarity(changeCount, totalItems)` returns a value in
// [0, 1] rounded to SIMILARITY_PRECISION_DECIMALS decimal places. The
// rounding matches what glossarist-ruby's diff layer produces, so
// similarity scores are stable across repos.
//
// `averageSimilarity(values)` averages an array of per-item similarity
// scores (used by ConceptCollectionDiff to roll up matched concepts).

export const SIMILARITY_PRECISION_DECIMALS = 4;
const _SCALE = 10 ** SIMILARITY_PRECISION_DECIMALS;

export function computeSimilarity(changeCount, totalItems) {
  if (totalItems <= 0) return 1.0;
  const ratio = Math.min(changeCount / totalItems, 1);
  return Math.round((1 - ratio) * _SCALE) / _SCALE;
}

export function averageSimilarity(values) {
  if (values.length === 0) return 1.0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * _SCALE) / _SCALE;
}
