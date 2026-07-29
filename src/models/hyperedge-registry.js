// HyperedgeRegistry — single source of truth for hyperedge type dispatch.
//
// Each hyperedge leaf class (PartitiveHyperedge, GenericHyperedge, future
// TemporalHyperedge, AssociativeHyperedge, etc.) registers itself once at
// module load. External systems (parser, serializer, diff, RDF emitter,
// validators) read from this registry instead of branching on instanceof
// or hardcoding per-type tables.
//
// Adding a new hyperedge type:
//   1. Declare the leaf class with the 6-field metadata block
//      (wireKey, typeTag, rdfType, memberClass, v1WireKeys, kindLabel).
//   2. Call HyperedgeRegistry.register(MyClass) at the bottom of the file.
//
// Nothing else in the codebase changes. That is the OCP contract.
//
// Three indexes support three lookup patterns:
//   byWireKey  — parser/serializer/diff-patch dispatch by YAML/JSON key
//   byTypeTag  — per-file loader dispatch by `type: ...` discriminator
//   byRdfType  — RDF emitter dispatch by ontology class IRI
//
// The abstract base (AbstractHyperedge) has no wireKey and is skipped
// by register() — it cannot be instantiated through the registry.

class HyperedgeRegistry {
  static _byWireKey = new Map();
  static _byTypeTag = new Map();
  static _byRdfType = new Map();

  static register(cls) {
    if (!cls || !cls.wireKey || !cls.typeTag || !cls.rdfType) return false;
    if (this._byWireKey.has(cls.wireKey)) {
      throw new Error(
        `HyperedgeRegistry: duplicate wireKey '${cls.wireKey}' ` +
        `(trying to register ${cls.name}; already registered to ` +
        `${this._byWireKey.get(cls.wireKey).name})`,
      );
    }
    if (this._byTypeTag.has(cls.typeTag)) {
      throw new Error(
        `HyperedgeRegistry: duplicate typeTag '${cls.typeTag}' ` +
        `(trying to register ${cls.name})`,
      );
    }
    if (this._byRdfType.has(cls.rdfType)) {
      throw new Error(
        `HyperedgeRegistry: duplicate rdfType '${cls.rdfType}' ` +
        `(trying to register ${cls.name})`,
      );
    }
    this._byWireKey.set(cls.wireKey, cls);
    this._byTypeTag.set(cls.typeTag, cls);
    this._byRdfType.set(cls.rdfType, cls);
    return true;
  }

  // Test-only. Restores the registry to its post-auto-register state
  // by re-running each registered class's re-register hook. Used by
  // the OCP spec to clean up mock types it adds during a test run.
  static unregister(cls) {
    if (!cls) return false;
    const removed =
      this._byWireKey.delete(cls.wireKey) ||
      this._byTypeTag.delete(cls.typeTag) ||
      this._byRdfType.delete(cls.rdfType);
    return removed;
  }

  static forWireKey(key) { return this._byWireKey.get(key) ?? null; }
  static forTypeTag(tag) { return this._byTypeTag.get(tag) ?? null; }
  static forRdfType(type) { return this._byRdfType.get(type) ?? null; }

  static allClasses() {
    // Dedup in case the same class is reachable via multiple indexes.
    const seen = new Set();
    const out = [];
    for (const cls of this._byTypeTag.values()) {
      if (!seen.has(cls)) {
        seen.add(cls);
        out.push(cls);
      }
    }
    return out;
  }

  static allWireKeys()  { return [...this._byWireKey.keys()]; }
  static allTypeTags()  { return [...this._byTypeTag.keys()]; }

  // Snapshot of every registered wire-shape identifier (v2 wireKey plus
  // any v1 legacy keys). Used by the parser to reserve STRUCTURAL_KEYS
  // and to know which top-level YAML keys to walk for hyperedge data.
  static allWireAndLegacyKeys() {
    const out = [];
    for (const cls of this.allClasses()) {
      out.push(cls.wireKey);
      for (const k of cls.v1WireKeys ?? []) out.push(k);
    }
    return out;
  }
}

export { HyperedgeRegistry };
