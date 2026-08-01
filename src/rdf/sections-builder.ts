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
import { PREFIXES } from './prefixes.js';
import type { Quad, Term } from '@rdfjs/types';

const SKOS_PREF_LABEL = `${PREFIXES.skos}prefLabel`;

export interface PropValue {
  predicate: string;
  values: string[];
  nested?: boolean;
}
export interface ClassInstance {
  classId: string;
  classLabel: string;
  label: string;
  props: PropValue[];
}
export interface SectionsBuilderOptions {
  language?: string;
}

export function quadSectionsToClassInstances(quads: ReadonlyArray<Quad> | null | undefined, options: SectionsBuilderOptions = {}): ClassInstance[] {
  const language = options.language ?? 'eng';
  if (!quads || quads.length === 0) return [];

  const bySubject = new Map<string, { subject: Term; quads: Quad[] }>();
  const bnodeQuads = new Map<string, { subject: Term; quads: Quad[] }>();
  const order: string[] = [];

  for (const q of quads) {
    const subj = q.subject;
    const isBnode = subj.termType === 'BlankNode';
    const key = subj.value;
    const target = isBnode ? bnodeQuads : bySubject;
    if (!target.has(key)) {
      target.set(key, { subject: subj, quads: [] });
      if (!isBnode) order.push(key);
    }
    target.get(key)!.quads.push(q);
  }

  const result: ClassInstance[] = [];
  for (const key of order) {
    const entry = bySubject.get(key)!;
    result.push(resourceToClassInstance(entry.subject, entry.quads, bnodeQuads, language));
  }
  return result;
}

function resourceToClassInstance(subject: Term, quads: Quad[], bnodeQuads: Map<string, { subject: Term; quads: Quad[] }>, language: string): ClassInstance {
  const types: string[] = [];
  const otherQuads: Quad[] = [];
  let prefLabel: { value: string; language: string } | null = null;
  let rdfsLabel: string | null = null;

  for (const q of quads) {
    if (q.predicate.value === RDF_TYPE) {
      types.push(q.object.value);
    } else if (q.predicate.value === SKOS_PREF_LABEL) {
      const objLang = (q.object as Term & { language?: string }).language ?? '';
      if (!prefLabel || (objLang === language && prefLabel.language !== language)) {
        prefLabel = { value: q.object.value, language: objLang };
      }
    } else if (q.predicate.value === RDFS_LABEL && !rdfsLabel) {
      rdfsLabel = q.object.value;
    } else {
      otherQuads.push(q);
    }
  }

  const subjectStr = subject.value;
  const rawClassId = types.length > 0 ? types[0]! : '';
  const classId = rawClassId ? compactIri(rawClassId) : '';
  const classLabel = deriveClassLabel(rawClassId);
  const label = prefLabel?.value ?? rdfsLabel ?? deriveSubjectLabel(subjectStr);

  const props: PropValue[] = [];
  const seenPredKeys = new Set<string>();

  for (const q of otherQuads) {
    const isBnodeObj = q.object.termType === 'BlankNode';
    const formatted = formatTerm(q.object, bnodeQuads);
    if (formatted === '') continue;
    const predicate = compactIri(q.predicate.value);
    const dedupKey = `${predicate}#${isBnodeObj ? 'n' : 'f'}#${formatted}`;
    if (seenPredKeys.has(dedupKey)) continue;
    seenPredKeys.add(dedupKey);

    const prop: PropValue = { predicate, values: [formatted] };
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

function formatTerm(term: Term, bnodeQuads: Map<string, { subject: Term; quads: Quad[] }>): string {
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

function deriveClassLabel(classId: string): string {
  if (!classId) return '';
  if (classId.includes(':') && !classId.includes('://')) {
    return classId.slice(classId.indexOf(':') + 1);
  }
  const noFrag = classId.split('#').pop() ?? classId;
  const last = noFrag.split('/').pop() ?? classId;
  return last || classId;
}

function deriveSubjectLabel(subject: string): string {
  if (!subject) return '';
  const noFrag = subject.split('#').pop() ?? subject;
  const last = noFrag.split('/').pop() ?? subject;
  return last || subject;
}


