import { ConceptRef } from './models/concept-ref.js';
import { parseMention } from './reference-mention.js';

export class Reference {
  constructor(type, target, relationship, source, extras = {}) {
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

  get dedupKey() {
    if (this.type === 'bibliography') {
      return ['bibliography',
        this.sourceId ?? this.citation?.ref?.id ?? this.target];
    }
    if (this.type === 'figure' || this.type === 'table' || this.type === 'formula') {
      return [this.type, this.lookupKey?.entityId ?? this.target];
    }
    if (this.type === 'concept') {
      return ['concept',
        this.lookupKey?.id ?? this.lookupKey?.designation ?? this.target];
    }
    return [this.type, this.target];
  }
}

function refTarget(rc) {
  if (rc.content) return rc.content;
  if (rc.ref instanceof ConceptRef) {
    return rc.ref.id ?? rc.ref.source ?? '';
  }
  return '';
}

export function resolveBibliographyRecord(citationRef, registry) {
  if (!citationRef?.source || !citationRef?.id) return null;
  const bioColl = registry[`bibliography:${citationRef.source}`]?.concepts;
  if (!bioColl) return null;
  if (citationRef.version) {
    return bioColl.byIdAnd(citationRef.id, citationRef.version);
  }
  return bioColl.byId(citationRef.id);
}

export function findNonVerbalEntity(ref, registry) {
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
  extractReferences(concept) {
    const refs = [];

    for (const rc of concept.relatedConcepts) {
      const target = refTarget(rc);
      if (target) {
        refs.push(new Reference('concept', target, rc.type, 'relatedConcepts', {
          lookupKey: { id: target },
        }));
      }
    }

    for (const ref of concept.figures) {
      refs.push(new Reference('figure', ref.display ?? ref.entityId, 'structural', 'figures', {
        lookupKey: { entityType: 'figure', entityId: ref.entityId },
      }));
    }
    for (const ref of concept.tables) {
      refs.push(new Reference('table', ref.display ?? ref.entityId, 'structural', 'tables', {
        lookupKey: { entityType: 'table', entityId: ref.entityId },
      }));
    }
    for (const ref of concept.formulas) {
      refs.push(new Reference('formula', ref.display ?? ref.entityId, 'structural', 'formulas', {
        lookupKey: { entityType: 'formula', entityId: ref.entityId },
      }));
    }

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;

      for (let i = 0; i < lc.sources.length; i++) {
        const src = lc.sources[i];
        const ref = src.origin?.toString() ?? '';
        if (ref) {
          refs.push(new Reference('standard', ref, src.type, `localizations.${lang}.sources[${i}]`));
        }
      }

      const texts = this._collectTexts(lc, lang);
      for (const { text, source } of texts) {
        for (const ref of this._extractFromText(text, source, concept)) {
          refs.push(ref);
        }
      }
    }

    return this._dedup(refs);
  }

  _dedup(refs) {
    const seen = new Set();
    return refs.filter(ref => {
      const key = JSON.stringify(ref.dedupKey);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _collectTexts(lc, lang) {
    const out = [];
    for (let i = 0; i < lc.definitions.length; i++) {
      const content = lc.definitions[i]?.content;
      if (typeof content === 'string') {
        out.push({ text: content, source: `localizations.${lang}.definitions[${i}].content` });
      }
    }
    for (let i = 0; i < lc.notes.length; i++) {
      const content = lc.notes[i]?.content;
      if (content) {
        out.push({ text: content, source: `localizations.${lang}.notes[${i}].content` });
      }
    }
    for (let i = 0; i < lc.examples.length; i++) {
      const content = lc.examples[i]?.content;
      if (typeof content === 'string') {
        out.push({ text: content, source: `localizations.${lang}.examples[${i}].content` });
      }
    }
    for (let i = 0; i < lc.annotations.length; i++) {
      const content = lc.annotations[i]?.content;
      if (typeof content === 'string') {
        out.push({ text: content, source: `localizations.${lang}.annotations[${i}].content` });
      }
    }
    return out;
  }

  _extractFromText(text, source, concept) {
    const refs = [];
    const re = /\{\{([^{}]*?)\}\}/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const parsed = parseMention(m[1]);
      switch (parsed.kind) {
        case 'cite-ref':
          refs.push(this._resolveCiteRef(parsed, source, concept));
          break;
        case 'urn-ref':
          refs.push(new Reference('concept', parsed.label ?? parsed.uri, 'embedded', source, {
            uri: parsed.uri,
            resolution: null,
          }));
          break;
        case 'fig-ref':
          refs.push(new Reference('figure', parsed.label ?? parsed.key, 'embedded', source, {
            lookupKey: { entityType: 'figure', entityId: parsed.key },
          }));
          break;
        case 'table-ref':
          refs.push(new Reference('table', parsed.label ?? parsed.key, 'embedded', source, {
            lookupKey: { entityType: 'table', entityId: parsed.key },
          }));
          break;
        case 'formula-ref':
          refs.push(new Reference('formula', parsed.label ?? parsed.key, 'embedded', source, {
            lookupKey: { entityType: 'formula', entityId: parsed.key },
          }));
          break;
        case 'numeric':
          refs.push(new Reference('concept', parsed.label ?? parsed.id, 'embedded', source, {
            lookupKey: { id: parsed.id },
          }));
          break;
        case 'designation':
          refs.push(new Reference('concept', parsed.label ?? parsed.id, 'embedded', source, {
            lookupKey: { designation: parsed.id },
          }));
          break;
        case 'unresolved':
          break;
      }
    }
    return refs;
  }

  _resolveCiteRef(parsed, source, concept) {
    const sourceEntry = concept?.findSourceById(parsed.key) ?? null;
    if (!sourceEntry) {
      return new Reference(
        'bibliography',
        parsed.label ?? parsed.key,
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

  resolveReference(ref, registry) {
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

  _resolveNonVerbal(ref, registry) {
    return findNonVerbalEntity(ref, registry);
  }

  _resolveConcept(ref, registry) {
    if (ref.lookupKey?.id) {
      const dataset = ref.lookupKey.dataset;
      if (dataset) {
        return registry[dataset]?.concepts?.byId(ref.lookupKey.id) ?? null;
      }
      for (const entry of Object.values(registry)) {
        const found = entry?.concepts?.byId(ref.lookupKey.id);
        if (found) return found;
      }
      return null;
    }
    if (ref.uri && ref.resolution?.datasetId) {
      return registry[ref.resolution.datasetId]?.concepts?.byId(ref.resolution.conceptId) ?? null;
    }
    return null;
  }

  _resolveBibliography(ref, registry) {
    if (ref.citation) {
      return resolveBibliographyRecord(ref.citation.ref, registry) ?? ref.citation;
    }
    if (ref.uri && ref.resolution?.source) {
      return resolveBibliographyRecord(ref.resolution, registry) ?? null;
    }
    return null;
  }

  _resolveDataset(_ref, _registry) {
    return null;
  }

  _resolveTypedRef(_ref, _registry) {
    return null;
  }

  _resolveStandard(_ref, _registry) {
    return null;
  }

  resolveAll(concept, registry) {
    const resolved = new Map();
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
