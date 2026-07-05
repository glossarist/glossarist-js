// NonVerbal entity → RDF quads. Mirrors the v3.1.0 concept-model
// NonVerbal class hierarchy. Two distinct shapes:
//
// 1. Legacy `gloss:NonVerbalRepresentation` (NonVerbRep) — a child of
//    LocalizedConcept with a positional bnode subject. Carries
//    `representationType`, `representationRef`, `representationText`.
//
// 2. Dataset-level `gloss:Figure` / `gloss:Table` / `gloss:Formula`
//    (SharedNonVerbalEntity subtypes) — first-class resources with
//    their own URIs. Carries caption, description, altText, sources,
//    plus subtype-specific fields (Figure: images + subfigures;
//    Table: content + format; Formula: expression + notation +
//    latexForm).
//
// The dispatch on the entity's `rdfClass()` follows the same OCP
// pattern as Designation — a new subtype registers without editing
// this emitter.
import { PRED, PREFIXES } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';
import { namedNode, literal, quad } from './terms.js';
import { conceptSourceToQuads } from './gloss-source.js';

const DCTERMS_DESCRIPTION = `${PREFIXES.dcterms}description`;
const DCTERMS_FORMAT = `${PREFIXES.dcterms}format`;
const XSD_STRING = `${PREFIXES.xsd}string`;

// ── Legacy NonVerbRep (concept-local, positional) ──────────────────────

// Emits a `gloss:NonVerbalRepresentation` blank node linked from the
// parent localized concept via `gloss:hasNonVerbalRep`. Mirrors the
// Ruby `Rdf::GlossNonVerbalRep` shape: type/ref/text plus sources.
export function* nonVerbalRepToQuads(nvr, { parentUri, index, language = null }) {
  const subject = deterministicBnode(parentUri, 'nvr', index);

  yield quad(namedNode(parentUri), namedNode(PRED.gloss.hasNonVerbalRep), namedNode(subject));
  yield quad(namedNode(subject), namedNode(WELL_KNOWN.rdfType), namedNode(`${PRED.gloss.$ns}${nvr.rdfClass()}`));

  if (nvr.type) {
    yield quad(namedNode(subject), namedNode(PRED.gloss.representationType), literal(nvr.type, XSD_STRING));
  }
  for (const image of nvr.images ?? []) {
    if (image.src) {
      yield quad(namedNode(subject), namedNode(PRED.gloss.image), literal(image.src, XSD_STRING));
    }
  }
  if (nvr.caption) {
    yield quad(namedNode(subject), namedNode(PRED.gloss.caption), literal(nvr.caption, language));
  }
  if (nvr.description) {
    yield quad(namedNode(subject), namedNode(DCTERMS_DESCRIPTION), literal(nvr.description, language));
  }
  if (nvr.alt) {
    yield quad(namedNode(subject), namedNode(PRED.gloss.altText), literal(nvr.alt, language));
  }

  let srcIndex = 0;
  for (const source of nvr.sources ?? []) {
    yield* conceptSourceToQuads(source, { subjectUri: subject, index: srcIndex });
    srcIndex += 1;
  }
}

// ── Dataset-level Figure / Table / Formula ────────────────────────────

// URI scheme: `<uriBase>/<registerId>/<kind>/<id>` where `kind` is the
// entity's rdfClass() lowercased (figure/table/formula). Stable across
// runs and consumers.
export function nonVerbalEntityUri(entity, { registerId, uriBase }) {
  const id = String(entity.id ?? entity.identifier ?? '');
  const kind = String(entity.rdfClass() ?? 'NonVerbalEntity').toLowerCase();
  const base = String(uriBase ?? '').replace(/\/+$/, '');
  return `${base}/${registerId}/${kind}/${id}`;
}

// Emits a dataset-level NonVerbalEntity (Figure/Table/Formula) as a
// first-class resource. Calls into subtype-specific emitters via the
// entity's class identity — OCP: a new subtype adds a branch in
// `subtypeQuadsFor` without changing the public entry point.
export function* nonVerbalEntityToQuads(entity, options) {
  const subjectUri = nonVerbalEntityUri(entity, options);
  const s = namedNode(subjectUri);

  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(`${PRED.gloss.$ns}${entity.rdfClass()}`));

  if (entity.caption) {
    yield quad(s, namedNode(PRED.gloss.caption), literal(entity.caption, null));
  }
  if (entity.description) {
    yield quad(s, namedNode(DCTERMS_DESCRIPTION), literal(entity.description, null));
  }
  if (entity.alt) {
    yield quad(s, namedNode(PRED.gloss.altText), literal(entity.alt, null));
  }

  yield* subtypeQuadsFor(entity, s, options);

  let srcIndex = 0;
  for (const source of entity.sources ?? []) {
    yield* conceptSourceToQuads(source, { subjectUri, index: srcIndex });
    srcIndex += 1;
  }
}

// Dispatch table: maps the entity's rdfClass() local name to a
// subtype-specific quad generator. Adding a new subtype = adding a
// branch here + an rdfClass() override on the model class.
function* subtypeQuadsFor(entity, s, options) {
  switch (entity.rdfClass()) {
    case 'Figure':  yield* figureQuads(entity, s, options); break;
    case 'Table':   yield* tableQuads(entity, s); break;
    case 'Formula': yield* formulaQuads(entity, s); break;
    // NonVerbalEntity base or unknown — no subtype-specific quads.
  }
}

function* figureQuads(figure, s, options) {
  let imgIndex = 0;
  for (const image of figure.images ?? []) {
    const imgSubject = deterministicBnode(s.value, 'image', imgIndex);
    yield quad(s, namedNode(PRED.gloss.image), namedNode(imgSubject));
    yield quad(namedNode(imgSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.FigureImage));
    if (image.src) {
      yield quad(namedNode(imgSubject), namedNode(PRED.gloss.src), literal(image.src, XSD_STRING));
    }
    if (image.format) {
      yield quad(namedNode(imgSubject), namedNode(DCTERMS_FORMAT), literal(image.format, XSD_STRING));
    }
    if (image.role) {
      yield quad(namedNode(imgSubject), namedNode(PRED.gloss.role), literal(image.role, XSD_STRING));
    }
    imgIndex += 1;
  }

  let subIndex = 0;
  for (const sub of figure.subfigures ?? []) {
    const subSubject = deterministicBnode(s.value, 'subfig', subIndex);
    yield quad(s, namedNode(PRED.gloss.hasSubfigure), namedNode(subSubject));
    // Subfigures recurse as their own Figure bnodes — same shape,
    // different subject. We inline the base + subtype quads so the
    // subfigure's images also resolve.
    yield* subfigureQuads(sub, subSubject, options);
    subIndex += 1;
  }
}

// Sub-figure emitter — mirrors `nonVerbalEntityToQuads` but with a
// pre-assigned bnode subject (subfigures don't get their own URI).
function* subfigureQuads(figure, subjectUri, _options) {
  const s = namedNode(subjectUri);
  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(`${PRED.gloss.$ns}${figure.rdfClass()}`));

  if (figure.caption) {
    yield quad(s, namedNode(PRED.gloss.caption), literal(figure.caption, null));
  }
  if (figure.description) {
    yield quad(s, namedNode(DCTERMS_DESCRIPTION), literal(figure.description, null));
  }
  if (figure.alt) {
    yield quad(s, namedNode(PRED.gloss.altText), literal(figure.alt, null));
  }

  let imgIndex = 0;
  for (const image of figure.images ?? []) {
    const imgSubject = deterministicBnode(s.value, 'image', imgIndex);
    yield quad(s, namedNode(PRED.gloss.image), namedNode(imgSubject));
    yield quad(namedNode(imgSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.FigureImage));
    if (image.src) {
      yield quad(namedNode(imgSubject), namedNode(PRED.gloss.src), literal(image.src, XSD_STRING));
    }
    imgIndex += 1;
  }
}

function* tableQuads(table, s) {
  if (table.content) {
    yield quad(s, namedNode(PRED.gloss.content), literal(table.content, null));
  }
  if (table.format) {
    yield quad(s, namedNode(PRED.gloss.format), literal(table.format, XSD_STRING));
  }
}

function* formulaQuads(formula, s) {
  if (formula.expression) {
    yield quad(s, namedNode(PRED.gloss.expression), literal(formula.expression, null));
  }
  if (formula.notation) {
    yield quad(s, namedNode(PRED.gloss.latexForm), literal(formula.notation, XSD_STRING));
  }
}
