import { TextDiff } from './text-diff.js';

const COLORS = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

export function renderConceptDiff(diff, options = {}) {
  const colors = options.colors ?? false;
  const showUnchanged = options.showUnchanged ?? false;
  const lines = [];

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

export function renderCollectionDiff(diff, options = {}) {
  const colors = options.colors ?? false;
  const lines = [];

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
  }

  const changedDiffs = Object.entries(diff.conceptDiffs)
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

export function renderTextDiff(textDiff, options = {}) {
  if (!(textDiff instanceof TextDiff)) {
    textDiff = TextDiff.fromJSON(textDiff);
  }
  const colors = options.colors ?? false;
  const lines = [];

  for (const hunk of textDiff.hunks) {
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

function renderConceptLevel(diff, colors) {
  const lines = [];
  lines.push(...renderListDiff('Sources', diff.sources, colors, itemLabel));
  lines.push(...renderListDiff('Dates', diff.dates, colors, itemLabel));
  lines.push(...renderListDiff('Related', diff.relatedConcepts, colors, itemLabel));
  lines.push(...renderListDiff('Partitive relations', diff.partitiveRelations ?? diff.partitiveHyperedges, colors, relationLabel));
  lines.push(...renderListDiff('Groups', diff.groups, colors, itemLabel));
  lines.push(...renderListDiff('Sections', diff.sections, colors, itemLabel));
  lines.push(...renderListDiff('Tags', diff.tags, colors, itemLabel));
  lines.push(...renderMetadataDiff(diff.metadata));
  return lines.filter(Boolean).join('\n');
}

function renderLanguageSet(diff, colors) {
  const lines = [];
  for (const entry of diff.added) {
    lines.push(colors ? `  + ${COLORS.green(entry.value)}` : `  + ${entry.value}`);
  }
  for (const entry of diff.removed) {
    lines.push(colors ? `  - ${COLORS.red(entry.value)}` : `  - ${entry.value}`);
  }
  return lines.join('\n');
}

function renderLocalized(diff, colors) {
  const lines = [];
  lines.push(...renderListDiff('Designations', diff.designations, colors, designationLabel));
  lines.push(...renderListDiff('Definitions', diff.definitions, colors, definitionLabel));
  lines.push(...renderListDiff('Notes', diff.notes, colors, definitionLabel));
  lines.push(...renderListDiff('Examples', diff.examples, colors, definitionLabel));
  lines.push(...renderListDiff('Sources', diff.sources, colors, itemLabel));
  lines.push(...renderListDiff('Dates', diff.dates, colors, itemLabel));
  lines.push(...renderListDiff('Related', diff.related, colors, itemLabel));
  lines.push(...renderMetadataDiff(diff.metadata));
  return lines.filter(Boolean).join('\n');
}

function renderListDiff(label, listDiff, colors, labelFn) {
  if (!listDiff.hasChanges) return [];
  const lines = [`  ${label}:`];
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

function renderMetadataDiff(metadataDiff) {
  if (!metadataDiff.hasChanges) return [];
  const lines = [`  Metadata:`];
  for (const [field, change] of Object.entries(metadataDiff.changes)) {
    const oldVal = formatScalar(change.oldValue);
    const newVal = formatScalar(change.newValue);
    lines.push(`    ~ ${field}: ${oldVal} → ${newVal}`);
  }
  return lines;
}

function designationLabel(d) {
  if (!d) return '?';
  const text = d.designation ?? '?';
  const status = d.normativeStatus ? ` (${d.normativeStatus})` : '';
  return `${text}${status}`;
}

function definitionLabel(d) {
  if (!d) return '?';
  return d.content ?? '?';
}

function relationLabel(r) {
  if (!r) return '?';
  const c = r.comprehensive;
  const head = c?.id ?? c?.source ?? c?.text ?? '?';
  const partitives = Array.isArray(r.partitives)
    ? r.partitives.map(m => {
        const ref = m?.ref ?? m ?? {};
        const tail = m?.certainty === 'possible' ? '?' : '';
        return `${ref.id ?? ref.source ?? ref.text ?? '?'}${tail}`;
      }).join(', ')
    : '';
  const completeness = r.completeness ? ` (${r.completeness})` : '';
  const criterion = r.criterion
    ? ` / ${Object.values(r.criterion)[0] ?? ''}`
    : '';
  const plurality = r.plurality
    ? ` [${_pluralityLabel(r.plurality)}]`
    : '';
  return `${head} → {${partitives}}${completeness}${criterion}${plurality}`;
}

function _pluralityLabel(p) {
  if (!p) return '';
  const flags = [];
  if (p.is_shared) flags.push('shared');
  if (p.is_uncertain) flags.push('uncertain');
  if (p.shared_type) {
    const t = p.shared_type;
    flags.push(`type=${t.id ?? t.source ?? '?'}`);
  }
  return flags.join(',');
}

function itemLabel(item) {
  if (item == null) return '?';
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (typeof item.toJSON === 'function') {
    return JSON.stringify(item.toJSON());
  }
  return String(item);
}

function formatScalar(val) {
  if (val == null) return '∅';
  if (typeof val === 'string') return val;
  return String(val);
}

function colorizeSimilarity(pct) {
  if (pct >= 95) return COLORS.green(`${pct}%`);
  if (pct >= 80) return COLORS.yellow(`${pct}%`);
  return COLORS.red(`${pct}%`);
}
