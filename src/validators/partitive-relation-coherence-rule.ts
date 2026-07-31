// Deprecated. This rule has been generalized and renamed to
// HyperedgeCoherenceRule (see ./hyperedge-coherence-rule.js). The
// new rule is type-blind — it validates every AbstractHyperedge
// subclass, not just PartitiveHyperedge. This file remains as a
// re-export shim for existing imports.

export { HyperedgeCoherenceRule, PartitiveRelationCoherenceRule } from './hyperedge-coherence-rule.js';
