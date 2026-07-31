import { RegistrableModel } from './registrable.js';

export interface NonVerbalReferenceJson {
  entityId?: string | null;
  entity_id?: string | null;
  ref?: string | null;
  id?: string | null;
  display?: string | null;
  type?: string;
}

/**
 * Polymorphic JSON for NonVerbalReference: either a bare string (the
 * entity id) or an object with `{ ref, display?, type? }`.
 */
export type NonVerbalReferenceInput =
  | NonVerbalReferenceJson
  | string
  | NonVerbalReference;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCtor = new (...args: any[]) => any;

export class NonVerbalReference extends RegistrableModel {
  readonly entityId: string | null;
  readonly display: string | null;

  constructor(data: NonVerbalReferenceJson = {}) {
    super();
    this.entityId = data.entityId ?? data.entity_id ?? data.ref ?? data.id ?? null;
    this.display = data.display ?? null;
  }

  get dedupKey(): [string, string | null] {
    return [this.constructor.name, this.entityId];
  }

  override toJSON(): NonVerbalReferenceJson | string {
    if (this.display != null) {
      return { ref: this.entityId ?? '', display: this.display };
    }
    return this.entityId ?? '';
  }

  static override fromJSON<T extends NonVerbalReference>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this: new (...args: any[]) => T,
    data: NonVerbalReferenceInput,
  ): T | NonVerbalReference {
    if (data instanceof NonVerbalReference) return data;
    if (typeof data === 'string') {
      return new (this as new (d: NonVerbalReferenceJson) => T)({ entityId: data });
    }
    const entityId =
      data.entityId ?? data.entity_id ?? data.ref ?? data.id ?? null;
    const display = data.display ?? null;
    const type = data.type;
    const Self = this as unknown as { _registry(): Map<string, AnyCtor> };
    if (type) {
      const Cls = Self._registry().get(type);
      if (Cls) {
        return new (Cls as new (d: NonVerbalReferenceJson) => T)({
          entityId: entityId ?? undefined,
          display: display ?? undefined,
        });
      }
    }
    return new (this as new (d: NonVerbalReferenceJson) => T)({
      entityId: entityId ?? undefined,
      display: display ?? undefined,
    });
  }
}
