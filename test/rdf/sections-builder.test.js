import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Parser, Store, DataFactory } from 'n3';
import { quadSectionsToClassInstances } from '../../src/rdf/sections-builder.js';
import { conceptToQuads } from '../../src/rdf/gloss-concept.js';
import { Concept } from '../../src/models/index.js';

function parseTurtle(text) {
  const parser = new Parser({ format: 'Turtle' });
  const store = new Store();
  store.addQuads(parser.parse(text));
  return [...store];
}

describe('quadSectionsToClassInstances', () => {
  it('returns empty array for empty input', () => {
    assert.deepEqual(quadSectionsToClassInstances([]), []);
    assert.deepEqual(quadSectionsToClassInstances(null), []);
    assert.deepEqual(quadSectionsToClassInstances(undefined), []);
  });

  it('groups quads by subject in insertion order', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .

      ex:a a skos:Concept ;
        rdfs:label "A" ;
        ex:value "1" .
      ex:b a skos:Concept ;
        rdfs:label "B" .
    `);
    const sections = quadSectionsToClassInstances(quads);
    assert.equal(sections.length, 2);
    assert.equal(sections[0].label, 'A');
    assert.equal(sections[1].label, 'B');
  });

  it('derives classLabel from CURIE local name', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
      ex:x a skos:Concept .
    `);
    const [section] = quadSectionsToClassInstances(quads);
    // classId is CURIE form (compacted for UI consumers)
    assert.equal(section.classId, 'skos:Concept');
    assert.equal(section.classLabel, 'Concept');
  });

  it('derives classLabel from absolute IRI last segment', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix misc: <https://example.org/misc/> .
      ex:y a misc:Widget .
    `);
    const [section] = quadSectionsToClassInstances(quads);
    assert.equal(section.classLabel, 'Widget');
  });

  it('prefers skos:prefLabel over rdfs:label', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
      ex:x rdfs:label "rdfs-label" ;
           skos:prefLabel "pref-label" .
    `);
    const [section] = quadSectionsToClassInstances(quads);
    assert.equal(section.label, 'pref-label');
  });

  it('falls back to rdfs:label when no prefLabel', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      ex:x rdfs:label "just-label" .
    `);
    const [section] = quadSectionsToClassInstances(quads);
    assert.equal(section.label, 'just-label');
  });

  it('falls back to subject URI last segment when no label triple', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix ex2: <https://example.org/pred/> .
      ex:my-resource ex2:pred "value" .
    `);
    const [section] = quadSectionsToClassInstances(quads);
    assert.equal(section.label, 'my-resource');
  });

  it('prefers prefLabel in requested language', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
      ex:x skos:prefLabel "English"@en , "Français"@fr .
    `);
    const sections = quadSectionsToClassInstances(quads, { language: 'fr' });
    assert.equal(sections[0].label, 'Français');
  });

  it('nests bnode objects into PropValue.nested=true', () => {
    const quads = parseTurtle(`
      @prefix ex: <https://example.org/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      ex:x ex:hasDefinition [
        rdf:value "A definition" ;
        ex:source "Some source"
      ] .
    `);
    const [section] = quadSectionsToClassInstances(quads);
    const defProp = section.props.find(p => p.predicate.endsWith('hasDefinition'));
    assert.ok(defProp, 'hasDefinition prop present');
    assert.equal(defProp.nested, true);
    assert.ok(defProp.values[0].includes('A definition'));
    assert.ok(defProp.values[0].includes('Some source'));
  });

  it('creates one PropValue per distinct (predicate, value) pair', () => {
    // Matches concept-browser's original sections-builder semantics:
    // each unique (predicate, value) becomes its own PropValue with
    // values: [single]. Multi-valued predicates produce multiple
    // PropValues, not one PropValue with N values.
    const subject = DataFactory.namedNode('https://example.org/x');
    const pred = DataFactory.namedNode('https://example.org/pred/tag');
    const quads = [
      DataFactory.quad(subject, pred, DataFactory.literal('a')),
      DataFactory.quad(subject, pred, DataFactory.literal('a')),
      DataFactory.quad(subject, pred, DataFactory.literal('b')),
    ];
    const [section] = quadSectionsToClassInstances(quads);
    const tagProps = section.props.filter(p => p.predicate.endsWith('tag'));
    assert.equal(tagProps.length, 2);
    assert.deepEqual(tagProps.map(p => p.values[0]), ['a', 'b']);
  });

  it('produces ClassInstance[] for a real concept', () => {
    const concept = new Concept({
      id: 'c1',
      termid: '1',
      status: 'valid',
      languages: ['eng'],
      localizations: {
        eng: {
          language_code: 'eng',
          terms: [{ designation: 'foo', type: 'expression', normative_status: 'preferred' }],
          definition: [{ content: 'A test concept.' }],
          sources: [],
        },
      },
    });
    const quads = [...conceptToQuads(concept, { registerId: 'test', uriBase: 'https://example.org' })];
    const sections = quadSectionsToClassInstances(quads);
    assert.ok(sections.length > 0);
    // First section should be the concept itself; classId compacted to CURIE
    assert.match(sections[0].classId, /^gloss:Concept$/);
  });
});
