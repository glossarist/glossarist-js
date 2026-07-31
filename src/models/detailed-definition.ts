import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';
import { canonicalJson } from '../diff/canonical-json.js';

export interface DetailedDefinitionJson {
  content?: string;
  sources?: ReadonlyArray<unknown>;
  examples?: ReadonlyArray<unknown>;
}

export interface WalkTextEntry {
  text: string;
  source: string;
}

export class DetailedDefinition extends GlossaristModel {
  readonly content: string;
  private readonly _rawSources: ReadonlyArray<unknown>;
  private readonly _rawExamples: ReadonlyArray<unknown>;
  private _sources: ReadonlyArray<Citation> | null = null;
  private _examples: ReadonlyArray<DetailedDefinition> | null = null;

  constructor(data: DetailedDefinitionJson = {}) {
    super();
    this.content = data.content ?? '';
    this._rawSources = data.sources ?? [];
    this._rawExamples = data.examples ?? [];
  }

  get sources(): ReadonlyArray<Citation> {
    return this._lazy<Citation>(
      '_sources',
      '_rawSources',
      (s) => (s instanceof Citation ? s : new Citation(s as never)),
    );
  }

  get examples(): ReadonlyArray<DetailedDefinition> {
    return this._lazy<DetailedDefinition>(
      '_examples',
      '_rawExamples',
      (e) =>
        e instanceof DetailedDefinition
          ? e
          : new DetailedDefinition(e as DetailedDefinitionJson),
    );
  }

  override toJSON(): DetailedDefinitionJson {
    const obj: DetailedDefinitionJson = { content: this.content };
    this._serialize(obj as Record<string, unknown>, 'sources', '_sources', '_rawSources');
    this._serialize(obj as Record<string, unknown>, 'examples', '_examples', '_rawExamples');
    return obj;
  }

  /**
   * Yield this definition's content and the content of every nested
   * example (recursively). Each item carries `{ text, source }` where
   * `source` is `<path>.content` rooted at the `path` argument.
   */
  *walkTexts(path: string): Generator<WalkTextEntry> {
    if (typeof this.content === 'string' && this.content.length > 0) {
      yield { text: this.content, source: `${path}.content` };
    }
    const examples = this.examples;
    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      if (example) {
        yield* example.walkTexts(`${path}.examples[${i}]`);
      }
    }
  }

  static identityOf(
    value: { toJSON?: () => unknown } | unknown | null,
  ): string {
    if (value == null) return '';
    if (typeof value === 'object' && value !== null && 'toJSON' in value &&
        typeof (value as { toJSON: unknown }).toJSON === 'function') {
      return canonicalJson((value as { toJSON: () => unknown }).toJSON());
    }
    return canonicalJson(value);
  }

  override identity(): string {
    return DetailedDefinition.identityOf(this);
  }

  static override fromJSON(data: DetailedDefinitionJson): DetailedDefinition {
    return new DetailedDefinition(data);
  }
}
