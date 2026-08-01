import { ConceptRef } from './models/concept-ref.js';
import { parseMention } from './reference-mention.js';
import type { MentionParseResult } from './reference-mention.js';
import type { Concept } from './models/concept.js';

type RefType = 'concept' | 'bibliography' | 'figure' | 'table' | 'formula' | 'dataset' | 'typed-ref' | 'standard';
type Registry = Record<string, any>;

interface ReferenceExtras {
  uri?: string | null;
  citation?: unknown;
  sourceId?: string | null;
  resolution?: Record<string, unknown> | null;
  lookupKey?: Record<string, unknown> | null;
}

export class Reference {
  type: RefType;
  target: string;
  relationship: string | null;
  source: string | null;
  uri: string | null;
  citation: unknown;
  sourceId: string | null;
  resolution: Record<string, unknown> | null;
  lookupKey: Record<string, unknown> | null;

  constructor(type: RefType, target: string, relationship?: string | null, source?: string | null, extras: ReferenceExtras = {}) {
    this.type = type;
    this.target = target;
    this.relationship = relationship ?? null;
    this.source = source ?? null;
    this.uri = extras.uri ?? null;
    this.citation = extras.citation ?? null;
    this.sourceId = extras.sourceId ?? null;
    this.resolution = extras.resolution ?? null;
    this.lookupKey = extras.lookupKey ?? null;
  }

  get dedupKey(): [RefType, unknown] {
    if (this.type === 'bibliography') {
      return ['bibliography',
        this.sourceId ?? (this.citation as { ref?: { id?: string } } | null)?.ref?.id ?? this.target];
    }
    if (this.type === 'figure' || this.type === 'table' || this.type === 'formula') {
      return [this.type, (this.lookupKey as { entityId?: string } | null)?.entityId ?? this.target];
    }
    if (this.type === 'concept') {
      return ['concept',
        (this.lookupKey as { id?: string; designation?: string } | null)?.id
        ?? (this.lookupKey as { designation?: string } | null)?.designation
        ?? this.target];
    }
    return [this.type, this.target];
  }
}

function refTarget(rc: any): string {
  if (rc.content) return rc.content;
  if (rc.ref instanceof ConceptRef) {
    return rc.ref.id ?? rc.ref.source ?? '';
  }
  return '';
}

function hyperedgeRefTarget(ref: any): string {
  if (!ref) return '';
  if (ref.id) return ref.id;
  if (ref.source) return ref.source;
  return '';
}

export function resolveBibliographyRecord(citationRef: { source?: string; id?: string; version?: string } | null | undefined, registry: Registry): unknown {
  if (!citationRef?.source || !citationRef?.id) return null;
  const bioColl = registry[`bibliography:${citationRef.source}`]?.concepts;
  if (!bioColl) return null;
  if (citationRef.version) {
    return bioColl.byIdAnd(citationRef.id, citationRef.version);
  }
  return bioColl.byId(citationRef.id);
}

export function findNonVerbalEntity(ref: { lookupKey?: { entityType?: string; entityId?: string } | null }, registry: Registry): unknown {
  const { entityType, entityId } = ref.lookupKey ?? {};
  if (!entityType || !entityId) return null;
  const collection = registry[`nvr:${entityType}`];
  if (!collection) return null;
  for (const entity of collection) {
    const found = entity.findById(entityId);
    if (found) return found;
  }
  return null;
}

export class ReferenceResolver {
  extractReferences(concept: Concept): Reference[] {
    const refs: Reference[] = [];

    for (const rc of concept.relatedConcepts) {
      const target = refTarget(rc as any);
      if (target) {
        refs.push(new Reference('concept', target, rc.type, 'relatedConcepts', {
          lookupKey: { id: target },
        }));
      }
    }

    const relations = concept.relations ?? [];
    for (let i = 0; i < relations.length; i++) {
      const rel = relations[i] as any;
      const relType: string = rel?.constructor?.typeTag ?? 'hyperedge';
      const relPath = `relations[${i}]`;

      const compTarget = hyperedgeRefTarget(rel.comprehensive);
      if (compTarget) {
        refs.push(new Reference(
          'concept',
          compTarget,
          relType,
          `${relPath}.comprehensive`,
          { lookupKey: { id: compTarget } },
        ));
      }

      const members = rel.members ?? rel.partitives ?? rel.parts ?? [];
      for (let j = 0; j < members.length; j++) {
        const m = members[j];
        const memberRef = m?.ref ?? m;
        const pTarget = hyperedgeRefTarget(memberRef);
        if (!pTarget) continue;
        refs.push(new Reference(
          'concept',
          pTarget,
          relType,
          `${relPath}.members[${j}]`,
          { lookupKey: { id: pTarget } },
        ));
      }
    }

    for (const ref of concept.figures ?? []) {
      const r = ref as any;
      refs.push(new Reference('figure', r.display ?? r.entityId, 'structural', 'figures', {
        lookupKey: { entityType: 'figure', entityId: r.entityId },
      }));
    }
    for (const ref of concept.tables ?? []) {
      const r = ref as any;
      refs.push(new Reference('table', r.display ?? r.entityId, 'structural', 'tables', {
        lookupKey: { entityType: 'table', entityId: r.entityId },
      }));
    }
    for (const ref of concept.formulas ?? []) {
      const r = ref as any;
      refs.push(new Reference('formula', r.display ?? r.entityId, 'structural', 'formulas', {
        lookupKey: { entityType: 'formula', entityId: r.entityId },
      }));
    }

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;

      for (let i = 0; i < lc.sources.length; i++) {
        const src = lc.sources[i]!;
        const ref = src.origin?.toString() ?? '';
        if (ref) {
          refs.push(new Reference('standard', ref, src.type, `localizations.${lang}.sources[${i}]`));
        }
      }

      for (const { text, source } of lc.walkTexts(`localizations.${lang}`)) {
        for (const ref of this._extractFromText(text, source, concept)) {
          refs.push(ref);
        }
      }
    }

    return this._dedup(refs);
  }

  _dedup(refs: Reference[]): Reference[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
      const key = JSON.stringify(ref.dedupKey);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _extractFromText(text: string, source: string, concept: Concept): Reference[] {
    const refs: Reference[] = [];
    const re = /\{\{([^{}]*?)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const parsed = parseMention(m[1]!);
      switch (parsed.kind) {
        case 'cite-ref':
          refs.push(this._resolveCiteRef(parsed, source, concept));
          break;
        case 'urn-ref':
          refs.push(new Reference('concept', parsed.label ?? parsed.uri ?? '', 'embedded', source, {
            uri: parsed.uri,
            resolution: null,
          }));
          break;
        case 'fig-ref':
          refs.push(new Reference('figure', parsed.label ?? parsed.key ?? '', 'embedded', source, {
            lookupKey: { entityType: 'figure', entityId: parsed.key },
          }));
          break;
        case 'table-ref':
          refs.push(new Reference('table', parsed.label ?? parsed.key ?? '', 'embedded', source, {
            lookupKey: { entityType: 'table', entityId: parsed.key },
          }));
          break;
        case 'formula-ref':
          refs.push(new Reference('formula', parsed.label ?? parsed.key ?? '', 'embedded', source, {
            lookupKey: { entityType: 'formula', entityId: parsed.key },
          }));
          break;
        case 'numeric':
          refs.push(new Reference('concept', parsed.label ?? parsed.id ?? '', 'embedded', source, {
            lookupKey: { id: parsed.id },
          }));
          break;
        case 'designation':
          refs.push(new Reference('concept', parsed.label ?? parsed.id ?? '', 'embedded', source, {
            lookupKey: { designation: parsed.id },
          }));
          break;
        case 'unresolved':
          break;
      }
    }
    return refs;
  }

  _resolveCiteRef(parsed: MentionParseResult, source: string, concept: Concept): Reference {
    const sourceEntry = (concept as any)?.findSourceById?.(parsed.key) ?? null;
    if (!sourceEntry) {
      return new Reference(
        'bibliography',
        parsed.label ?? parsed.key ?? '',
        null,
        source,
        {
          sourceId: parsed.key,
          citation: null,
          resolution: { kind: 'unresolved', reason: 'no-source' },
        },
      );
    }
    const displayTarget = parsed.label
      ?? sourceEntry.origin?.toString()
      ?? sourceEntry.id;
    return new Reference(
      'bibliography',
      displayTarget,
      null,
      source,
      {
        sourceId: sourceEntry.id,
        citation: sourceEntry.origin,
        resolution: { kind: 'resolved', sourceId: sourceEntry.id },
      },
    );
  }

  resolveReference(ref: Reference | null, registry: Registry | null): unknown {
    if (ref == null || registry == null) return null;

    switch (ref.type) {
      case 'concept':      return this._resolveConcept(ref, registry);
      case 'bibliography': return this._resolveBibliography(ref, registry);
      case 'figure':
      case 'table':
      case 'formula':      return this._resolveNonVerbal(ref, registry);
      case 'dataset':      return this._resolveDataset(ref, registry);
      case 'typed-ref':    return this._resolveTypedRef(ref, registry);
      case 'standard':     return this._resolveStandard(ref, registry);
      default:             return null;
    }
  }

  _resolveNonVerbal(ref: Reference, registry: Registry): unknown {
    return findNonVerbalEntity(ref as any, registry);
  }

  _resolveConcept(ref: Reference, registry: Registry): unknown {
    const lookupKey = ref.lookupKey as { id?: string; dataset?: string } | null | undefined;
    if (lookupKey?.id) {
      const dataset = lookupKey.dataset;
      if (dataset) {
        return registry[dataset]?.concepts?.byId(lookupKey.id) ?? null;
      }
      for (const entry of Object.values(registry)) {
        const found = entry?.concepts?.byId(lookupKey.id);
        if (found) return found;
      }
      return null;
    }
    const resolution = ref.resolution as { datasetId?: string; conceptId?: string } | null | undefined;
    if (ref.uri && resolution?.datasetId) {
      return registry[resolution.datasetId]?.concepts?.byId(resolution.conceptId) ?? null;
    }
    return null;
  }

  _resolveBibliography(ref: Reference, registry: Registry): unknown {
    const citation = ref.citation as { ref?: { source?: string; id?: string } } | null;
    if (citation) {
      return resolveBibliographyRecord(citation.ref as any, registry) ?? citation;
    }
    const resolution = ref.resolution as { source?: string } | null | undefined;
    if (ref.uri && resolution?.source) {
      return resolveBibliographyRecord(resolution as any, registry) ?? null;
    }
    return null;
  }

  _resolveDataset(_ref: Reference, _registry: Registry): null {
    return null;
  }

  _resolveTypedRef(_ref: Reference, _registry: Registry): null {
    return null;
  }

  _resolveStandard(_ref: Reference, _registry: Registry): null {
    return null;
  }

  resolveAll(concept: Concept, registry: Registry): Map<string, unknown> {
    const resolved = new Map<string, unknown>();
    for (const ref of this.extractReferences(concept)) {
      if (ref.type === 'concept' || ref.type === 'bibliography'
          || ref.type === 'figure' || ref.type === 'table' || ref.type === 'formula') {
        const target = this.resolveReference(ref, registry);
        if (target != null) {
          const key = ref.target ?? ref.uri ?? ref.sourceId;
          if (key != null) resolved.set(key, target);
        }
      }
    }
    return resolved;
  }
}

export const referenceResolver = new ReferenceResolver();
