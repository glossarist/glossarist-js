import type { Concept } from './gcr-reader';

/** Read all concept YAML files from a directory. */
export function readConcepts(dir: string): Concept[];

/** Read a single concept by ID from a directory. */
export function readConcept(dir: string, id: string): Concept | null;

/** List all concept IDs in a directory, optionally filtered by prefix. */
export function listConceptIds(dir: string, prefix?: string): string[];

/** Read register.yaml from a dataset directory (if present). */
export function readRegister(dir: string): Record<string, unknown> | null;
