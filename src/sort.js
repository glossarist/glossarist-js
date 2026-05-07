const NATURAL_SORT_RE = /(\d+|\D+)/g;
const DIGIT_RE = /^\d+$/;

/**
 * Natural sort comparator for concept IDs like "3.1.1.1", "551-12-39".
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function naturalSort(a, b) {
  const pa = a.match(NATURAL_SORT_RE) || [];
  const pb = b.match(NATURAL_SORT_RE) || [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || '';
    const nb = pb[i] || '';
    if (DIGIT_RE.test(na) && DIGIT_RE.test(nb)) {
      const diff = parseInt(na, 10) - parseInt(nb, 10);
      if (diff !== 0) return diff;
    } else {
      const cmp = na.localeCompare(nb);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}
