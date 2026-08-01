import { ValidationRule } from './validation-rule.js';
import type { Concept } from '../models/concept.js';
import type { ValidationResult } from './validation-result.js';
import { parseMention } from '../reference-mention.js';
import { GraphicalSymbol } from '../models/designation.js';

type LocalizedConcept = NonNullable<ReturnType<Concept['localization']>>;

interface SourceOriginRef { source?: string; id?: string }
interface SourceLocality { type?: string; reference_from?: string; referenceFrom?: string }
interface SourceOrigin { ref?: SourceOriginRef | null; locality?: SourceLocality | null }

const _eachLocalization = (concept: Concept, fn: (lang: string, lc: LocalizedConcept) => void) => {
  for (const lang of concept.languages) {
    const lc = concept.localization(lang);
    if (lc) fn(lang, lc);
  }
};

export class RefShapeRule extends ValidationRule {
  constructor() { super('ref-shape'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    let sourceIdx = 0;
    _eachLocalization(concept, (lang, lc) => {
      const sources = lc.sources;
      for (let i = 0; i < sources.length; i++) {
        sourceIdx++;
        const origin = sources[i]!.origin as SourceOrigin | null | undefined;
        if (!origin) continue;

        const ref = origin.ref;
        if (!ref) {
          this.addIssue(result,
            `${path}localizations.${lang}.sources[${i}].origin.ref`,
            `source ${sourceIdx} origin has nil ref (expected Citation.Ref hash)`);
        } else if (!ref.source && !ref.id) {
          this.addIssue(result,
            `${path}localizations.${lang}.sources[${i}].origin.ref`,
            `source ${sourceIdx} origin.ref has neither source nor id`);
        }
      }
    });

    const related = concept.relatedConcepts;
    for (let i = 0; i < related.length; i++) {
      const ref = related[i]!.ref as SourceOriginRef | null | undefined;
      if (!ref) continue;
      if (!ref.source && !ref.id) {
        this.addIssue(result,
          `${path}related[${i}].ref`,
          `related concept ${i + 1} has empty ref (no source or id)`);
      }
    }
  }
}

export class LocalityCompletenessRule extends ValidationRule {
  constructor() { super('locality-completeness', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    _eachLocalization(concept, (lang, lc) => {
      const sources = lc.sources;
      for (let i = 0; i < sources.length; i++) {
        const origin = sources[i]!.origin as SourceOrigin | null | undefined;
        if (!origin || !origin.locality) continue;

        const loc = origin.locality;
        if (!loc.type) {
          this.addIssue(result,
            `${path}localizations.${lang}.sources[${i}].origin.locality.type`,
            `source locality has no type`);
        }
        if (!loc.reference_from && !loc.referenceFrom) {
          this.addIssue(result,
            `${path}localizations.${lang}.sources[${i}].origin.locality.reference_from`,
            `source locality has no reference_from`);
        }
      }
    });
  }
}

export class LocalizationConsistencyRule extends ValidationRule {
  constructor() { super('localization-consistency'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const langs = concept.languages;
    const raw = concept.raw as { data?: { localized_concepts?: Record<string, unknown> } } | undefined;
    const data = raw?.data || {};
    const declaredLangs = data.localized_concepts
      ? Object.keys(data.localized_concepts)
      : langs;

    for (const lang of declaredLangs) {
      if (!concept.hasLocalization(lang)) {
        this.addIssue(result,
          `${path}localizations.${lang}`,
          `localized_concepts map has '${lang}' but no localization loaded`);
      }
    }
  }
}

export class SchemaVersionRule extends ValidationRule {
  constructor() { super('schema-version', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    if (concept.schemaVersion && String(concept.schemaVersion) !== '3') {
      this.addIssue(result,
        `${path}schema_version`,
        `schema_version is '${concept.schemaVersion}', expected '3'`);
    }
  }
}

export class DomainRefRule extends ValidationRule {
  constructor() { super('domain-ref', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    for (let i = 0; i < concept.domains.length; i++) {
      const json = concept.domains[i]!.toJSON() as { concept_id?: string; urn?: string };
      if (!json.concept_id && !json.urn) {
        this.addIssue(result,
          `${path}domains[${i}]`,
          `domain ${i + 1} has neither concept_id nor urn`);
      }
    }
  }
}

export class UuidFormatRule extends ValidationRule {
  constructor() { super('uuid-format'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const id = concept.id;

    if (id && !UUID_RE.test(String(id))) {
      if (String(id).includes('-') && String(id).length > 20) {
        this.addIssue(result,
          `${path}id`,
          `concept ID '${id}' is not valid UUID format`);
      }
    }
  }
}

export class SourceUrnFormatRule extends ValidationRule {
  constructor() { super('source-urn-format', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const URN_RE = /^urn:[a-z0-9][a-z0-9-]{0,31}:[a-z0-9()+,\-.:=@;$_!*'%/?#]+$/i;

    _eachLocalization(concept, (lang, lc) => {
      const sources = lc.sources;
      for (let i = 0; i < sources.length; i++) {
        const source = (sources[i]!.origin as SourceOrigin | null | undefined)?.ref?.source;
        if (!source || !source.startsWith('urn:')) continue;
        if (!URN_RE.test(source)) {
          this.addIssue(result,
            `${path}localizations.${lang}.sources[${i}].origin.ref.source`,
            `malformed URN '${source}'`);
        }
      }
    });
  }
}

const CITE_MENTION_RE = /\{\{\s*cite:([^,}\s]+)[^}]*?\}\}/g;

interface CiteMention { key: string; source: string; }

function _findCiteMentions(concept: Concept): CiteMention[] {
  const mentions: CiteMention[] = [];
  for (const { text, source } of concept.walkTexts()) {
    if (typeof text !== 'string' || text.length === 0) continue;
    CITE_MENTION_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CITE_MENTION_RE.exec(text)) !== null) {
      mentions.push({ key: m[1]!.trim(), source });
    }
  }
  return mentions;
}

function _findDuplicateSourceIds(concept: Concept): Map<string, unknown[]> {
  const seen = new Map<string, unknown[]>();
  const record = (source: any) => {
    if (source?.id == null) return;
    if (!seen.has(source.id)) seen.set(source.id, []);
    seen.get(source.id)!.push(source);
  };

  for (const source of concept.sources) record(source);
  for (const lang of concept.languages) {
    const lc = concept.localization(lang);
    if (!lc) continue;
    for (const source of (lc.sources)) record(source);
    for (const designation of lc.terms) {
      for (const source of designation.sources) record(source);
    }
  }

  const duplicates = new Map<string, unknown[]>();
  for (const [id, sources] of seen) {
    if (sources.length > 1) duplicates.set(id, sources);
  }
  return duplicates;
}

function _collectSourceIds(concept: Concept): Set<string> {
  const ids = new Set<string>();
  for (const source of concept.sources) {
    if (source?.id != null) ids.add(source.id);
  }
  for (const lang of concept.languages) {
    const lc = concept.localization(lang);
    if (!lc) continue;
    for (const source of (lc.sources)) {
      if (source?.id != null) ids.add(source.id);
    }
    for (const designation of lc.terms) {
      for (const source of designation.sources) {
        if (source?.id != null) ids.add(source.id);
      }
    }
  }
  return ids;
}

export class CiteRefIntegrityRule extends ValidationRule {
  constructor() {
    super('cite-ref-integrity', 'warning');
  }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    // 1. Check unique source ids.
    const duplicates = _findDuplicateSourceIds(concept);
    for (const [id] of duplicates) {
      this.addIssue(result,
        `${path}sources`,
        `duplicate source id "${id}" in concept "${concept.id ?? ''}"`);
    }

    // 2. Check that every inline {{cite:<key>}} mention resolves.
    const mentions = _findCiteMentions(concept);
    if (mentions.length === 0) return;

    const knownIds = _collectSourceIds(concept);

    for (const { key, source } of mentions) {
      if (!knownIds.has(key)) {
        this.addIssue(result,
          source,
          `inline {{cite:${key}}} does not resolve to any source in concept "${concept.id ?? ''}"`);
      }
    }
  }
}


// ── NonVerbalRefIntegrityRule ────────────────────────────────────────
// Uses parseMention for classification (no regex duplication).


const NVR_ARRAYS = Object.freeze([
  { name: 'figures', entityType: 'figure' },
  { name: 'tables', entityType: 'table' },
  { name: 'formulas', entityType: 'formula' },
]);

interface NvrMention { key: string; source: string; }

function _findNvrMentions(concept: Concept): NvrMention[] {
  const mentions: NvrMention[] = [];
  const walkText = (text: unknown, source: string) => {
    if (typeof text !== 'string' || text.length === 0) return;
    const re = /\{\{([^{}]*?)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const parsed = parseMention(m[1]!);
      if (parsed.kind === 'fig-ref' ||
          parsed.kind === 'table-ref' ||
          parsed.kind === 'formula-ref') {
        mentions.push({ key: parsed.key ?? '', source });
      }
    }
  };

  for (const { text, source } of concept.walkTexts()) {
    walkText(text, source);
  }
  return mentions;
}

export class NonVerbalRefIntegrityRule extends ValidationRule {
  constructor() {
    super('nvr-integrity', 'warning');
  }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const c = concept as any;
    for (const { name } of NVR_ARRAYS) {
      const counts = new Map<string, number>();
      for (const ref of c[name] ?? []) {
        if (ref.entityId == null) continue;
        counts.set(ref.entityId, (counts.get(ref.entityId) ?? 0) + 1);
      }
      for (const [id, count] of counts) {
        if (count > 1) {
          this.addIssue(result, `${path}${name}`,
            `duplicate ${name} reference id "${id}" appears ${count} times`);
        }
      }
    }

    const mentions = _findNvrMentions(concept);
    if (mentions.length === 0) return;

    const knownIds = new Set<string>();
    for (const { name } of NVR_ARRAYS) {
      for (const ref of c[name] ?? []) {
        if (ref.entityId != null) knownIds.add(ref.entityId);
      }
    }

    for (const { key, source } of mentions) {
      if (!knownIds.has(key)) {
        this.addIssue(result, source,
          `inline NVR mention "${key}" does not resolve to any figures/tables/formulas entry`);
      }
    }
  }
}

// ── OrphanedImagesRule ───────────────────────────────────────────────
// Collection-scope rule: needs AssetIndex + all concepts. Called
// directly by GcrValidator (not in concept validator chain).

export class OrphanedImagesRule {
  readonly name = 'orphaned-images';
  readonly severity = 'warning' as const;

  check(context: { assetIndex?: any; concepts: Concept[]; resolver?: any }): Array<{ path: string; severity: string; message: string }> {
    const { assetIndex, concepts, resolver } = context;
    if (!assetIndex || assetIndex.size === 0) return [];

    const referenced = new Set<string>();

    for (const concept of concepts) {
      if (resolver) {
        for (const ref of resolver.extractReferences(concept)) {
          if (ref.target && ref.target.includes('images/')) {
            referenced.add(ref.target.replace(/^\//, ''));
          }
        }
      }

      for (const lang of concept.languages) {
        const lc = concept.localization(lang);
        if (!lc) continue;

        for (const nvr of lc.nonVerbalRep) {
          for (const img of nvr.images) {
            if (img.src) referenced.add(img.src.replace(/^\//, ''));
          }
        }
        for (const term of lc.terms) {
          if (term instanceof GraphicalSymbol && term.image) {
            referenced.add(term.image.replace(/^\//, ''));
          }
        }
      }
    }

    const issues: Array<{ path: string; severity: string; message: string }> = [];
    for (const imgPath of assetIndex.paths) {
      if (!referenced.has(imgPath)) {
        issues.push({
          path: imgPath,
          severity: 'warning',
          message: `orphaned image: ${imgPath} (not referenced by any concept)`,
        });
      }
    }
    return issues;
  }
}

