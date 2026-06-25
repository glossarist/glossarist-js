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
});
