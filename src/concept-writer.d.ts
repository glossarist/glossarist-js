import { Concept } from './models/index';

export function writeConcept(dir: string, concept: Concept, format?: 'canonical' | 'managed' | 'auto'): void;
export function writeConcepts(dir: string, concepts: Concept[], options?: {
  register?: Record<string, unknown>;
  format?: 'canonical' | 'managed' | 'auto';
}): void;
