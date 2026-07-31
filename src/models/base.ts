/**
 * GlossaristModel — abstract base for every domain model.
 *
 * Subclasses implement `toJSON()` (wire shape) and `identity()`
 * (stable string key for diff/dedupe). `equals()` and `clone()`
 * default to comparing via JSON serialization; subclasses may
 * override for performance.
 */

export abstract class GlossaristModel {
  /** Wire-shape serialization. Subclasses MUST override. */
  toJSON(): object {
    throw new Error(`${this.constructor.name} must implement toJSON()`);
  }

  /** Stable identity string for diff, dedupe, registry keys. */
  identity(): string {
    throw new Error(`${this.constructor.name} must implement identity()`);
  }

  /** Default: structural equality via JSON. Override for semantic equality. */
  equals(other: this): boolean {
    if (!(other instanceof this.constructor)) return false;
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }

  /** Deep clone via JSON round-trip. Subclasses with non-JSON-safe
   *  fields must override. */
  clone(): this {
    const Ctor = this.constructor as new (data: unknown) => this;
    return new Ctor(JSON.parse(JSON.stringify(this.toJSON())));
  }

  /**
   * Subclasses MUST override. Declared on the abstract base so callers
   * who only have `typeof GlossaristModel` get a typed call site
   * (rather than the static disappearing under `abstract`).
   */
  static fromJSON(_data: unknown): GlossaristModel {
    throw new Error(`${this.name} must implement fromJSON()`);
  }

  /**
   * Lazily wrap a raw array (plain hashes) into model instances.
   * Used by Concept's lazy `figures`/`tables`/`formulas` getters so
   * the wrap cost is only paid on first access.
   *
   * `cacheKey` and `rawKey` are private field names on `this`. The
   * bracket access here is the only legitimate reflective pattern in
   * the codebase (lazy field init). It is bracket-typed through a
   * local alias rather than the public surface.
   *
   * Underscore-prefixed (not `protected`) so JS subclasses during the
   * TS migration transition can call it without TS4094 on anonymous
   * class expressions. Once all subclasses are .ts this can move to
   * `protected`.
   */
  _lazy<TItem>(
    cacheKey: string,
    rawKey: string,
    wrapFn: (raw: unknown) => TItem,
  ): TItem[] {
    const cache = this as unknown as Record<string, TItem[] | null | undefined>;
    const raw = this as unknown as Record<string, unknown[] | undefined>;
    if (cache[cacheKey] === null || cache[cacheKey] === undefined) {
      const rawArr = raw[rawKey] ?? [];
      cache[cacheKey] = rawArr.map((r) => wrapFn(r));
    }
    return cache[cacheKey] ?? [];
  }

  /**
   * Helper for `toJSON()`: serialize a lazy-or-raw array under
   * `jsonKey` only when it has items. Model instances go through
   * `toJSON()`; primitives pass through.
   */
  _serialize(
    obj: Record<string, unknown>,
    jsonKey: string,
    cacheKey: string,
    rawKey: string,
  ): void {
    const self = this as unknown as Record<string, unknown[] | null | undefined>;
    const cached = self[cacheKey];
    const raw = self[rawKey];
    const items = cached ?? (Array.isArray(raw) && raw.length > 0 ? raw : []);
    if (items.length > 0) {
      obj[jsonKey] = items.map((i) =>
        i instanceof GlossaristModel ? i.toJSON() : i,
      );
    }
  }
}
