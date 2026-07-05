import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  nonVerbalRepToQuads,
  nonVerbalEntityToQuads,
  nonVerbalEntityUri,
  collectQuads,
} from '../../src/rdf/index.js';
import { NonVerbRep } from '../../src/models/non-verb-rep.js';
import { Figure, FigureImage } from '../../src/models/figure.js';
import { Table } from '../../src/models/table.js';
import { Formula } from '../../src/models/formula.js';

const BASE_OPTS = { registerId: 'iso', uriBase: 'https://glossarist.org' };

function findQuads(quads, predicate) {
  return quads.filter(q => q.predicate.value === predicate);
}

describe('nonVerbalRepToQuads — legacy NonVerbRep', () => {
  it('links the parent localized concept via gloss:hasNonVerbalRep', () => {
    const nvr = new NonVerbRep({
      type: 'image',
      images: [{ src: 'fig-1.png' }],
      caption: 'Schema diagram',
    });
    const quads = collectQuads(nonVerbalRepToQuads(nvr, {
      parentUri: 'https://glossarist.org/iso/concept/3.1.1/eng',
      index: 0,
      language: 'eng',
    }));
    const links = findQuads(quads, 'https://www.glossarist.org/ontologies/hasNonVerbalRep');
    assert.equal(links.length, 1);
    assert.equal(links[0].object.value.split(':')[0], '_'); // bnode subject
  });

  it('types the bnode as gloss:NonVerbalRepresentation', () => {
    const nvr = new NonVerbRep({ type: 'image' });
    const quads = collectQuads(nonVerbalRepToQuads(nvr, {
      parentUri: 'https://glossarist.org/iso/concept/3.1.1/eng', index: 0,
    }));
    const types = quads
      .filter(q => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      .map(q => q.object.value);
    assert.ok(types.includes('https://www.glossarist.org/ontologies/NonVerbalRepresentation'));
  });

  it('emits representationType when type is set', () => {
    const nvr = new NonVerbRep({ type: 'table' });
    const quads = collectQuads(nonVerbalRepToQuads(nvr, {
      parentUri: 'https://glossarist.org/iso/concept/3.1.1/eng', index: 0,
    }));
    const typeQuads = findQuads(quads, 'https://www.glossarist.org/ontologies/representationType');
    assert.equal(typeQuads.length, 1);
    assert.equal(typeQuads[0].object.value, 'table');
  });

  it('emits an image quad per FigureImage entry', () => {
    const nvr = new NonVerbRep({
      type: 'image',
      images: [{ src: 'fig-1.png' }, { src: 'fig-2.png' }],
    });
    const quads = collectQuads(nonVerbalRepToQuads(nvr, {
      parentUri: 'https://glossarist.org/iso/concept/3.1.1/eng', index: 0,
    }));
    const images = findQuads(quads, 'https://www.glossarist.org/ontologies/image');
    assert.equal(images.length, 2);
  });

  it('emits caption, description, and altText when present', () => {
    const nvr = new NonVerbRep({
      type: 'image',
      caption: 'Schema',
      description: 'A diagram of the schema.',
      alt: 'Schema diagram alt text',
    });
    const quads = collectQuads(nonVerbalRepToQuads(nvr, {
      parentUri: 'https://glossarist.org/iso/concept/3.1.1/eng', index: 0, language: 'eng',
    }));
    assert.equal(findQuads(quads, 'https://www.glossarist.org/ontologies/caption').length, 1);
    assert.equal(findQuads(quads, 'http://purl.org/dc/terms/description').length, 1);
    assert.equal(findQuads(quads, 'https://www.glossarist.org/ontologies/altText').length, 1);
  });
});

describe('nonVerbalEntityToQuads — dataset-level Figure', () => {
  it('builds a stable URI under uriBase/registerId/figure/<id>', () => {
    const figure = new Figure({
      id: 'fig-1',
      images: [{ src: 'fig-1.png' }],
    });
    const uri = nonVerbalEntityUri(figure, BASE_OPTS);
    assert.equal(uri, 'https://glossarist.org/iso/figure/fig-1');
  });

  it('types the entity as gloss:Figure', () => {
    const figure = new Figure({ id: 'fig-1', images: [{ src: 'fig-1.png' }] });
    const quads = collectQuads(nonVerbalEntityToQuads(figure, BASE_OPTS));
    const types = quads
      .filter(q => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      .map(q => q.object.value);
    assert.ok(types.includes('https://www.glossarist.org/ontologies/Figure'));
  });

  it('emits each image as a gloss:FigureImage bnode with src + format + role', () => {
    const figure = new Figure({
      id: 'fig-1',
      images: [
        new FigureImage({ src: 'fig-1.png', format: 'image/png', role: 'primary' }),
        new FigureImage({ src: 'fig-1.svg', format: 'image/svg+xml', role: 'vector' }),
      ],
    });
    const quads = collectQuads(nonVerbalEntityToQuads(figure, BASE_OPTS));
    const imageLinks = findQuads(quads, 'https://www.glossarist.org/ontologies/image');
    assert.equal(imageLinks.length, 2);

    const figureImageTypes = quads
      .filter(q => q.object.value === 'https://www.glossarist.org/ontologies/FigureImage')
      .map(q => q.subject.value);
    assert.equal(figureImageTypes.length, 2);

    const srcs = findQuads(quads, 'https://www.glossarist.org/ontologies/src').map(q => q.object.value);
    assert.deepEqual(srcs.sort(), ['fig-1.png', 'fig-1.svg']);

    const formats = findQuads(quads, 'http://purl.org/dc/terms/format').map(q => q.object.value);
    assert.equal(formats.length, 2);
  });

  it('recursively emits subfigures via gloss:hasSubfigure', () => {
    const figure = new Figure({
      id: 'fig-1',
      images: [{ src: 'main.png' }],
      subfigures: [
        new Figure({ id: 'fig-1a', images: [{ src: 'sub-a.png' }] }),
      ],
    });
    const quads = collectQuads(nonVerbalEntityToQuads(figure, BASE_OPTS));
    const subLinks = findQuads(quads, 'https://www.glossarist.org/ontologies/hasSubfigure');
    assert.equal(subLinks.length, 1);

    // Subfigure bnode carries its own rdf:type gloss:Figure and src.
    const figureTypes = quads
      .filter(q => q.object.value === 'https://www.glossarist.org/ontologies/Figure')
      .map(q => q.subject.value);
    assert.equal(figureTypes.length, 2);

    const srcs = findQuads(quads, 'https://www.glossarist.org/ontologies/src').map(q => q.object.value);
    assert.ok(srcs.includes('main.png'));
    assert.ok(srcs.includes('sub-a.png'));
  });
});

describe('nonVerbalEntityToQuads — Table', () => {
  it('types the entity as gloss:Table and emits content + format', () => {
    const table = new Table({ id: 'tbl-1', content: '| a | b |', format: 'csv' });
    const quads = collectQuads(nonVerbalEntityToQuads(table, BASE_OPTS));
    const types = quads
      .filter(q => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      .map(q => q.object.value);
    assert.ok(types.includes('https://www.glossarist.org/ontologies/Table'));

    const contents = findQuads(quads, 'https://www.glossarist.org/ontologies/content').map(q => q.object.value);
    assert.deepEqual(contents, ['| a | b |']);

    const formats = findQuads(quads, 'https://www.glossarist.org/ontologies/format').map(q => q.object.value);
    assert.deepEqual(formats, ['csv']);
  });
});

describe('nonVerbalEntityToQuads — Formula', () => {
  it('types the entity as gloss:Formula and emits expression + latexForm', () => {
    const formula = new Formula({ id: 'eq-1', expression: 'E = mc^2', notation: 'E = mc^2' });
    const quads = collectQuads(nonVerbalEntityToQuads(formula, BASE_OPTS));
    const types = quads
      .filter(q => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      .map(q => q.object.value);
    assert.ok(types.includes('https://www.glossarist.org/ontologies/Formula'));

    const expressions = findQuads(quads, 'https://www.glossarist.org/ontologies/expression').map(q => q.object.value);
    assert.deepEqual(expressions, ['E = mc^2']);

    const latex = findQuads(quads, 'https://www.glossarist.org/ontologies/latexForm').map(q => q.object.value);
    assert.deepEqual(latex, ['E = mc^2']);
  });
});

describe('nonVerbalEntityToQuads — base + sources', () => {
  it('emits caption/description/altText on every NonVerbalEntity', () => {
    const figure = new Figure({
      id: 'fig-1',
      caption: 'Schema',
      description: 'A diagram.',
      alt: 'Schema alt text',
      images: [{ src: 'fig-1.png' }],
    });
    const quads = collectQuads(nonVerbalEntityToQuads(figure, BASE_OPTS));
    assert.equal(findQuads(quads, 'https://www.glossarist.org/ontologies/caption').length, 1);
    assert.equal(findQuads(quads, 'http://purl.org/dc/terms/description').length, 1);
    assert.equal(findQuads(quads, 'https://www.glossarist.org/ontologies/altText').length, 1);
  });

  it('emits sources via gloss:hasSource', () => {
    const figure = new Figure({
      id: 'fig-1',
      images: [{ src: 'fig-1.png' }],
      sources: [{ type: 'authoritative', origin: { ref: { source: 'ISO', id: '123' } } }],
    });
    const quads = collectQuads(nonVerbalEntityToQuads(figure, BASE_OPTS));
    const sources = findQuads(quads, 'https://www.glossarist.org/ontologies/hasSource');
    assert.equal(sources.length, 1);
  });
});

describe('nonVerbalEntityToQuads — determinism', () => {
  it('produces byte-equivalent quads across calls for the same Figure', () => {
    const figure = () => new Figure({
      id: 'fig-1',
      images: [{ src: 'fig-1.png' }, { src: 'fig-2.png' }],
      subfigures: [new Figure({ id: 'fig-1a', images: [{ src: 'sub.png' }] })],
    });
    const a = collectQuads(nonVerbalEntityToQuads(figure(), BASE_OPTS));
    const b = collectQuads(nonVerbalEntityToQuads(figure(), BASE_OPTS));
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.equal(a[i].toString(), b[i].toString());
    }
  });
});
