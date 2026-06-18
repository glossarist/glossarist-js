import { GlossaristModel } from './base.js';

const _registries = new WeakMap();

export class RegistrableModel extends GlossaristModel {
  static _registry() {
    let map = _registries.get(this);
    if (!map) {
      map = new Map();
      _registries.set(this, map);
    }
    return map;
  }

  static register(type, cls) {
    this._registry().set(type, cls);
  }

  static fromData(data) {
    if (data instanceof this) return data;
    const type = data?.type;
    const Cls = type ? this._registry().get(type) ?? this : this;
    return new Cls(data);
  }
}
