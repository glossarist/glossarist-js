export class Reference {
  constructor(type, target, relationship, source) {
    this.type = type;
    this.target = target;
    this.relationship = relationship ?? null;
    this.source = source ?? null;
  }
}

export class ReferenceResolver {
  extractReferences(concept) {
    const refs = [];

    for (const rc of concept.relatedConcepts) {
      const target = rc.content ?? rc.ref?.toString() ?? '';
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

      const texts = [
        ...(lc.definitions?.map(d => d.content ?? '') ?? []),
        ...(lc.notes?.map(n => typeof n === 'object' ? (n.content ?? '') : String(n)) ?? []),
      ];
      for (const text of texts) {
        refs.push(..._extractEmbedded(text));
      }
    }

    return refs;
  }

  resolveReference(ref, collection) {
    if (ref.type !== 'concept') return null;
    return collection.byId(ref.target);
  }

  resolveAll(concept, collection) {
    const resolved = new Map();
    for (const ref of this.extractReferences(concept)) {
      if (ref.type === 'concept') {
        resolved.set(ref.target, this.resolveReference(ref, collection));
      }
    }
    return resolved;
  }
}

const CONCEPT_REF_RE = /\{\{([^}]+)\}\}|\b(\d+(?:\.\d+)+)\b/g;

function _extractEmbedded(text) {
  const refs = [];
  let m;
  CONCEPT_REF_RE.lastIndex = 0;
  while ((m = CONCEPT_REF_RE.exec(text)) !== null) {
    const target = m[1] ?? m[2];
    if (target && /^\d+(\.\d+)+$/.test(target)) {
      refs.push(new Reference('concept', target, 'embedded', null));
    }
  }
  return refs;
}

export const referenceResolver = new ReferenceResolver();
