// TBX-Basic (ISO 30042) projection of the Concept model.
//
// Port of the proven concept-browser emitter (scripts/lib/concept-formats.ts),
// re-rooted on the Concept model walk so the wire stays aligned with
// concept-model by construction. One shared XML escaper — no per-module
// escape drift.

import type { Concept } from '../models/concept.js';
import type { Designation } from '../models/designation.js';
import type { GrammarInfo } from '../models/grammar-info.js';

export interface TbxOptions {
  registerId?: string;
}

const POS_BY_TYPE: ReadonlyArray<readonly [RegExp, string]> = [
  [/abbreviation/i, 'abbreviation'],
  [/symbol/i, 'symbol'],
];

const GRAMMAR_POS_FIELDS = [
  'noun',
  'verb',
  'adj',
  'adverb',
  'preposition',
  'participle',
] as const;

function escapeXml(value: unknown): string {
  const str = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// grammarInfo lives on Expression (abbreviation-adjacent subtypes), not on
// the base Designation — read it structurally so all subtypes serialize.
function grammarBlock(designation: Designation): string {
  const gi = (designation as { grammarInfo?: ReadonlyArray<GrammarInfo> }).grammarInfo?.[0];
  if (!gi) return '';
  let block = '';
  if (gi.gender) block += `\n            <grammaticalGender>${escapeXml(gi.gender)}</grammaticalGender>`;
  if (gi.number) block += `\n            <grammaticalNumber>${escapeXml(gi.number)}</grammaticalNumber>`;
  for (const pos of GRAMMAR_POS_FIELDS) {
    if (gi[pos] === true) block += `\n            <partOfSpeech>${pos}</partOfSpeech>`;
  }
  return block;
}

function posBlockForType(type: string): string {
  for (const [pattern, pos] of POS_BY_TYPE) {
    if (pattern.test(type)) return `\n            <partOfSpeech>${pos}</partOfSpeech>`;
  }
  return '';
}

function localityText(locality: {
  type?: string | null;
  referenceFrom?: string | null;
} | null): string {
  if (!locality) return '';
  const ref = locality.referenceFrom;
  if (!ref) return '';
  return locality.type ? `${locality.type} ${ref}` : ref;
}

function sourceRefs(concept: Concept, lang: string): string[] {
  const lc = concept.localization(lang);
  const sources = lc?.sources?.length ? lc.sources : concept.sources;
  const refs: string[] = [];
  for (const src of sources) {
    const origin = src.origin;
    if (!origin) continue;
    const parts: string[] = [];
    const ref = origin.ref;
    if (ref) {
      const refParts = [ref.source, ref.id].filter(
        (p): p is string => p != null && p !== '',
      );
      if (refParts.length > 0) parts.push(refParts.join(' '));
    }
    const loc = localityText(origin.locality);
    if (loc) parts.push(loc);
    if (parts.length > 0) refs.push(escapeXml(parts.join(', ')));
  }
  return refs;
}

interface LangSection {
  lang: string;
  termEntries: string[];
  blocks: string;
}

function langSectionFor(concept: Concept, lang: string): LangSection | null {
  const lc = concept.localization(lang);
  if (!lc) return null;

  const termEntries: string[] = [];
  for (const d of lc.terms) {
    if (!d.designation) continue;
    const grammar = grammarBlock(d);
    const pos = posBlockForType(d.type);
    termEntries.push(`          <termEntry>
            <langSet xml:lang="${lang}">
              <tig>
                <term>${escapeXml(d.designation)}</term>${grammar}${pos}
              </tig>
            </langSet>
          </termEntry>`);
  }

  let defBlock = '';
  const definitions = lc.definitions.filter((d) => d.content);
  if (definitions.length > 0) {
    const parts = definitions
      .map((d) => `            <p>${escapeXml(d.content)}</p>`)
      .join('\n');
    defBlock = `\n          <descrip type="definition">\n${parts}\n          </descrip>`;
  }

  let noteBlock = '';
  for (const note of lc.notes) {
    if (note.content) noteBlock += `\n          <note type="note">${escapeXml(note.content)}</note>`;
  }
  for (const example of lc.examples) {
    if (example.content) noteBlock += `\n          <note type="example">${escapeXml(example.content)}</note>`;
  }

  let sourceBlock = '';
  for (const ref of sourceRefs(concept, lang)) {
    sourceBlock += `\n          <ref>${ref}</ref>`;
  }

  let statusBlock = '';
  if (lc.entryStatus) {
    statusBlock += `\n          <descrip type="entryStatus">${escapeXml(lc.entryStatus)}</descrip>`;
  }

  if (termEntries.length === 0 && !defBlock) return null;

  const termEntriesBlock = termEntries.length > 0 ? '\n' + termEntries.join('\n') : '';
  const blocks = [termEntriesBlock, defBlock, noteBlock, sourceBlock, statusBlock]
    .filter((b) => b !== '')
    .join('');
  return { lang, termEntries, blocks };
}

/**
 * One concept as a standalone TBX-Basic document. Empty string when the
 * concept has no terms or definitions in any localization.
 */
export function conceptToTbx(concept: Concept, options: TbxOptions = {}): string {
  const sections: LangSection[] = [];
  for (const lang of concept.languages) {
    const section = langSectionFor(concept, lang);
    if (section) sections.push(section);
  }
  if (sections.length === 0) return '';

  const bodyEntries = sections
    .map(
      (ls) =>
        `      <languageSection xml:lang="${ls.lang}">${ls.blocks}\n      </languageSection>`,
    )
    .join('\n');

  const source = options.registerId
    ? escapeXml(options.registerId)
    : escapeXml(concept.uri ?? concept.id);

  return `<?xml version="1.0" encoding="UTF-8"?>
<tbx style="dca" type="TBX-Basic" xml:lang="en" xmlns="urn:iso:std:iso:30042:ed-2">
  <tbxHeader>
    <fileDesc>
      <source>${source}</source>
    </fileDesc>
  </tbxHeader>
  <text>
    <body>
      <conceptEntry id="${escapeXml(concept.id)}">
${bodyEntries}
      </conceptEntry>
    </body>
  </text>
</tbx>
`;
}

/**
 * Aggregate TBX: one document, one `<conceptEntry>` per concept that has
 * serializable content. Concepts without content are skipped (TBX has no
 * empty-entry representation).
 */
export function conceptsToTbx(
  concepts: readonly Concept[],
  options: TbxOptions = {},
): string {
  const perConcept = concepts
    .map((c) => conceptToTbx(c, options))
    .filter((doc) => doc !== '')
    .map((doc) => {
      // Strip the XML declaration + header from each per-concept document,
      // keeping only the <conceptEntry> block for aggregation.
      const start = doc.indexOf('<conceptEntry');
      const end = doc.lastIndexOf('</conceptEntry>');
      return doc.slice(start, end + '</conceptEntry>'.length);
    });

  if (perConcept.length === 0) return '';

  const source = escapeXml(options.registerId ?? '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<tbx style="dca" type="TBX-Basic" xml:lang="en" xmlns="urn:iso:std:iso:30042:ed-2">
  <tbxHeader>
    <fileDesc>
      <source>${source}</source>
    </fileDesc>
  </tbxHeader>
  <text>
    <body>
${perConcept.join('\n')}
    </body>
  </text>
</tbx>
`;
}
