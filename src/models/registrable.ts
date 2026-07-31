import { GlossaristModel } from './base.js';

/**
 * Per-class registry of named subtypes. The registry is keyed by
 * `type` discriminator and maps to the constructor function. Used by
 * NonVerbalEntity (Figure/Table/Formula), NonVerbalReference
 * (Figure/Table/Formula references), and any future RegistrableModel
 * subclass that needs polymorphic dispatch on a string discriminator.
 *
 * Stored as a WeakMap keyed by the base class function, so each base
 * gets its own namespace (NonVerbalEntity.register does not collide
 * with NonVerbalReference.register).
 *
 * The registry stores constructors as `Function` because TS's strict
 * variance on constructor params makes a typed constraint reject
 * subclasses with narrower param types. The dispatch site casts the
 * result back to the specific subclass.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see docstring.
type AnyCtor = new (...args: any[]) => any;

const _registries = new WeakMap<object, Map<string, AnyCtor>>();

export class RegistrableModel extends GlossaristModel {
  static _registry(): Map<string, AnyCtor> {
    const existing = _registries.get(this) ?? new Map();
    if (!_registries.has(this)) _registries.set(this, existing);
    return existing;
  }

  static register(type: string, cls: AnyCtor): void {
    this._registry().set(type, cls);
  }

  static fromData<T extends RegistrableModel>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any ctor signature accepted.
    this: new (...args: any[]) => T,
    data: unknown,
  ): T {
    if (data instanceof this) return data;
    const type = (data as { type?: string } | null)?.type;
    const Self = this as unknown as { _registry(): Map<string, AnyCtor> };
    const registry = Self._registry();
    const Cls = type ? (registry.get(type) ?? (this as AnyCtor)) : (this as AnyCtor);
    return new (Cls as new (data: unknown) => T)(data);
  }
}
