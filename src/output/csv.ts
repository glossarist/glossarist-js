// Aggregate CSV projection of the Concept model.
//
// One row per (concept × language). Layout proven in
// glossarist/concept-browser#214 and specified in glossarist-js#132:
// UTF-8 BOM + CRLF so Excel opens the file without an import wizard;
// RFC 4180 quoting so embedded newlines survive inside cells.
//
// Model-driven: reads the same Concept/LocalizedConcept API covered by
// the v3 wire-format round-trip tests. No second normalization layer.

import type { Concept } from '../models/concept.js';
import { conceptUri } from '../rdf/gloss-concept.js';

export const CSV_COLUMNS = Object.freeze([
  'termid',
  'uri',
  'status',
  'section',
  'language',
  'term',
  'alt_terms',
  'definition',
  'notes',
  'examples',
  'sources',
  'source_links',
]) as readonly string[];

export interface CsvOptions {
  /** Preferred language column order; unlisted languages append after. */
  languageOrder?: readonly string[];
  /** Deployment URI root + register — fills the `uri` column for concepts
   * parsed from YAML, which never carry a preset uri. */
  uriBase?: string;
  registerId?: string;
  /** Site-navigation URI prefix (e.g. `<uriBase>/dataset/<register>/concept/`)
   * — wins over the uriBase/registerId RDF-canonical fallback. The `uri`
   * column is a link a human opens, so deployments whose site routes differ
   * from their RDF identity pass the route shape here. Preset `concept.uri`
   * still wins over both. */
  conceptUriPrefix?: string;
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function joinLines(items: ReadonlyArray<string | null | undefined>): string {
  return items.filter((s): s is string => typeof s === 'string' && s.length > 0).join('\n');
}

function joinSemicolons(items: ReadonlyArray<string | null | undefined>): string {
  return items.filter((s): s is string => typeof s === 'string' && s.length > 0).join('; ');
}

interface SourceLike {
  origin?: {
    ref?: { source?: string | null; id?: string | null } | null;
    link?: string | null;
  } | null;
}

function sourceRefString(src: SourceLike): string {
  const ref = src.origin?.ref;
  if (!ref) return '';
  return [ref.source, ref.id].filter((p): p is string => p != null && p !== '').join(': ');
}

function sourceLinkString(src: SourceLike): string {
  return src.origin?.link ?? '';
}

function orderedLanguages(present: readonly string[], languageOrder?: readonly string[]): string[] {
  if (!languageOrder?.length) return [...present];
  const ordered = languageOrder.filter((lang) => present.includes(lang));
  return ordered.concat(present.filter((lang) => !ordered.includes(lang)));
}

interface DesignationLike {
  designation: string;
  normativeStatus?: string | null;
}

function splitTerms(
  terms: ReadonlyArray<DesignationLike>,
): { term: string; altTerms: string[] } {
  const withText = terms.filter((t) => t.designation);
  if (withText.length === 0) return { term: '', altTerms: [] };
  const preferred =
    withText.find((t) => t.normativeStatus === 'preferred') ?? withText[0]!;
  const altTerms = withText.filter((t) => t !== preferred).map((t) => t.designation);
  return { term: preferred.designation, altTerms };
}

function conceptRowCells(concept: Concept, lang: string, sources: ReadonlyArray<SourceLike>, options: CsvOptions = {}): string[] {
  const lc = concept.localization(lang);
  const terms = lc?.terms ?? [];
  const { term, altTerms } = splitTerms(terms);
  const uri =
    concept.uri ??
    (options.conceptUriPrefix != null
      ? `${options.conceptUriPrefix}${concept.termid ?? concept.id}`
      : options.uriBase && options.registerId
        ? conceptUri(concept, { registerId: options.registerId, uriBase: options.uriBase })
        : '');

  return [
    concept.termid ?? concept.id,
    uri,
    concept.status ?? '',
    joinSemicolons(concept.domains.map((d) => d.conceptId)),
    lang,
    term,
    altTerms.join('; '),
    joinLines((lc?.definitions ?? []).map((d) => d.content)),
    joinLines((lc?.notes ?? []).map((d) => d.content)),
    joinLines((lc?.examples ?? []).map((d) => d.content)),
    joinSemicolons(sources.map(sourceRefString)),
    joinSemicolons(sources.map(sourceLinkString)),
  ];
}

/**
 * Aggregate CSV: one row per (concept × language). UTF-8 BOM + CRLF.
 */
export function conceptsToCsv(
  concepts: readonly Concept[],
  options: CsvOptions = {},
): string {
  const rows: string[] = [CSV_COLUMNS.join(',')];

  for (const concept of concepts) {
    const languages = orderedLanguages(concept.languages, options.languageOrder);

    if (languages.length === 0) {
      rows.push(
        conceptRowCells(concept, '', concept.sources, options).map(csvEscape).join(','),
      );
      continue;
    }

    for (const lang of languages) {
      const lc = concept.localization(lang);
      const sources: ReadonlyArray<SourceLike> =
        lc?.sources?.length ? lc.sources : concept.sources;
      rows.push(conceptRowCells(concept, lang, sources, options).map(csvEscape).join(','));
    }
  }

  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}
