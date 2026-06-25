import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/index.js';
import { Designation } from '../../src/models/designation.js';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
import { ConceptToGlossTransform } from '../../src/transforms/concept-to-gloss.transform.js';

function buildConcept() {
  return new Concept({
    id: '3.1.1',
    status: 'valid',
    localizations: {
      eng: {
        language_code: 'eng',
        terms: [new Designation({ type: 'expression', designation: 'atomic data unit', normative_status: 'preferred' })],
        definition: [new DetailedDefinition({ content: 'A data unit that cannot be subdivided.' })],
        sources: [],
        entry_status: 'valid',
        domain: 'data',
      },
      fra: {
        language_code: 'fra',
        terms: [new Designation({ type: 'expression', designation: 'unité atomique de données', normative_status: 'preferred' })],
        definition: [new DetailedDefinition({ content: 'Une unité de données qui ne peut pas être subdivisée.' })],
        sources: [],
        entry_status: 'valid',
        domain: 'data',
      },
    },
  });
}

describe('ConceptToGlossTransform', () => {
  it('toTurtle produces a valid Turtle document with all expected prefixes', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const ttl = await xform.toTurtle(buildConcept());
    assert.match(ttl, /@prefix gloss:/);
    assert.match(ttl, /@prefix skos:/);
    assert.match(ttl, /@prefix skosxl:/);
    assert.match(ttl, /@prefix dcterms:/);
  });

  it('toTurtle contains skos:prefLabel with language tag', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const ttl = await xform.toTurtle(buildConcept());
    assert.match(ttl, /skos:prefLabel "atomic data unit"@eng/);
    assert.match(ttl, /skos:prefLabel "unité atomique de données"@fra/);
  });

  it('toTurtle contains skos:definition with language tag', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const ttl = await xform.toTurtle(buildConcept());
    assert.match(ttl, /skos:definition "A data unit that cannot be subdivided\."@eng/);
  });

  it('toTurtle contains reified skosxl:prefLabel alongside direct skos:prefLabel', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const ttl = await xform.toTurtle(buildConcept());
    assert.match(ttl, /skosxl:prefLabel /);
    assert.match(ttl, /skosxl:literalForm "atomic data unit"@eng/);
  });

  it('toTurtleAll aggregates multiple concepts into one document', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const ttl = await xform.toTurtleAll([buildConcept(), new Concept({
      id: '3.1.2',
      status: 'valid',
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [new Designation({ type: 'expression', designation: 'data element', normative_status: 'preferred' })],
          definition: [new DetailedDefinition({ content: 'A unit of data.' })],
          sources: [],
          entry_status: 'valid',
        },
      },
    })]);
    assert.match(ttl, /concept\/3\.1\.1/);
    assert.match(ttl, /concept\/3\.1\.2/);
  });

  it('produces byte-equivalent Turtle across calls for the same input (determinism)', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const a = await xform.toTurtle(buildConcept());
    const b = await xform.toTurtle(buildConcept());
    assert.equal(a, b);
  });

  it('toNTriples produces a valid N-Triples document', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const nt = await xform.toNTriples(buildConcept());
    assert.match(nt, /<https:\/\/glossarist\.org\/iso\/concept\/3\.1\.1>/);
    // N-Triples never use prefix declarations.
    assert.doesNotMatch(nt, /@prefix/);
  });

  it('toJsonld produces a compacted JSON-LD document with @context', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const jsonld = await xform.toJsonld(buildConcept());
    const parsed = JSON.parse(jsonld);
    assert.ok(parsed['@context'], 'compacted JSON-LD must have @context');
    assert.ok(parsed['@graph'], 'compacted JSON-LD must have @graph array');
    assert.ok(Array.isArray(parsed['@graph']));
  });

  it('toJsonld contains the concept subject as @id with @type gloss:Concept', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const parsed = JSON.parse(await xform.toJsonld(buildConcept()));
    const conceptNode = parsed['@graph'].find(n => n['@id'] === 'https://glossarist.org/iso/concept/3.1.1');
    assert.ok(conceptNode, 'concept node must be present in @graph');
    assert.ok(conceptNode['@type'].includes('gloss:Concept'));
    assert.ok(conceptNode['@type'].includes('skos:Concept'));
  });

  it('toJsonld preserves the skos:prefLabel language-tagged literal', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const parsed = JSON.parse(await xform.toJsonld(buildConcept()));
    const lcNode = parsed['@graph'].find(n => n['@id'] === 'https://glossarist.org/iso/concept/3.1.1/eng');
    assert.ok(lcNode, 'localized concept node must be present');
    const prefLabel = lcNode['skos:prefLabel'];
    assert.ok(prefLabel, 'skos:prefLabel must be present');
    // In compacted JSON-LD with no container, language-tagged literals become
    // an array of { '@value': ..., '@language': ... } objects.
    const labelObjs = Array.isArray(prefLabel) ? prefLabel : [prefLabel];
    const eng = labelObjs.find(o => o['@language'] === 'eng' && o['@value'] === 'atomic data unit');
    assert.ok(eng, 'skos:prefLabel "atomic data unit"@eng must be present');
  });

  it('toJsonld preserves the skos:definition language-tagged literal', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const parsed = JSON.parse(await xform.toJsonld(buildConcept()));
    const lcNode = parsed['@graph'].find(n => n['@id'] === 'https://glossarist.org/iso/concept/3.1.1/eng');
    const def = lcNode['skos:definition'];
    assert.ok(def, 'skos:definition must be present');
    const defObjs = Array.isArray(def) ? def : [def];
    const eng = defObjs.find(o => o['@language'] === 'eng' && o['@value']?.includes('cannot be subdivided'));
    assert.ok(eng, 'skos:definition for eng must contain the definition text');
  });

  it('toJsonld accepts a custom context via options.jsonldContext', async () => {
    const xform = new ConceptToGlossTransform({
      registerId: 'iso',
      uriBase: 'https://glossarist.org',
      jsonldContext: { '@vocab': 'https://www.glossarist.org/ontologies/' },
    });
    const parsed = JSON.parse(await xform.toJsonld(buildConcept()));
    assert.ok(parsed['@context']);
    // With @vocab, no prefix keys are emitted — terms are compacted against the vocab.
    assert.equal(parsed['@context']['@vocab'], 'https://www.glossarist.org/ontologies/');
  });

  it('toJsonldAll aggregates multiple concepts under one @graph', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const parsed = JSON.parse(await xform.toJsonldAll([buildConcept(), new Concept({
      id: '3.1.2',
      status: 'valid',
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [new Designation({ type: 'expression', designation: 'data element', normative_status: 'preferred' })],
          definition: [new DetailedDefinition({ content: 'A unit of data.' })],
          sources: [],
          entry_status: 'valid',
        },
      },
    })]));
    const ids = parsed['@graph'].map(n => n['@id']);
    assert.ok(ids.includes('https://glossarist.org/iso/concept/3.1.1'));
    assert.ok(ids.includes('https://glossarist.org/iso/concept/3.1.2'));
  });

  it('produces byte-equivalent JSON-LD across calls for the same input (determinism)', async () => {
    const xform = new ConceptToGlossTransform({ registerId: 'iso', uriBase: 'https://glossarist.org' });
    const a = await xform.toJsonld(buildConcept());
    const b = await xform.toJsonld(buildConcept());
    assert.equal(a, b);
  });
});
