export { Register, REGISTER_STATUSES } from './register.js';
export { Section, ORDERING_METHODS } from './section.js';
export { resolveColor, isColorPair, validateColor, COLOR_MODES } from './dataset-color.js';
export {
  RELATION_CATEGORIES,
  categoryOf,
  categoryDefinition,
  uncategorizedTypes,
  duplicatedTypes,
} from './relation-categories.js';
export {
  RELATION_COLOR_DEFAULTS,
  resolveRelationColor,
  categoryColorPair,
} from './relation-colors.js';
export { GlossaristModel } from './base.js';
export { Concept } from './concept.js';
export { LocalizedConcept } from './localized-concept.js';
export { Designation, Expression, Abbreviation, Symbol, LetterSymbol, GraphicalSymbol } from './designation.js';
export { Citation } from './citation.js';
export { ConceptRef } from './concept-ref.js';
export { ConceptSource } from './concept-source.js';
export { RelatedConcept, RELATIONSHIP_TYPES } from './related-concept.js';
export {
  PARTITIVE_ENUMERATION,
  PARTITIVE_ENUMERATION_VALUES,
  isValidPartitiveEnumeration,
} from './partitive-enumeration.js';
export {
  PLURALITY_MARKER,
  PLURALITY_MARKER_VALUES,
  isValidPluralityMarker,
} from './plurality-marker.js';

// PartitiveHyperedge models. The wire format (partitive_relations)
// is unchanged from earlier versions; the v1 wire key (partitive_hyperedges)
// is parsed on input and migrated to v2 shape via hyperedge-migrator.js.
export { PartitiveHyperedge } from './partitive-hyperedge.js';
export { PartitiveMember } from './partitive-member.js';

// v2 GenericHyperedge models (per-file relation storage). Mirrors
// PartitiveHyperedge shape; uses the same MECE member shape.
export { AbstractHyperedge } from './abstract-hyperedge.js';
export { HyperedgeMember } from './hyperedge-member.js';
export { GenericHyperedge } from './generic-hyperedge.js';
export { GenericMember } from './generic-member.js';
export {
  DEFINITION_TYPE,
  DEFAULT_DEFINITION_TYPE,
} from './definition-type.js';

// Per-file relation loader (Node-side runtime; not browser-bundled).
// Walks a relations/ directory and dispatches to PartitiveHyperedge /
// GenericHyperedge by file type.
export { RelationLoader, RelationLoadError, TYPE_TO_CLASS as RELATION_TYPE_TO_CLASS } from './relation-loader.js';

// Directional index over hyperedge sets. Built on demand from a flat
// hyperedge list (typically concept.relations or a dataset union).
export { HyperedgeIndex, buildDatasetIndex } from './hyperedge-index.js';
export {
  PARTITIVE_PRESENCE,
  PARTITIVE_PRESENCE_VALUES,
  DEFAULT_PRESENCE,
  isValidPresence,
} from './partitive-presence.js';
export {
  PARTITIVE_COUNT,
  PARTITIVE_COUNT_VALUES,
  DEFAULT_COUNT,
  isValidCount,
} from './partitive-count.js';
export {
  COMPLETENESS,
  COMPLETENESS_VALUES,
  DEFAULT_COMPLETENESS,
  isValidCompleteness,
} from './completeness.js';
export {
  MULTIPLICITY,
  MULTIPLICITY_VALUES,
  DEFAULT_MULTIPLICITY,
  isValidMultiplicity,
  multiplicityFromPair,
  pairFromMultiplicity,
  resolveMultiplicity,
} from './multiplicity.js';

// v1 → v2 migration helper. Pure function; idempotent.
export {
  migrateHyperedgeToRelation,
  downgradeRelationToHyperedge,
} from '../migration/hyperedge-migrator.js';

export { makeEnum } from './enum.js';
export { resolveHyperedgeColor } from './hyperedge-colors.js';
export { DesignationRelationship, DESIGNATION_RELATIONSHIP_TYPES } from './designation-relationship.js';
export { ConceptReference } from './concept-reference.js';
export { ConceptDate, DATE_TYPES } from './concept-date.js';
export { DetailedDefinition } from './detailed-definition.js';
export { Pronunciation } from './pronunciation.js';
export { GrammarInfo, GRAMMAR_GENDERS, GRAMMAR_NUMBERS, GRAMMAR_PARTS_OF_SPEECH } from './grammar-info.js';
export { Locality } from './locality.js';
export { GcrMetadata } from './gcr-metadata.js';
export { GcrStatistics } from './gcr-statistics.js';
export { RegistrableModel } from './registrable.js';
export { NonVerbalEntity } from './non-verbal-entity.js';
export { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
export { Figure, FigureImage } from './figure.js';
export { Table } from './table.js';
export { Formula } from './formula.js';
export { NonVerbRep, NON_VERBAL_TYPES } from './non-verb-rep.js';
export { NonVerbalReference } from './non-verbal-reference.js';
export { FigureReference, TableReference, FormulaReference } from './non-verbal-references.js';
export { BibliographyEntry } from './bibliography-entry.js';
export { BibliographyData } from './bibliography-data.js';
export { fetchLocalizedString, localizedStringIsEmpty, localizedStringIsPresent } from './localized-string.js';
