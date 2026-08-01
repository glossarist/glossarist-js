import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonVerbalEntity } from '../../src/models/non-verbal-entity.js';
import { SharedNonVerbalEntity } from '../../src/models/shared-non-verbal-entity.js';
import { Figure, FigureImage } from '../../src/models/figure.js';
import { Table } from '../../src/models/table.js';
import { Formula } from '../../src/models/formula.js';
import { ConceptSource } from '../../src/models/concept-source.js';

describe('NonVerbalEntity (base)', () => {
  it('stores a11y fields but NOT id/identifier', () => {
    const e = new NonVerbalEntity({
      caption: { eng: 'Cap' },
      description: { eng: 'Long desc' },
      alt: { eng: 'Alt' },
    });
    assert.deepEqual(e.caption, { eng: 'Cap' });
    assert.deepEqual(e.description, { eng: 'Long desc' });
    assert.deepEqual(e.alt, { eng: 'Alt' });
    assert.equal(e.id, undefined);
    assert.equal(e.identifier, undefined);
  });

  it('sources are lazily wrapped into ConceptSource', () => {
    const e = new NonVerbalEntity({
      sources: [{ type: 'authoritative', origin: { ref: { source: 'ISO' } } }],
    });
    assert.ok(e.sources[0] instanceof ConceptSource);
    assert.strictEqual(e.sources, e.sources);
  });

  it('findById returns null (no identity on base)', () => {
    const e = new NonVerbalEntity({});
    assert.equal(e.findById('anything'), null);
  });

  it('allIds returns empty array', () => {
    const e = new NonVerbalEntity({});
    assert.deepEqual(e.allIds(), []);
  });

  it('toJSON omits null fields', () => {
    const e = new NonVerbalEntity({});
    assert.deepEqual(e.toJSON(), {});
  });

  it('fromData dispatches to registered subclass', () => {
    const f = NonVerbalEntity.fromData({ type: 'figure', id: 'foo' });
    assert.ok(f instanceof Figure);
    assert.equal(f.id, 'foo');
  });

  it('fromData falls back to base for unknown type', () => {
    const e = NonVerbalEntity.fromData({ type: 'unknown' });
    assert.ok(e instanceof NonVerbalEntity);
    assert.ok(!(e instanceof Figure));
  });
});

describe('SharedNonVerbalEntity', () => {
  it('adds id and identifier', () => {
    const e = new SharedNonVerbalEntity({ id: 'foo', identifier: 'Foo 1' });
    assert.equal(e.id, 'foo');
    assert.equal(e.identifier, 'Foo 1');
  });

  it('findById returns self when id matches', () => {
    const e = new SharedNonVerbalEntity({ id: 'foo' });
    assert.equal(e.findById('foo'), e);
  });

  it('findById returns null for non-matching id', () => {
    const e = new SharedNonVerbalEntity({ id: 'foo' });
    assert.equal(e.findById('bar'), null);
  });

  it('allIds returns [id]', () => {
    const e = new SharedNonVerbalEntity({ id: 'foo' });
    assert.deepEqual(e.allIds(), ['foo']);
  });

  it('allIds returns [] when id is null', () => {
    const e = new SharedNonVerbalEntity({});
    assert.deepEqual(e.allIds(), []);
  });
});

describe('Figure', () => {
  it('extends SharedNonVerbalEntity', () => {
    const f = new Figure({ id: 'foo', images: [{ src: 'f.svg', format: 'svg' }] });
    assert.ok(f instanceof SharedNonVerbalEntity);
    assert.ok(f instanceof NonVerbalEntity);
  });

  it('stores images and subfigures lazily', () => {
    const f = new Figure({
      id: 'parent',
      images: [{ src: 'p.svg', format: 'svg' }],
      subfigures: [{ id: 'child', images: [{ src: 'c.svg' }] }],
    });
    assert.ok(f.images[0] instanceof FigureImage);
    assert.ok(f.subfigures[0] instanceof Figure);
    assert.strictEqual(f.images, f.images);
    assert.strictEqual(f.subfigures, f.subfigures);
  });

  it('findById recurses into subfigures', () => {
    const f = new Figure({
      id: 'parent',
      images: [{ src: 'p.svg' }],
      subfigures: [{
        id: 'child',
        images: [{ src: 'c.svg' }],
        subfigures: [{ id: 'grandchild', images: [{ src: 'g.svg' }] }],
      }],
    });
    assert.equal(f.findById('parent').id, 'parent');
    assert.equal(f.findById('child').id, 'child');
    assert.equal(f.findById('grandchild').id, 'grandchild');
    assert.equal(f.findById('missing'), null);
  });

  it('allIds flattens subfigure tree', () => {
    const f = new Figure({
      id: 'parent',
      images: [{ src: 'p.svg' }],
      subfigures: [
        { id: 'a', images: [{ src: 'a.svg' }] },
        { id: 'b', images: [{ src: 'b.svg' }], subfigures: [{ id: 'b1', images: [{ src: 'b1.svg' }] }] },
      ],
    });
    assert.deepEqual(f.allIds(), ['parent', 'a', 'b', 'b1']);
  });

  it('round-trips through toJSON/fromJSON', () => {
    const f = new Figure({
      id: 'foo',
      identifier: 'Foo 1',
      caption: { eng: 'Caption' },
      alt: { eng: 'Alt text' },
      images: [{ src: 'foo.svg', format: 'svg', role: 'vector' }],
      sources: [{ type: 'authoritative', origin: { ref: { source: 'ISO' } } }],
    });
    const json = f.toJSON();
    assert.equal(json.id, 'foo');
    assert.equal(json.identifier, 'Foo 1');
    assert.deepEqual(json.caption, { eng: 'Caption' });
    assert.deepEqual(json.images, [{ src: 'foo.svg', format: 'svg', role: 'vector' }]);

    const restored = Figure.fromJSON(json);
    assert.equal(restored.id, 'foo');
    assert.equal(restored.images[0].src, 'foo.svg');
  });
});

describe('Table', () => {
  it('stores content and format as strings', () => {
    const t = new Table({ id: 't1', content: '<table>...</table>', format: 'html' });
    assert.equal(t.content, '<table>...</table>');
    assert.equal(t.format, 'html');
  });

  it('round-trips', () => {
    const t = new Table({ id: 't1', content: 'x', format: 'markdown' });
    const restored = Table.fromJSON(t.toJSON());
    assert.equal(restored.content, 'x');
    assert.equal(restored.format, 'markdown');
  });
});

describe('Formula', () => {
  it('stores expression and notation as strings', () => {
    const f = new Formula({ id: 'eq1', expression: 'E=mc^2', notation: 'latex' });
    assert.equal(f.expression, 'E=mc^2');
    assert.equal(f.notation, 'latex');
  });

  it('round-trips', () => {
    const f = new Formula({ id: 'eq1', expression: 'x^2', notation: 'mathml' });
    const restored = Formula.fromJSON(f.toJSON());
    assert.equal(restored.expression, 'x^2');
    assert.equal(restored.notation, 'mathml');
  });
});

describe('FigureImage', () => {
  it('stores all variant fields', () => {
    const img = new FigureImage({
      src: 'fig.png', format: 'png', role: 'raster',
      width: 1600, height: 1200, scale: 100,
    });
    assert.equal(img.src, 'fig.png');
    assert.equal(img.format, 'png');
    assert.equal(img.role, 'raster');
    assert.equal(img.width, 1600);
    assert.equal(img.height, 1200);
    assert.equal(img.scale, 100);
  });

  it('omits null fields from toJSON', () => {
    const img = new FigureImage({ src: 'x.svg' });
    assert.deepEqual(img.toJSON(), { src: 'x.svg' });
  });
});
