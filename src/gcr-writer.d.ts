import { Concept } from './models/index';

/** Compiled formats map: format name → id → content string. */
export type CompiledFormatsMap = Record<string, Record<string, string> | Map<string, string>>;

/** Images map: relative path → binary content. */
export type ImagesMap = Record<string, Uint8Array | string | ArrayBuffer> | Map<string, Uint8Array | string | ArrayBuffer>;

export class GcrWriter {
  static createBuffer(options: {
    concepts: Concept[];
    metadata?: Record<string, unknown>;
    register?: Record<string, unknown>;
    uuidFn?: () => string;
    format?: 'canonical' | 'managed' | 'auto';
    compiledFormats?: CompiledFormatsMap;
    bibliography?: string;
    images?: ImagesMap;
  }): Promise<Uint8Array>;
}

export function createGcr(concepts: Concept[], metadata?: Record<string, unknown>): Promise<Uint8Array>;
