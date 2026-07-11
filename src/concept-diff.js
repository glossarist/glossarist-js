import { LocalizedConcept } from './models/localized-concept.js';
import { Designation } from './models/designation.js';
import { DetailedDefinition } from './models/detailed-definition.js';

/**
 * Designation diff entry — either an added/removed designation or a
 * status change (same text, different normative status).
 *
 * @typedef {Object} DesignationChange
 * @property {string} type - 'added' | 'removed' | 'status-changed' | 'text-changed'
 * @property {Designation} [old] - the old designation (for removed/changed)
 * @property {Designation} [new] - the new designation (for added/changed)
 */

/**
 * Text-list diff result for notes/examples.
 *
 * @typedef {Object} TextListDiff
 * @property {string[]} added - texts present only in the new concept
 * @property {string[]} removed - texts present only in the old concept
 * @property {{old: string, new: string, index: number}[]} changed - texts at the same position that differ
 */

/**
 * Full concept diff result.
 *
 * @typedef {Object} ConceptDiff
 * @property {boolean} hasChanges - true if anything differs
 * @property {{added: Designation[], removed: Designation[], changed: DesignationChange[]}} designations
 * @property {{changed: boolean, oldContent: string|null, newContent: string|null}} definition
 * @property {TextListDiff} notes
 * @property {TextListDiff} examples
 */

function designationKey(d) {
  return `${d.type || 'expression'}|${d.normativeStatus || ''}|${(d.designation || '').toLowerCase().trim()}`;
}

function textKey(d) {
  return (d.content || '').trim();
}

function diffDesignations(oldTerms, newTerms) {
  const oldMap = new Map(oldTerms.map(d => [designationKey(d), d]));
  const newMap = new Map(newTerms.map(d => [designationKey(d), d]));
  const oldTexts = new Map(oldTerms.map(d => [(d.designation || '').toLowerCase().trim(), d]));
  const newTexts = new Map(newTerms.map(d => [(d.designation || '').toLowerCase().trim(), d]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, d] of newMap) {
    if (!oldMap.has(key)) {
      const textKey = (d.designation || '').toLowerCase().trim();
      if (oldTexts.has(textKey)) {
        const old = oldTexts.get(textKey);
        if (old.normativeStatus !== d.normativeStatus) {
          changed.push({ type: 'status-changed', old, new: d });
        } else {
          changed.push({ type: 'text-changed', old, new: d });
        }
      } else {
        added.push(d);
      }
    }
  }

  for (const [key, d] of oldMap) {
    if (!newMap.has(key)) {
      const textKey = (d.designation || '').toLowerCase().trim();
      if (!newTexts.has(textKey)) {
        removed.push(d);
      }
    }
  }

  return { added, removed, changed };
}

function diffTextList(oldItems, newItems) {
  const oldTexts = oldItems.map(textKey);
  const newTexts = newItems.map(textKey);

  // 1. Positional changes: items at the same index that differ.
  const changed = [];
  const matchedOld = new Set();
  const matchedNew = new Set();
  const maxLen = Math.max(oldItems.length, newItems.length);
  for (let i = 0; i < maxLen; i++) {
    const o = i < oldTexts.length ? oldTexts[i] : '';
    const n = i < newTexts.length ? newTexts[i] : '';
    if (o && n && o !== n) {
      changed.push({ old: o, new: n, index: i });
      matchedOld.add(i);
      matchedNew.add(i);
    }
  }

  // 2. Remaining (non-positionally-matched) items → set-based add/remove.
  const oldSet = new Set(oldTexts.filter((_, i) => !matchedOld.has(i)));
  const newSet = new Set(newTexts.filter((_, i) => !matchedNew.has(i)));
  const added = newTexts.filter((t, i) => !matchedNew.has(i) && t && !oldSet.has(t));
  const removed = oldTexts.filter((t, i) => !matchedOld.has(i) && t && !newSet.has(t));

  return { added, removed, changed };
}

function extractContent(items) {
  if (!items || items.length === 0) return null;
  return items.map(d => d.content || '').filter(Boolean).join('\n').trim() || null;
}

/**
 * Diff two LocalizedConcept instances (same language) and produce a
 * structured comparison of designations, definition, notes, and examples.
 *
 * @param {LocalizedConcept} oldLoc - the earlier edition's localized concept
 * @param {LocalizedConcept} newLoc - the later edition's localized concept
 * @returns {ConceptDiff}
 */
export function diffLocalizedConcepts(oldLoc, newLoc) {
  if (!oldLoc && !newLoc) {
    return emptyDiff();
  }
  if (!oldLoc) {
    return {
      hasChanges: true,
      designations: { added: newLoc.terms, removed: [], changed: [] },
      definition: { changed: true, oldContent: null, newContent: extractContent(newLoc.definitions) },
      notes: { added: newLoc.notes.map(n => n.content || ''), removed: [], changed: [] },
      examples: { added: newLoc.examples.map(e => e.content || ''), removed: [], changed: [] },
    };
  }
  if (!newLoc) {
    return {
      hasChanges: true,
      designations: { added: [], removed: oldLoc.terms, changed: [] },
      definition: { changed: true, oldContent: extractContent(oldLoc.definitions), newContent: null },
      notes: { added: [], removed: oldLoc.notes.map(n => n.content || ''), changed: [] },
      examples: { added: [], removed: oldLoc.examples.map(e => e.content || ''), changed: [] },
    };
  }

  const designationDiff = diffDesignations(oldLoc.terms || [], newLoc.terms || []);
  const oldDef = extractContent(oldLoc.definitions);
  const newDef = extractContent(newLoc.definitions);
  const defChanged = oldDef !== newDef;
  const notesDiff = diffTextList(oldLoc.notes || [], newLoc.notes || []);
  const examplesDiff = diffTextList(oldLoc.examples || [], newLoc.examples || []);

  const hasChanges =
    designationDiff.added.length > 0 ||
    designationDiff.removed.length > 0 ||
    designationDiff.changed.length > 0 ||
    defChanged ||
    notesDiff.added.length > 0 ||
    notesDiff.removed.length > 0 ||
    notesDiff.changed.length > 0 ||
    examplesDiff.added.length > 0 ||
    examplesDiff.removed.length > 0 ||
    examplesDiff.changed.length > 0;

  return {
    hasChanges,
    designations: designationDiff,
    definition: { changed: defChanged, oldContent: oldDef, newContent: newDef },
    notes: notesDiff,
    examples: examplesDiff,
  };
}

function emptyDiff() {
  return {
    hasChanges: false,
    designations: { added: [], removed: [], changed: [] },
    definition: { changed: false, oldContent: null, newContent: null },
    notes: { added: [], removed: [], changed: [] },
    examples: { added: [], removed: [], changed: [] },
  };
}

/**
 * Convenience: diff two Concept instances by their localizations for a
 * given language. Falls back to 'eng' if the language is not found.
 *
 * @param {Concept} oldConcept
 * @param {Concept} newConcept
 * @param {string} [language='eng']
 * @returns {ConceptDiff}
 */
export function diffConcepts(oldConcept, newConcept, language = 'eng') {
  if (!oldConcept || !newConcept) return emptyDiff();

  const lang = oldConcept.languages.includes(language) || newConcept.languages.includes(language)
    ? language
    : 'eng';

  const oldLoc = oldConcept.localization(lang);
  const newLoc = newConcept.localization(lang);

  return diffLocalizedConcepts(oldLoc, newLoc);
}
