import { Concept } from './models/index';

/** Compiled formats map: format name → id → content string. */
export type CompiledFormatsMap = Record<string, Record<string, string> | Map<string, string>>;

export class GcrWriter {
  static createBuffer(options: {
    concepts: Concept[];
    metadata?: Record<string, unknown>;
    register?: Record<string, unknown>;
    uuidFn?: () => string;
    format?: 'canonical' | 'managed' | 'auto';
    compiledFormats?: CompiledFormatsMap;
  }): Promise<Uint8Array>;
}

export function createGcr(concepts: Concept[], metadata?: Record<string, unknown>): Promise<Uint8Array>;
