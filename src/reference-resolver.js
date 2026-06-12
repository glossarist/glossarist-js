import { ConceptRef } from './models/concept-ref.js';
import { parseMention } from './reference-mention.js';

export class Reference {
  /**
   * @param {string} type — the structural kind of the reference
   *   ('concept', 'dataset', 'bibliography', 'typed-ref',
   *   'standard').
   * @param {string | null} target — the legacy flat display
   *   string. Kept for backward compat with callers that only
   *   read `r.target`.
   * @param {string | null} [relationship] — the type of the
   *   relationship that produced this reference (e.g. 'see',
   *   'supersedes', 'source').
   * @param {string | null} [source] — a JSON-pointer-ish path
   *   indicating where in the concept the reference was
   *   extracted from.
   * @param {object} [extras] — additional fields (v8+):
   *   `citation`, `sourceId`, `resolution`, `lookupKey`,
   *   `label`, `quoted`, `uri`. All optional.
   */
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
}

function refTarget(rc) {
  if (rc.content) return rc.content;
  if (rc.ref instanceof ConceptRef) {
    return rc.ref.id ?? rc.ref.source ?? '';
  }
  return '';
}

export class ReferenceResolver {
  /**
   * Extract all embedded references from a concept's localizations.
   *
   * Walks definitions, notes, examples, and annotations text.
   * For each `{{...}}` mention, runs `parseMention` to
   * classify the form, then dispatches:
   *   - 'cite-ref'  → look up the key in concept.sources; emit
   *                   Bibliography Reference with the Citation.
   *   - 'numeric'   → emit Concept Reference with the bare id
   *                   (existing behavior).
   *   - 'unresolved' → do not emit a Reference.
   *
   * @param {Concept} concept
   * @returns {Reference[]}
   */
  extractReferences(concept) {
    const refs = [];

    for (const rc of concept.relatedConcepts) {
      const target = refTarget(rc);
      if (target) {
        refs.push(new Reference('concept', target, rc.type, 'relatedConcepts'));
      }
    }

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;

      if (lc.sources) {
        for (let i = 0; i < lc.sources.length; i++) {
          const src = lc.sources[i];
          const ref = src.origin?.toString() ?? '';
          if (ref) {
            refs.push(new Reference('standard', ref, src.type, `localizations.${lang}.sources[${i}]`));
          }
        }
      }

      const texts = this._collectTexts(lc, lang);
      for (const { text, source } of texts) {
        for (const ref of this._extractFromText(text, source, concept)) {
          refs.push(ref);
        }
      }
    }

    return refs;
  }

  /**
   * Collect all text fields from a localized concept, paired
   * with diagnostic source paths.
   *
   * @param {LocalizedConcept} lc
   * @param {string} lang
   * @returns {{text: string, source: string}[]}
   */
  _collectTexts(lc, lang) {
    const out = [];
    for (let i = 0; (lc.definitions ?? [])[i]; i++) {
      const content = lc.definitions[i]?.content;
      if (typeof content === 'string') {
        out.push({ text: content, source: `localizations.${lang}.definitions[${i}].content` });
      }
    }
    for (let i = 0; (lc.notes ?? [])[i]; i++) {
      const content = typeof lc.notes[i] === 'object'
        ? (lc.notes[i]?.content ?? '')
        : String(lc.notes[i] ?? '');
      if (content) {
        out.push({ text: content, source: `localizations.${lang}.notes[${i}].content` });
      }
    }
    for (let i = 0; (lc.examples ?? [])[i]; i++) {
      const content = lc.examples[i]?.content;
      if (typeof content === 'string') {
        out.push({ text: content, source: `localizations.${lang}.examples[${i}].content` });
      }
    }
    for (let i = 0; (lc.annotations ?? [])[i]; i++) {
      const content = lc.annotations[i]?.content;
      if (typeof content === 'string') {
        out.push({ text: content, source: `localizations.${lang}.annotations[${i}].content` });
      }
    }
    return out;
  }

  /**
   * Walk a single text string and emit References for each
   * `{{...}}` mention.
   *
   * @param {string} text
   * @param {string} source — diagnostic path
   * @param {Concept} concept — the owning concept (for cite-ref lookup)
   * @returns {Reference[]}
   */
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

  /**
   * Resolve a `cite-ref` parser result against the concept's
   * sources list. Emits a Bibliography Reference with the
   * resolved Citation (if found) or an unresolved Reference
   * (if not).
   *
   * @param {MentionParseResult} parsed
   * @param {string} source — diagnostic path
   * @param {Concept} concept — the owning concept
   * @returns {Reference}
   */
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

  /**
   * Resolve a single reference against a registry (a map of
   * datasetId → { concepts, register? }). The registry may also
   * include 'bibliography:<source>' keys for bibliographic
   * datasets.
   *
   * For a `type: 'bibliography'` Reference with an inline
   * `citation`, the resolver first tries the bibliography
   * registry (matching `citation.ref` by source/id/version);
   * if not found, returns the inline Citation as a
   * self-contained fallback.
   *
   * For a `type: 'bibliography'` Reference with a `uri` and
   * `resolution.kind === 'bibliography-namespace'`, the
   * resolver tries the bibliography registry by
   * `resolution.source/id/version`.
   *
   * For `type: 'concept'` References with a `lookupKey.id`
   * (id-match, short-id, or numeric), the resolver looks up
   * the id in `lookupKey.dataset`'s ConceptCollection.
   *
   * Backward compat: when the second argument is a
   * ConceptCollection (has `byId` but no `concepts` field), it
   * is treated as a one-key registry of one default dataset.
   */
  resolveReference(ref, registry) {
    if (ref == null) return null;

    // Backward-compat: single ConceptCollection becomes a
    // one-key registry.
    if (isConceptCollection(registry)) {
      registry = { _default: { concepts: registry } };
    }
    if (registry == null) return null;

    // 1. cite:key form (Bibliography with inline Citation).
    if (ref.type === 'bibliography' && ref.citation) {
      const bioRecord = this._resolveBibliographyRecord(
        ref.citation.ref,
        registry,
      );
      if (bioRecord) return bioRecord;
      return ref.citation;
    }

    // 2. URI form (urn:... or https:...) with
    //    bibliography-namespace resolution.
    if (ref.uri) {
      if (ref.resolution?.kind === 'bibliography-namespace'
          || (ref.resolution?.source && !ref.resolution?.datasetId)) {
        const bioRecord = this._resolveBibliographyRecord(
          ref.resolution,
          registry,
        );
        if (bioRecord) return bioRecord;
      }
      // Concept URI lookup (for non-bibliography URIs).
      if (ref.resolution?.datasetId) {
        const coll = registry[ref.resolution.datasetId]?.concepts;
        if (coll) {
          return coll.byId(ref.resolution.conceptId);
        }
      }
      return null;
    }

    // 3. Same-dataset concept id (numeric mention, id-match, etc.).
    if (ref.lookupKey?.id) {
      const coll = registry[ref.lookupKey.dataset]?.concepts;
      if (coll) return coll.byId(ref.lookupKey.id);
      return null;
    }

    // 3b. Backward-compat: a concept ref with a `target` (id)
    //     but no `lookupKey` is looked up in the single
    //     collection (backward-compat one-key registry).
    if (ref.type === 'concept' && ref.target) {
      const defaultColl = registry._default?.concepts;
      if (defaultColl) return defaultColl.byId(ref.target);
      // Try every dataset in the registry as a fallback.
      for (const entry of Object.values(registry)) {
        if (entry?.concepts?.byId(ref.target)) {
          return entry.concepts.byId(ref.target);
        }
      }
      return null;
    }

    // 4. Unanchored designation — search is a separate concern
    //    (plan 06). For v8, return null.
    if (ref.lookupKey?.designation) {
      return null;
    }

    return null;
  }

  /**
   * Try to resolve a Citation::Ref against the bibliography
   * registry. The ref has shape { source, id, version? }.
   *
   * Returns the matching bibliographic record (a Concept), or
   * null if no match.
   */
  _resolveBibliographyRecord(citationRef, registry) {
    if (!citationRef?.source || !citationRef?.id) return null;
    const bioColl = registry[`bibliography:${citationRef.source}`]?.concepts;
    if (!bioColl) return null;
    if (citationRef.version) {
      return bioColl.byIdAnd(citationRef.id, citationRef.version);
    }
    return bioColl.byId(citationRef.id);
  }

  resolveAll(concept, registry) {
    const resolved = new Map();
    for (const ref of this.extractReferences(concept)) {
      if (ref.type === 'concept' || ref.type === 'bibliography') {
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

/**
 * Type-guard for the single-collection case (backward compat).
 * A ConceptCollection has `byId` but no `concepts` field.
 */
function isConceptCollection(x) {
  return x != null
    && typeof x === 'object'
    && typeof x.byId === 'function'
    && !('concepts' in x);
}

export const referenceResolver = new ReferenceResolver();
