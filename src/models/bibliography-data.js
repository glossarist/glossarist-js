import yaml from 'js-yaml';
import { GlossaristModel } from './base.js';
import { BibliographyEntry } from './bibliography-entry.js';

export class BibliographyData extends GlossaristModel {
  constructor(data = {}) {
    super();
    const entriesData = data.bibliography ?? data.entries ?? [];
    this._rawEntries = Array.isArray(entriesData) ? entriesData : [];
    this._entries = null;
  }

  get entries() {
    return this._lazy('_entries', '_rawEntries',
      e => e instanceof BibliographyEntry ? e : new BibliographyEntry(e));
  }

  find(id) {
    return this.entries.find(e => e.id === id) ?? null;
  }

  get keys() {
    return this.entries.map(e => e.id);
  }

  toJSON() {
    if (this.entries.length === 0) return { bibliography: [] };
    return { bibliography: this.entries.map(e => e.toJSON()) };
  }

  toYAML() {
    return yaml.dump(this.toJSON());
  }

  static fromYAML(yamlString) {
    const parsed = yaml.load(yamlString);
    return new BibliographyData(parsed ?? {});
  }

  static fromJSON(data) {
    return new BibliographyData(data);
  }
}
