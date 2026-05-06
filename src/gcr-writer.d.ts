import { Concept } from './models/index';

export class GcrWriter {
  static createBuffer(options: {
    concepts: Concept[];
    metadata?: Record<string, unknown>;
    register?: Record<string, unknown>;
    uuidFn?: () => string;
    format?: 'canonical' | 'managed' | 'auto';
  }): Promise<Uint8Array>;
}

export function createGcr(concepts: Concept[], metadata?: Record<string, unknown>): Promise<Uint8Array>;
