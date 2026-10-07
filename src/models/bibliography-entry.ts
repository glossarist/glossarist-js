import type { RelatonItem } from 'relaton';
import { GlossaristModel } from './base.js';

export interface BibliographyEntryJson {
  id?: string | null;
  reference?: string | null;
  title?: string | null;
  link?: string | null;
  type?: string | null;
}

export class BibliographyEntry extends GlossaristModel {
  readonly id: string | null;
  readonly reference: string | null;
  readonly title: string | null;
  readonly link: string | null;
  readonly type: string | null;

  constructor(data: BibliographyEntryJson = {}) {
    super();
    this.id = data.id ?? null;
    this.reference = data.reference ?? null;
    this.title = data.title ?? null;
    this.link = data.link ?? null;
    this.type = data.type ?? null;
  }

  override toJSON(): BibliographyEntryJson {
    const obj: BibliographyEntryJson = {};
    if (this.id != null) obj.id = this.id;
    if (this.reference != null) obj.reference = this.reference;
    if (this.title != null) obj.title = this.title;
    if (this.link != null) obj.link = this.link;
    if (this.type != null) obj.type = this.type;
    return obj;
  }

  static override fromJSON(data: BibliographyEntryJson): BibliographyEntry {
    return new BibliographyEntry(data);
  }

  static fromRelatonItem(item: RelatonItem): BibliographyEntry {
    const docids = item.docidentifier ?? [];
    const primary = docids.find((d) => d.primary) ?? docids[0];
    const id = primary?.content ?? item.id ?? null;
    const titles = item.title ?? [];
    const mainTitle = titles.find((t) => t.type === 'main') ?? titles[0];
    const link = item.source?.find((s) => s.type === 'src')?.content ??
      item.source?.[0]?.content ?? null;
    return new BibliographyEntry({
      id,
      reference: id,
      title: mainTitle?.content ?? null,
      link,
      type: item.type ?? null,
    });
  }
}
