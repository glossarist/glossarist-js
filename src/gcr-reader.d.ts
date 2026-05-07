import { Concept, GcrMetadata } from './models/index';

/**
 * Load a GCR package from a ZIP archive.
 * Accepts Buffer, ArrayBuffer, Uint8Array, Blob, or base64 string.
 */
export function loadGcr(input: Buffer | ArrayBuffer | Uint8Array | Blob | string): Promise<GcrPackage>;

/** A loaded GCR package (ZIP archive of glossarist concept data). */
export class GcrPackage {
  /** Read and parse metadata.yaml as a GcrMetadata instance. */
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

  // Dataset assets (bibliography, images)

  /** List all dataset asset entries found in this package. */
  datasetAssetEntries(): Promise<Array<{ path: string; type: 'file' | 'directory'; asset: { path: string; type: string } }>>;
  /** Read a file-type dataset asset by its registered path. */
  readDatasetFileAsset(assetPath: string): Promise<string | null>;
  /** Read bibliography.yaml from the package as raw YAML string. */
  bibliography(): Promise<string | null>;
  /** Check whether the images/ directory is present and non-empty. */
  hasImages(): Promise<boolean>;
  /** List all image file paths (relative to ZIP root). */
  imageFileNames(): Promise<string[]>;
  /** Read a single image file as Uint8Array. */
  imageFile(path: string): Promise<Uint8Array | null>;
  /** Iterate all image files. */
  eachImageFile(callback: (path: string, content: Uint8Array) => void | Promise<void>): Promise<void>;
  /** Load all image files into a Map (path → Uint8Array). */
  allImageFiles(): Promise<Map<string, Uint8Array>>;
}

/** Parse raw concept YAML (canonical or managed format) into a Concept. */
export function parseConceptYaml(raw: string, context?: string): Concept;

/** Natural sort comparator for concept IDs like "3.1.1.1", "551-12-39". */
export function naturalSort(a: string, b: string): number;
