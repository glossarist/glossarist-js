// Output-set writer specs (TODO 64 / glossarist-js#132).
//
// One rich fixture drives every writer so all formats are proven against
// the same model walk. CSV assertions follow the production contract from
// concept-browser#214 (RFC 4180, BOM, CRLF, no-drop rows).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import { Citation } from '../../src/models/citation.js';
import { Locality } from '../../src/models/locality.js';
import { Expression } from '../../src/models/designation.js';
import { GrammarInfo } from '../../src/models/grammar-info.js';
import { CSV_COLUMNS, conceptsToCsv } from '../../src/output/csv.js';
import { conceptToTbx, conceptsToTbx } from '../../src/output/tbx.js';
import { conceptToJsonl, conceptsToJsonl } from '../../src/output/jsonl.js';
import { conceptToTurtle } from '../../src/output/turtle.js';
import {
  emitOutputSet,
  emitPerConceptFiles,
  OUTPUT_FORMATS,
} from '../../src/output/output-set.js';

const URI_BASE = 'https://example.org/vocab';
const REGISTER_ID = 'test-reg';

function richConcept(): Concept {
  const gi = new GrammarInfo({ gender: 'masculine', number: 'singular', noun: true });
  const loc = new Locality({ type: 'clause', reference_from: '4.2' });
  const citation = new Citation({
    ref: { source: 'ISO', id: '704' },
    link: 'https://www.iso.org/704',
    locality: loc,
  });
  const source = new ConceptSource({ type: 'authoritative', origin: citation });

  return new Concept({
    id: '111-01-01',
    termid: '111-01-01',
    status: 'valid',
    uri: `${URI_BASE}/${REGISTER_ID}/concept/111-01-01`,
    domains: [{ conceptId: '3.1' }],
    sources: [source],
    localizations: {
      eng: {
        terms: [
          new Expression({ designation: 'facility', normative_status: 'preferred' }),
          new Expression({ designation: 'installation', normative_status: 'admitted', grammar_info: [gi] }),
        ],
        definition: [{ content: 'body of a definition, line one' }, { content: 'second sense' }],
        notes: [{ content: 'a note' }],
        examples: [{ content: 'an example' }],
        entry_status: 'valid',
        sources: [source],
      },
      fra: {
        terms: [{ designation: 'installation', normative_status: 'preferred' }],
        definition: [{ content: 'définition avec « guillemets » et, virgules' }],
      },
    },
  });
}

function bareConcept(): Concept {
  return new Concept({ id: '222-02-02', termid: '222-02-02' });
}

function parseCsvRows(csv: string): string[][] {
  // Minimal RFC 4180 parser: quoted cells, embedded newlines, "" escapes.
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const body = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n') {
      row.push(cell); cell = '';
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // CRLF: \n handles the row break; \r is terminator-only outside quotes
      continue;
    } else {
      cell += ch;
    }
  }
  return rows;
}

describe('CSV writer', () => {
  it('header matches CSV_COLUMNS exactly', () => {
    const csv = conceptsToCsv([richConcept()]);
    assert.equal(csv.charCodeAt(0), 0xFEFF, 'must start with UTF-8 BOM');
    const rows = parseCsvRows(csv);
    assert.equal(rows[0]!.join(','), CSV_COLUMNS.join(','));
  });

  it('one row per (concept × language), preferred term first', () => {
    const rows = parseCsvRows(conceptsToCsv([richConcept()]));
    assert.equal(rows.length, 3); // header + eng + fra
    const eng = rows[1]!;
    assert.equal(eng[0], '111-01-01');
    assert.equal(eng[4], 'eng');
    assert.equal(eng[5], 'facility');
    assert.equal(eng[6], 'installation');
    assert.ok(eng[7]!.includes('line one') && eng[7]!.includes('second sense'));
  });

  it('definition newlines are embedded inside quoted cells (RFC 4180)', () => {
    const rows = parseCsvRows(conceptsToCsv([richConcept()]));
    const eng = rows[1]!;
    assert.equal(eng[7], 'body of a definition, line one\nsecond sense');
  });

  it('sources and source_links come from origin ref/link', () => {
    const rows = parseCsvRows(conceptsToCsv([richConcept()]));
    const eng = rows[1]!;
    assert.equal(eng[10], 'ISO: 704');
    assert.equal(eng[11], 'https://www.iso.org/704');
  });

  it('languageOrder reorders language rows', () => {
    const rows = parseCsvRows(conceptsToCsv([richConcept()], { languageOrder: ['fra', 'eng'] }));
    assert.equal(rows[1]![4], 'fra');
    assert.equal(rows[2]![4], 'eng');
  });

  it('concept without localizations still gets a row (no silent drops)', () => {
    const rows = parseCsvRows(conceptsToCsv([bareConcept()]));
    assert.equal(rows.length, 2);
    assert.equal(rows[1]![0], '222-02-02');
    assert.equal(rows[1]![4], '');
  });

  it('CRLF line endings throughout', () => {
    const csv = conceptsToCsv([richConcept()]);
    const body = csv.slice(1); // strip BOM
    assert.ok(body.endsWith('\r\n'));
    assert.ok(!body.includes('\r') || body.split('\r\n').every((l) => !l.includes('\r')));
  });
});

describe('TBX writer', () => {
  it('produces a TBX-Basic document per concept', () => {
    const tbx = conceptToTbx(richConcept(), { registerId: REGISTER_ID });
    assert.ok(tbx.startsWith('<?xml'));
    assert.ok(tbx.includes('type="TBX-Basic"'));
    assert.ok(tbx.includes('<conceptEntry id="111-01-01">'));
    assert.ok(tbx.includes('<term>facility</term>'));
    assert.ok(tbx.includes('xml:lang="eng"'));
    assert.ok(tbx.includes('xml:lang="fra"'));
  });

  it('serializes grammar info from Expression subtypes', () => {
    const tbx = conceptToTbx(richConcept(), { registerId: REGISTER_ID });
    assert.ok(tbx.includes('<grammaticalGender>masculine</grammaticalGender>'));
    assert.ok(tbx.includes('<grammaticalNumber>singular</grammaticalNumber>'));
    assert.ok(tbx.includes('<partOfSpeech>noun</partOfSpeech>'));
  });

  it('escapes XML-significant characters', () => {
    const c = new Concept({
      id: 'x1',
      localizations: { eng: { definition: [{ content: 'a < b & "c"' }] } },
    });
    const tbx = conceptToTbx(c, { registerId: REGISTER_ID });
    assert.ok(tbx.includes('a &lt; b &amp; &quot;c&quot;'));
    assert.ok(!tbx.includes('a < b & "c"'));
  });

  it('includes locality in source refs', () => {
    const tbx = conceptToTbx(richConcept(), { registerId: REGISTER_ID });
    assert.ok(tbx.includes('<ref>ISO 704, clause 4.2</ref>'));
  });

  it('aggregates concepts into one document; skips empty concepts', () => {
    const tbx = conceptsToTbx([richConcept(), bareConcept()], { registerId: REGISTER_ID });
    const entries = tbx.match(/<conceptEntry/g);
    assert.equal(entries?.length, 1);
  });
});

describe('JSONL writer', () => {
  it('one wire-format JSON object per line', () => {
    const line = conceptToJsonl(richConcept());
    const parsed = JSON.parse(line);
    assert.equal(parsed.id, '111-01-01');
    assert.ok(!line.includes('\n'));
  });

  it('aggregate joins with LF and trailing newline', () => {
    const jsonl = conceptsToJsonl([richConcept(), bareConcept()]);
    const lines = jsonl.split('\n');
    assert.equal(lines.length, 3); // 2 concepts + trailing empty
    assert.equal(lines[2], '');
    assert.equal(JSON.parse(lines[0]!).id, '111-01-01');
    assert.equal(JSON.parse(lines[1]!).id, '222-02-02');
  });

  it('round-trips through Concept.fromJSON', async () => {
    const { Concept: C } = await import('../../src/models/concept.js');
    const line = conceptToJsonl(richConcept());
    const restored = C.fromJSON(JSON.parse(line));
    assert.equal(restored.id, '111-01-01');
  });
});

describe('Turtle writer (sync)', () => {
  it('emits skos:Concept with prefLabel per language', () => {
    const ttl = conceptToTurtle(richConcept(), { uriBase: URI_BASE, registerId: REGISTER_ID });
    assert.ok(ttl.includes('skos:Concept'));
    assert.ok(ttl.includes('skos:prefLabel'));
    assert.ok(ttl.includes('facility'));
  });

  it('throws without uriBase (deployment config is never defaulted)', () => {
    assert.throws(
      () => conceptToTurtle(richConcept(), { registerId: REGISTER_ID } as never),
      /uriBase/,
    );
  });

  it('throws without registerId', () => {
    assert.throws(
      () => conceptToTurtle(richConcept(), { uriBase: URI_BASE } as never),
      /registerId/,
    );
  });
});

describe('emitOutputSet', () => {
  it('produces all six formats by default', async () => {
    const out = await emitOutputSet([richConcept()], {
      registerId: REGISTER_ID,
      uriBase: URI_BASE,
    });
    for (const f of OUTPUT_FORMATS) {
      assert.ok(out[f] != null && out[f]!.length > 0, `format ${f} must be non-empty`);
    }
  });

  it('respects a format subset', async () => {
    const out = await emitOutputSet([richConcept()], {
      registerId: REGISTER_ID,
      uriBase: URI_BASE,
      formats: ['csv', 'jsonl'],
    });
    assert.ok(out.csv != null);
    assert.ok(out.jsonl != null);
    assert.equal(out.tbx, undefined);
    assert.equal(out.turtle, undefined);
    assert.equal(out.jsonld, undefined);
    assert.equal(out.yaml, undefined);
  });

  it('throws RangeError on unknown format', async () => {
    await assert.rejects(
      () => emitOutputSet([], {
        registerId: REGISTER_ID,
        uriBase: URI_BASE,
        formats: ['rtf' as never],
      }),
      RangeError,
    );
  });

  it('throws InvalidInputError without registerId/uriBase', async () => {
    await assert.rejects(
      () => emitOutputSet([], { uriBase: URI_BASE } as never),
      /registerId/,
    );
    await assert.rejects(
      () => emitOutputSet([], { registerId: REGISTER_ID } as never),
      /uriBase/,
    );
  });

  it('turtle and jsonld share the quad-layer predicates', async () => {
    const out = await emitOutputSet([richConcept()], {
      registerId: REGISTER_ID,
      uriBase: URI_BASE,
      formats: ['turtle', 'jsonld'],
    });
    const jsonld = JSON.parse(out.jsonld!);
    const graph = JSON.stringify(jsonld['@graph'] ?? jsonld);
    assert.ok(graph.includes('skos:Concept') || graph.includes('http://www.w3.org/2004/02/skos/core#Concept'));
    assert.ok(out.turtle!.includes('skos:Concept'));
  });
});

describe('emitPerConceptFiles', () => {
  it('keys files by concept id, CSV excluded (aggregate-only)', async () => {
    const out = await emitPerConceptFiles([richConcept(), bareConcept()], {
      registerId: REGISTER_ID,
      uriBase: URI_BASE,
    });
    assert.ok(out['111-01-01']);
    assert.ok(out['222-02-02']);
    const files = out['111-01-01']!;
    assert.ok(files.turtle);
    assert.ok(files.jsonld);
    assert.ok(files.tbx);
    assert.ok(files.jsonl);
    assert.ok(files.yaml);
    assert.equal(files.csv, undefined);
  });

  it('output is feedable into GcrWriter.compiledFormats shape', async () => {
    const out = await emitPerConceptFiles([richConcept()], {
      registerId: REGISTER_ID,
      uriBase: URI_BASE,
      formats: ['tbx'],
    });
    const tbxFiles = Object.fromEntries(
      Object.entries(out).map(([id, files]) => [id, files.tbx!]),
    );
    assert.equal(typeof tbxFiles['111-01-01'], 'string');
    assert.ok(tbxFiles['111-01-01']!.includes('<conceptEntry'));
  });
});

describe('alignment guard — one model walk moves every format', () => {
  it('mutating the model moves csv, tbx, jsonl together', async () => {
    const before = {
      csv: conceptsToCsv([richConcept()]),
      tbx: conceptToTbx(richConcept(), { registerId: REGISTER_ID }),
      jsonl: conceptToJsonl(richConcept()),
    };
    const mutated = richConcept();
    const mutatedConcept = new Concept({
      ...mutated.toJSON(),
      id: '999-09-09',
      termid: '999-09-09',
    } as never);
    const after = {
      csv: conceptsToCsv([mutatedConcept]),
      tbx: conceptToTbx(mutatedConcept, { registerId: REGISTER_ID }),
      jsonl: conceptToJsonl(mutatedConcept),
    };
    assert.notEqual(after.csv, before.csv);
    assert.notEqual(after.tbx, before.tbx);
    assert.notEqual(after.jsonl, before.jsonl);
    assert.ok(after.jsonl.includes('999-09-09'));
    assert.ok(after.csv.includes('999-09-09'));
    assert.ok(after.tbx.includes('999-09-09'));
  });
});
