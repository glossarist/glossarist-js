import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RegistrableModel } from '../../src/models/registrable.js';

class Animal extends RegistrableModel {
  constructor(data = {}) { super(); this.name = data.name ?? null; }
  toJSON() { const o = {}; if (this.name) o.name = this.name; return o; }
  static fromJSON(d) { return new Animal(d); }
}

class Dog extends Animal {
  constructor(data) { super(data); this.breed = data?.breed ?? null; }
  toJSON() { const o = super.toJSON(); if (this.breed) o.breed = this.breed; return o; }
  static fromJSON(d) { return new Dog(d); }
}

class Cat extends Animal {
  constructor(data) { super(data); this.indoor = data?.indoor ?? true; }
  toJSON() { const o = super.toJSON(); o.indoor = this.indoor; return o; }
  static fromJSON(d) { return new Cat(d); }
}

Animal.register('dog', Dog);
Animal.register('cat', Cat);

describe('RegistrableModel', () => {
  it('fromData dispatches to registered subclass', () => {
    const d = Animal.fromData({ type: 'dog', name: 'Rex', breed: 'lab' });
    assert.ok(d instanceof Dog);
    assert.equal(d.breed, 'lab');
  });

  it('fromData falls back to base for unknown type', () => {
    const a = Animal.fromData({ type: 'unknown', name: 'X' });
    assert.ok(a instanceof Animal);
    assert.ok(!(a instanceof Dog));
  });

  it('fromData returns existing instance unchanged', () => {
    const existing = new Dog({ name: 'Rex' });
    assert.equal(Animal.fromData(existing), existing);
  });

  it('fromData with no type returns base instance', () => {
    const a = Animal.fromData({ name: 'Bob' });
    assert.ok(a instanceof Animal);
    assert.ok(!(a instanceof Dog));
  });

  it('registries are per-class (WeakMap), not shared', () => {
    assert.equal(Animal._registry().get('dog'), Dog);
    assert.equal(Animal._registry().get('cat'), Cat);
    assert.equal(Animal._registry().size, 2);
  });

  it('register is idempotent', () => {
    Animal.register('dog', Dog);
    Animal.register('dog', Dog);
    assert.equal(Animal._registry().get('dog'), Dog);
  });
});
