// Sections builder — transforms a Quad[] into the ClassInstance[]
// shape consumed by Vue UI components (RdfInstanceSection,
// RdfInstanceHeader, RdfSourcePanel).
//
// The grouping logic is RDF-structure-driven, not Vue-specific:
// 1. Group quads by subject (NamedNode or BlankNode)
// 2. For each subject:
//    - rdf:type values → classId (first type wins, multi-type joined)
//    - Derive classLabel from classId local name (CURIE local part)
//    - Derive label from skos:prefLabel/rdfs:label/URI segment
//    - Collect remaining predicates → props
// 3. For bnode objects, recursively nest their triples as a
//    nested PropValue
// 4. Return ClassInstance[] sorted by subject IRI (insertion order
//    preserved when subjects appear in canonical order)
//
// This module consumes standard RDF/JS Quad[] — no custom RdfGraph
// abstraction. Any consumer (Vue UI, CLI inspector, debug tool) can
// use it.

import { RDF_TYPE, RDFS_LABEL, compactIri } from './curie.js';
import { PREFIXES } from './predicates.js';

const SKOS_PREF_LABEL = `${PREFIXES.skos}prefLabel`;

/**
 * @typedef {Object} PropValue
 * @property {string} predicate
 * @property {string[]} values
 * @property {boolean} [nested]
 */
/**
 * @typedef {Object} ClassInstance
 * @property {string} classId
 * @property {string} classLabel
 * @property {string} label
 * @property {PropValue[]} props
 */
/**
 * @typedef {Object} SectionsBuilderOptions
 * @property {string} [language='eng'] — preferred language for skos:prefLabel
 */

/**
 * Build ClassInstance[] from a Quad[]. Bnodes referenced as objects
 * are recursively nested into the parent prop.
 *
 * @param {import('@rdfjs/dataset').Quad[]} quads
 * @param {SectionsBuilderOptions} [options]
 * @returns {ClassInstance[]}
 */
export function quadSectionsToClassInstances(quads, options = {}) {
  const language = options.language ?? 'eng';
  if (!quads || quads.length === 0) return [];

  // Group quads by subject
  const bySubject = new Map();
  const bnodeQuads = new Map(); // separate bnode quads for nested lookup
  const order = [];

  for (const q of quads) {
    const subj = q.subject;
    const isBnode = subj.termType === 'BlankNode';
    const key = subj.value;
    const target = isBnode ? bnodeQuads : bySubject;
    if (!target.has(key)) {
      target.set(key, { subject: subj, quads: [] });
      if (!isBnode) order.push(key);
    }
    target.get(key).quads.push(q);
  }

  const result = [];
  for (const key of order) {
    const entry = bySubject.get(key);
    result.push(resourceToClassInstance(entry.subject, entry.quads, bnodeQuads, language));
  }
  return result;
}

function resourceToClassInstance(subject, quads, bnodeQuads, language) {
  const types = [];
  const otherQuads = [];
  let prefLabel = null;
  let rdfsLabel = null;

  for (const q of quads) {
    if (q.predicate.value === RDF_TYPE) {
      types.push(q.object.value);
    } else if (q.predicate.value === SKOS_PREF_LABEL) {
      // Prefer prefLabel in the requested language; first one wins per lang
      if (!prefLabel || (q.object.language === language && prefLabel.language !== language)) {
        prefLabel = { value: q.object.value, language: q.object.language };
      }
    } else if (q.predicate.value === RDFS_LABEL && !rdfsLabel) {
      rdfsLabel = q.object.value;
    } else {
      otherQuads.push(q);
    }
  }

  const subjectStr = subject.value;
  // Compact classId and classLabel to CURIE form for UI consumers.
  // The Vue components compare against CURIEs ('gloss:Concept') not
  // absolute IRIs, so the builder is responsible for the conversion.
  const rawClassId = types.length > 0 ? types[0] : '';
  const classId = rawClassId ? compactIri(rawClassId) : '';
  const classLabel = deriveClassLabel(rawClassId);
  const label = prefLabel?.value ?? rdfsLabel ?? deriveSubjectLabel(subjectStr);

  // Group predicates (preserve insertion order). Compact IRIs to CURIEs
  // for display — UI consumers expect 'gloss:hasDefinition' rather than
  // 'https://www.glossarist.org/ontologies/hasDefinition'.
  const props = [];
  const seenPredKeys = new Set();

  for (const q of otherQuads) {
    const isBnodeObj = q.object.termType === 'BlankNode';
    const formatted = formatTerm(q.object, bnodeQuads);
    if (formatted === '') continue;
    const predicate = compactIri(q.predicate.value);
    const dedupKey = `${predicate}#${isBnodeObj ? 'n' : 'f'}#${formatted}`;
    if (seenPredKeys.has(dedupKey)) continue;
    seenPredKeys.add(dedupKey);

    const prop = { predicate, values: [formatted] };
    if (isBnodeObj) prop.nested = true;
    props.push(prop);
  }

  return {
    classId,
    classLabel,
    label,
    props,
  };
}

function formatTerm(term, bnodeQuads) {
  switch (term.termType) {
    case 'NamedNode':
      return compactIri(term.value);
    case 'Literal':
      return term.value;
    case 'BlankNode': {
      const entry = bnodeQuads.get(term.value);
      if (!entry) return '';
      const parts = entry.quads.map(q => {
        const val = formatTerm(q.object, bnodeQuads);
        return val ? `${compactIri(q.predicate.value)}: ${val}` : '';
      }).filter(p => p);
      return parts.join('; ');
    }
    default:
      return '';
  }
}

function deriveClassLabel(classId) {
  if (!classId) return '';
  // ClassId is now CURIE form (compacted). Just take the local part.
  if (classId.includes(':') && !classId.includes('://')) {
    return classId.slice(classId.indexOf(':') + 1);
  }
  // Fallback for absolute IRIs that didn't compact
  const noFrag = classId.split('#').pop();
  const last = noFrag.split('/').pop();
  return last || classId;
}

function deriveSubjectLabel(subject) {
  if (!subject) return '';
  // Last path segment or fragment
  const noFrag = subject.split('#').pop();
  const last = noFrag.split('/').pop();
  return last || subject;
}
