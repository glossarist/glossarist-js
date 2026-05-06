/** A single term designation. */
export interface Term {
  type: string;
  designation: string;
  normative_status?: string;
}

/** A definition content block. */
export interface Definition {
  content: string;
}

/** A bibliographic source reference. */
export interface Source {
  type: string;
  origin?: { ref: string };
}

/** Localized concept data for a single language. */
export interface Localization {
  terms: Term[];
  definition?: Definition[];
  notes?: { content: string }[];
  examples?: { content: string }[];
  sources?: Source[];
  entry_status?: string;
  normative_status?: string;
}

/** A normalized glossarist concept. */
export interface Concept {
  termid: string;
  term: string | null;
  localizations: Record<string, Localization>;
  raw: Record<string, unknown>;
}

/** GCR package metadata from metadata.yaml. */
export interface GcrMetadata {
  shortname: string;
  version?: string;
  title?: string;
  concept_count?: number;
  languages?: string[];
  schema_version?: string;
  glossarist_version?: string;
  created_at?: string;
  statistics?: Record<string, unknown>;
}

/**
 * Load a GCR package from a ZIP archive.
 * Accepts Buffer, ArrayBuffer, Uint8Array, Blob, or base64 string.
 */
export function loadGcr(input: Buffer | ArrayBuffer | Uint8Array | Blob | string): Promise<GcrPackage>;

/** A loaded GCR package (ZIP archive of glossarist concept data). */
export class GcrPackage {
  /** Read and parse metadata.yaml. */
  metadata(): Promise<GcrMetadata | null>;
  /** Read and parse optional register.yaml. */
  register(): Promise<Record<string, unknown> | null>;
  /** List all concept IDs, naturally sorted. */
  conceptIds(): Promise<string[]>;
  /** Read and normalize a single concept by ID. */
  concept(id: string): Promise<Concept | null>;
  /** Iterate all concepts via callback. */
  eachConcept(callback: (concept: Concept, index: number) => void | Promise<void>): Promise<void>;
  /** Load all concepts into an array. */
  allConcepts(): Promise<Concept[]>;

  // Compiled / machine formats (TBX, JSON-LD, Turtle, JSONL)

  /** List compiled format directories present in this package. */
  compiledFormats(): Promise<string[]>;
  /** List entry IDs for a given compiled format. */
  compiledFormatIds(format: string): Promise<string[]>;
  /** Check whether a compiled format is present. */
  hasCompiledFormat(format: string): Promise<boolean>;
  /** Read a single compiled-format file as a string. */
  compiledFile(format: string, id: string): Promise<string | null>;
  /** Read a single compiled-format file as a Uint8Array. */
  compiledFileBuffer(format: string, id: string): Promise<Uint8Array | null>;
  /** Iterate all entries for a compiled format. */
  eachCompiledFile(format: string, callback: (id: string, content: string) => void | Promise<void>): Promise<void>;
  /** Load all entries for a compiled format into a Map. */
  allCompiledFiles(format: string): Promise<Map<string, string>>;
}

/** Parse raw concept YAML (canonical or managed format) into a normalized Concept. */
export function parseConceptYaml(raw: string, context?: string): Concept;

/** Natural sort comparator for concept IDs like "3.1.1.1", "551-12-39". */
export function naturalSort(a: string, b: string): number;
