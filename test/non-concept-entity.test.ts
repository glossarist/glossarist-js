import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonConceptEntity, NonVerbalEntity } from '../src/models/non-verbal-entity.js';
import { SharedNonVerbalEntity } from '../src/models/shared-non-verbal-entity.js';
import { Figure } from '../src/models/figure.js';

describe('P4: NonConceptEntity terminology alignment', () => {
  it('NonConceptEntity is the canonical name', () => {
    const e = new NonConceptEntity({ caption: 'test' });
    assert.equal(e.caption, 'test');
    assert.equal(e.rdfClass(), 'NonConceptEntity');
  });

  it('NonVerbalEntity is a deprecated alias for NonConceptEntity', () => {
    assert.ok(NonVerbalEntity === NonConceptEntity);
    const e = new NonVerbalEntity({ caption: 'via alias' });
    assert.ok(e instanceof NonConceptEntity);
    assert.equal(e.caption, 'via alias');
  });

  it('SharedNonVerbalEntity extends NonConceptEntity', () => {
    const e = new SharedNonVerbalEntity({ id: 'fig1', caption: 'cap' });
    assert.ok(e instanceof NonConceptEntity);
    assert.equal(e.id, 'fig1');
  });

  it('Figure extends SharedNonVerbalEntity which extends NonConceptEntity', () => {
    const f = new Figure({ id: 'f1', caption: 'figure' });
    assert.ok(f instanceof SharedNonVerbalEntity);
    assert.ok(f instanceof NonConceptEntity);
    assert.equal(f.id, 'f1');
  });

  it('findById returns null on base NonConceptEntity', () => {
    const e = new NonConceptEntity({});
    assert.equal(e.findById('anything'), null);
    assert.deepEqual(e.allIds(), []);
  });

  it('findById works on SharedNonVerbalEntity', () => {
    const e = new SharedNonVerbalEntity({ id: 'x1' });
    assert.ok(e.findById('x1') !== null);
    assert.equal(e.findById('other'), null);
    assert.deepEqual(e.allIds(), ['x1']);
  });

  it('toJSON round-trips through fromJSON', () => {
    const original = new NonConceptEntity({ caption: 'cap', description: 'desc', alt: 'alt' });
    const json = original.toJSON();
    const restored = NonConceptEntity.fromJSON(json);
    assert.equal(restored.caption, 'cap');
    assert.equal(restored.description, 'desc');
    assert.equal(restored.alt, 'alt');
  });
});
