import { TextDiff } from './text-diff.js';
import { resolveMultiplicity } from '../models/multiplicity.js';
import type { ConceptDiff, ConceptLevelDiff, LocalizedConceptDiff, MetadataDiff } from './concept-diff.js';
import type { ConceptCollectionDiff } from './collection-diff.js';
import type { ListDiff } from './list-diff.js';
import type { PartitivePresence } from '../models/partitive-presence.js';
import type { PartitiveCount } from '../models/partitive-count.js';

const COLORS = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
} as const;

interface RenderOptions { colors?: boolean; showUnchanged?: boolean }

export function renderConceptDiff(diff: ConceptDiff, options: RenderOptions = {}): string {
  const colors = options.colors ?? false;
  const showUnchanged = options.showUnchanged ?? false;
  const lines: string[] = [];

  const pct = Math.round(diff.similarity * 100);
  const idPart = diff.oldId && diff.newId && diff.oldId !== diff.newId
    ? `${diff.oldId} → ${diff.newId}`
    : (diff.newId ?? diff.oldId ?? '?');

  const similarityStr = colors ? colorizeSimilarity(pct) : `${pct}%`;
  lines.push(`Concept "${idPart}" — ${similarityStr} similar`);

  if (!diff.hasChanges && !showUnchanged) {
    lines.push('  (no changes)');
    return lines.join('\n');
  }

  if (diff.concept.hasChanges || showUnchanged) {
    lines.push('');
    lines.push('Concept-level:');
    lines.push(renderConceptLevel(diff.concept, colors));
  }

  if (diff.languages.hasChanges || showUnchanged) {
    lines.push('');
    lines.push('Languages:');
    lines.push(renderLanguageSet(diff.languages, colors));
  }

  for (const lang of diff.localizationLanguages) {
    const lcDiff = diff.localization(lang);
    if (!lcDiff) continue;
    if (lcDiff.hasChanges || showUnchanged) {
      lines.push('');
      lines.push(`Localization (${lang}):`);
      lines.push(renderLocalized(lcDiff, colors));
    }
  }

  return lines.join('\n');
}

export function renderCollectionDiff(diff: ConceptCollectionDiff, options: RenderOptions = {}): string {
  const colors = options.colors ?? false;
  const lines: string[] = [];

  const pct = Math.round(diff.similarity * 100);
  const similarityStr = colors ? colorizeSimilarity(pct) : `${pct}%`;

  lines.push(`Collection comparison — ${similarityStr} similar overall`);
  lines.push(`  Old: ${diff.oldCount} concepts`);
  lines.push(`  New: ${diff.newCount} concepts`);
  lines.push(`  Matched: ${diff.matched.length}`);
  lines.push(`  Added: ${diff.added.length}`);
  lines.push(`  Removed: ${diff.removed.length}`);

  if (diff.added.length > 0) {
    lines.push('');
    lines.push(colors ? COLORS.green('Added concepts:') : 'Added concepts:');
    for (const entry of diff.added) {
      lines.push(`  + ${entry.value}`);
    }
  }

  if (diff.removed.length > 0) {
    lines.push('');
    lines.push(colors ? COLORS.red('Removed concepts:') : 'Removed concepts:');
    for (const entry of diff.removed) {
      lines.push(`  - ${entry.value}`);
    }
  }  const changedDiffs = Object.entries(diff.conceptDiffs)
    .filter(([, d]) => d.hasChanges)
    .sort(([, a], [, b]) => a.similarity - b.similarity);

  if (changedDiffs.length > 0) {
    lines.push('');
    lines.push('Changed concepts:');
    for (const [id, conceptDiff] of changedDiffs) {
      const conceptPct = Math.round(conceptDiff.similarity * 100);
      const pctStr = colors ? colorizeSimilarity(conceptPct) : `${conceptPct}%`;
      lines.push(`  ${id}: ${pctStr}`);
    }
  }

  return lines.join('\n');
}

export function renderTextDiff(textDiff: TextDiff | Record<string, unknown>, options: RenderOptions = {}): string {
  let td = textDiff;
  if (!(td instanceof TextDiff)) {
    td = TextDiff.fromJSON(td);
  }
  const colors = options.colors ?? false;
  const lines: string[] = [];

  for (const hunk of td.hunks) {
    if (hunk.type === 'equal') {
      lines.push(`  ${hunk.text}`);
    } else if (hunk.type === 'added') {
      lines.push(colors ? `+ ${COLORS.green(hunk.text)}` : `+ ${hunk.text}`);
    } else if (hunk.type === 'removed') {
      lines.push(colors ? `- ${COLORS.red(hunk.text)}` : `- ${hunk.text}`);
    }
  }

  return lines.join('\n');
}

function renderConceptLevel(diff: ConceptLevelDiff, colors: boolean): string {
  const lines: string[] = [];
  lines.push(...renderListDiff('Sources', diff.sources, colors, itemLabel));
  lines.push(...renderListDiff('Dates', diff.dates, colors, itemLabel));
  lines.push(...renderListDiff('Related', diff.relatedConcepts, colors, itemLabel));
  lines.push(...renderListDiff('Hyperedges', diff.relations, colors, relationLabel));
  lines.push(...renderListDiff('Groups', diff.groups, colors, itemLabel));
  lines.push(...renderListDiff('Sections', diff.sections, colors, itemLabel));
  lines.push(...renderListDiff('Tags', diff.tags, colors, itemLabel));
  lines.push(renderMetadataDiff(diff.metadata));
  return lines.filter(Boolean).join('\n');
}

function renderLanguageSet(diff: ListDiff, colors: boolean): string {
  const lines: string[] = [];
  for (const entry of diff.added) {
    lines.push(colors ? `  + ${COLORS.green(String(entry.value))}` : `  + ${entry.value}`);
  }
  for (const entry of diff.removed) {
    lines.push(colors ? `  - ${COLORS.red(String(entry.value))}` : `  - ${entry.value}`);
  }
  return lines.join('\n');
}

function renderLocalized(diff: LocalizedConceptDiff, colors: boolean): string {
  const lines: string[] = [];
  lines.push(...renderListDiff('Designations', diff.designations, colors, designationLabel));
  lines.push(...renderListDiff('Definitions', diff.definitions, colors, definitionLabel));
  lines.push(...renderListDiff('Notes', diff.notes, colors, definitionLabel));
  lines.push(...renderListDiff('Examples', diff.examples, colors, definitionLabel));
  lines.push(...renderListDiff('Sources', diff.sources, colors, itemLabel));
  lines.push(...renderListDiff('Dates', diff.dates, colors, itemLabel));
  lines.push(...renderListDiff('Related', diff.related, colors, itemLabel));
  lines.push(renderMetadataDiff(diff.metadata));
  return lines.filter(Boolean).join('\n');
}

type LabelFn = (v: unknown) => string;

function renderListDiff(label: string, listDiff: ListDiff, colors: boolean, labelFn: LabelFn): string[] {
  if (!listDiff.hasChanges) return [];
  const lines: string[] = [`  ${label}:`];
  for (const entry of listDiff.added) {
    const text = `    + ${labelFn(entry.value)}`;
    lines.push(colors ? COLORS.green(text) : text);
  }
  for (const entry of listDiff.removed) {
    const text = `    - ${labelFn(entry.value)}`;
    lines.push(colors ? COLORS.red(text) : text);
  }
  for (const entry of listDiff.changed) {
    const oldLabel = labelFn(entry.oldValue);
    const newLabel = labelFn(entry.newValue);
    lines.push(`    ~ ${oldLabel} → ${newLabel}`);
  }
  return lines;
}

function renderMetadataDiff(metadataDiff: MetadataDiff): string {
  if (!metadataDiff.hasChanges) return '';
  const lines: string[] = [`  Metadata:`];
  for (const [field, change] of Object.entries(metadataDiff.changes)) {
    const oldVal = formatScalar(change.oldValue);
    const newVal = formatScalar(change.newValue);
    lines.push(`    ~ ${field}: ${oldVal} → ${newVal}`);
  }
  return lines.join('\n');
}

interface DesignationLabel { designation?: string | null; normativeStatus?: string | null }
interface DefinitionLabel { content?: string | null }
interface MemberRef { id?: string; source?: string; text?: string }
interface MemberForMultiplicity {
  presence?: PartitivePresence;
  count?: PartitiveCount;
  multiplicity?: string;
}
interface MemberLike {
  ref?: MemberRef | null;
  presence?: PartitivePresence;
  count?: PartitiveCount;
  is_delimiting?: boolean;
  delimitingCharacteristic?: Record<string, unknown> | null;
  multiplicity?: string;
}
interface RelationLike {
  comprehensive?: MemberRef | null;
  partitives?: ReadonlyArray<MemberLike>;
  members?: ReadonlyArray<MemberLike>;
  completeness?: string | null;
  criterion?: Record<string, unknown> | null;
  constructor?: { kindLabel?: string };
}

function designationLabel(d: unknown): string {
  if (!d) return '?';
  const dx = d as DesignationLabel;
  const text = dx.designation ?? '?';
  const status = dx.normativeStatus ? ` (${dx.normativeStatus})` : '';
  return `${text}${status}`;
}

function definitionLabel(d: unknown): string {
  if (!d) return '?';
  return (d as DefinitionLabel).content ?? '?';
}

function relationLabel(r: unknown): string {
  if (!r) return '?';
  const rx = r as RelationLike;
  const c = rx.comprehensive;
  const head = c?.id ?? c?.source ?? c?.text ?? '?';
  const members = Array.isArray(rx.partitives) ? rx.partitives : rx.members;
  const memberText = Array.isArray(members)
    ? members.map(m => {
        const ref = (m?.ref ?? m ?? {}) as MemberRef;
        let tail = '';
        const mult = resolveMultiplicity(m);
        if (mult && mult !== 'compulsory') tail += ` (${mult})`;
        if (m?.is_delimiting === true) tail += ' ⊘';
        if (m?.delimitingCharacteristic) {
          const cv = Object.values(m.delimitingCharacteristic)[0];
          if (typeof cv === 'string' && cv.length > 0) tail += ` ⟨${cv}⟩`;
        }
        return `${ref.id ?? ref.source ?? ref.text ?? '?'}${tail}`;
      }).join(', ')
    : '';
  const completeness = rx.completeness ? ` (${rx.completeness})` : '';
  const criterion = rx.criterion
    ? ` / ${Object.values(rx.criterion)[0] ?? ''}`
    : '';
  const kindLabel = rx?.constructor?.kindLabel ?? '';
  const typeTag = kindLabel ? `${kindLabel} ` : '';
  return `${typeTag}${head} → {${memberText}}${completeness}${criterion}`;
}

export function multiplicityStats(relations: ReadonlyArray<RelationLike> | null | undefined): {
  total: number;
  byMultiplicity: Record<string, number>;
  byPresence: Record<string, number>;
  byCount: Record<string, number>;
  delimiting: number;
} {
  const byMultiplicity: Record<string, number> = {};
  const byPresence: Record<string, number> = {};
  const byCount: Record<string, number> = {};
  let delimitingCount = 0;
  let total = 0;
  for (const rel of relations ?? []) {
    for (const m of rel?.partitives ?? []) {
      total += 1;
      const mult = resolveMultiplicity(m as MemberForMultiplicity);
      byMultiplicity[mult] = (byMultiplicity[mult] ?? 0) + 1;
      const p = (m?.presence ?? 'required') as string;
      const c = (m?.count ?? 'exactly_one') as string;
      byPresence[p] = (byPresence[p] ?? 0) + 1;
      byCount[c] = (byCount[c] ?? 0) + 1;
      if (m?.is_delimiting === true) delimitingCount += 1;
    }
  }
  return { total, byMultiplicity, byPresence, byCount, delimiting: delimitingCount };
}

function itemLabel(item: unknown): string {
  if (item == null) return '?';
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  const ix = item as { toJSON?: () => unknown };
  if (typeof ix.toJSON === 'function') {
    return JSON.stringify(ix.toJSON());
  }
  return String(item);
}

function formatScalar(val: unknown): string {
  if (val == null) return '∅';
  if (typeof val === 'string') return val;
  return String(val);
}

function colorizeSimilarity(pct: number): string {
  if (pct >= 95) return COLORS.green(`${pct}%`);
  if (pct >= 80) return COLORS.yellow(`${pct}%`);
  return COLORS.red(`${pct}%`);
}
