import * as yaml from 'js-yaml';
import { GlossaristModel } from './base.js';
import { BibliographyEntry } from './bibliography-entry.js';
import type { BibliographyEntryJson } from './bibliography-entry.js';

export interface BibliographyDataJson {
  bibliography?: ReadonlyArray<BibliographyEntryJson | BibliographyEntry>;
  entries?: ReadonlyArray<BibliographyEntryJson | BibliographyEntry>;
}

export class BibliographyData extends GlossaristModel {
  private readonly _rawEntries: ReadonlyArray<BibliographyEntryJson | BibliographyEntry>;
  private _entries: ReadonlyArray<BibliographyEntry> | null = null;

  constructor(data: BibliographyDataJson | ReadonlyArray<BibliographyEntryJson | BibliographyEntry> = {}) {
    super();
    let entriesData: ReadonlyArray<BibliographyEntryJson | BibliographyEntry> | undefined;
    if (Array.isArray(data)) {
      entriesData = data;
    } else {
      entriesData = (data as BibliographyDataJson)?.bibliography ?? (data as BibliographyDataJson)?.entries ?? [];
    }
    this._rawEntries = Array.isArray(entriesData) ? entriesData : [];
  }

  get entries(): ReadonlyArray<BibliographyEntry> {
    return this._lazy<BibliographyEntry>(
      '_entries',
      '_rawEntries',
      (e) => (e instanceof BibliographyEntry ? e : new BibliographyEntry(e as BibliographyEntryJson)),
    );
  }

  find(id: string): BibliographyEntry | null {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  get keys(): ReadonlyArray<string | null> {
    return this.entries.map((e) => e.id);
  }

  override toJSON(): BibliographyDataJson {
    if (this.entries.length === 0) return { bibliography: [] };
    return { bibliography: this.entries.map((e) => e.toJSON()) };
  }

  toYAML(): string {
    return yaml.dump(this.toJSON());
  }

  static fromYAML(yamlString: string): BibliographyData {
    const parsed = yaml.load(yamlString) as
      | BibliographyDataJson
      | ReadonlyArray<BibliographyEntryJson>
      | undefined;
    return new BibliographyData(parsed ?? {});
  }

  static override fromJSON(
    data: BibliographyDataJson | ReadonlyArray<BibliographyEntryJson>,
  ): BibliographyData {
    return new BibliographyData(data);
  }
}
