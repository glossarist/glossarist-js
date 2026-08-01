import JSZip from 'jszip';
import * as yaml from 'js-yaml';
import { conceptParser } from './concept-parser.js';
import { InvalidInputError } from './errors.js';
import { COMPILED_FORMATS, parseCompiledPath, compiledPath } from './compiled-format.js';
import { DATASET_ASSETS, findFileAsset, findDirectoryAssetPath } from './dataset-asset.js';
import { GcrMetadata } from './models/gcr-metadata.js';
import { naturalSort } from './sort.js';
import { NonVerbalEntity } from './models/non-verbal-entity.js';
import { BibliographyData } from './models/bibliography-data.js';
import { entityDir, entityPath, ENTITY_TYPES, parseEntityPath, type EntityType } from './entity-directory.js';
import type { Concept } from './models/concept.js';
import type { Register } from './models/register.js';

export { naturalSort } from './sort.js';

const BASE64_RE = /^[A-Za-z0-9+/]{100,}={0,2}$/;

type ZipInput = Buffer | ArrayBuffer | Uint8Array | Blob | string;

export async function loadGcr(input: ZipInput): Promise<GcrPackage> {
  if (input == null) {
    throw new InvalidInputError('loadGcr requires a Buffer, ArrayBuffer, Uint8Array, Blob, or base64 string', 'non-null input');
  }
  const opts = typeof input === 'string' && BASE64_RE.test(input) ? { base64: true } : undefined;
  const zip = await JSZip.loadAsync(input, opts);
  return new GcrPackage(zip);
}

export class GcrPackage {
  private _zip: JSZip;

  constructor(zip: JSZip) {
    this._zip = zip;
  }

  async metadata(): Promise<GcrMetadata | null> {
    const raw = await this.readText('metadata.yaml');
    return raw ? GcrMetadata.fromYaml(raw) : null;
  }

  async register(): Promise<Register | null> {
    const raw = await this.readText('register.yaml');
    return raw ? (yaml.load(raw) as Register) : null;
  }

  async conceptIds(): Promise<string[]> {
    const ids: string[] = [];
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!entry.dir && relativePath.startsWith('concepts/') && relativePath.endsWith('.yaml')) {
        ids.push(relativePath.slice('concepts/'.length, -'.yaml'.length));
      }
    });
    return ids.sort(naturalSort);
  }

  async concept(id: string): Promise<Concept | null> {
    const raw = await this._readText(`concepts/${id}.yaml`);
    if (raw === null) return null;
    return conceptParser.parse(raw, id);
  }

  async eachConcept(callback: (concept: Concept, index: number) => void | Promise<void>): Promise<void> {
    const ids = await this.conceptIds();
    for (let i = 0; i < ids.length; i++) {
      const concept = await this.concept(ids[i]!);
      if (concept) await callback(concept, i);
    }
  }

  async allConcepts(): Promise<Concept[]> {
    const ids = await this.conceptIds();
    const concepts: Concept[] = [];
    for (const id of ids) {
      const c = await this.concept(id);
      if (c) concepts.push(c);
    }
    return concepts;
  }

  async compiledFormats(): Promise<string[]> {
    const seen = new Set<string>();
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!entry.dir) {
        const parsed = parseCompiledPath(relativePath);
        if (parsed) seen.add(parsed.format);
      }
    });
    return COMPILED_FORMATS.filter((f) => seen.has(f));
  }

  async compiledFormatIds(format: string): Promise<string[]> {
    const prefix = `compiled/${format}/`;
    const ids: string[] = [];
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!entry.dir && relativePath.startsWith(prefix)) {
        const parsed = parseCompiledPath(relativePath);
        if (parsed && parsed.format === format) ids.push(parsed.id);
      }
    });
    return ids.sort(naturalSort);
  }

  async hasCompiledFormat(format: string): Promise<boolean> {
    const prefix = `compiled/${format}/`;
    let found = false;
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!found && !entry.dir && relativePath.startsWith(prefix)) {
        found = true;
      }
    });
    return found;
  }

  async compiledFile(format: string, id: string): Promise<string | null> {
    return this._readText(compiledPath(format, id));
  }

  async compiledFileBuffer(format: string, id: string): Promise<Uint8Array | null> {
    const entry = this._zip.file(compiledPath(format, id));
    if (!entry) return null;
    return entry.async('uint8array');
  }

  async eachCompiledFile(format: string, callback: (id: string, content: string) => void | Promise<void>): Promise<void> {
    const ids = await this.compiledFormatIds(format);
    for (const id of ids) {
      const content = await this.compiledFile(format, id);
      if (content !== null) await callback(id, content);
    }
  }

  async allCompiledFiles(format: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await this.eachCompiledFile(format, (id, content) => { map.set(id, content); });
    return map;
  }

  async datasetAssetEntries(): Promise<Array<{ path: string; type: 'file' | 'directory'; asset: { path: string; type: string } }>> {
    const entries: Array<{ path: string; type: 'file' | 'directory'; asset: { path: string; type: string } }> = [];
    this._zip.forEach((relativePath: string, zipEntry: JSZip.JSZipObject) => {
      if (zipEntry.dir) return;
      const fileAsset = findFileAsset(relativePath);
      if (fileAsset) {
        entries.push({ path: relativePath, type: 'file', asset: fileAsset });
        return;
      }
      const dirAsset = findDirectoryAssetPath(relativePath);
      if (dirAsset) {
        entries.push({ path: relativePath, type: 'directory', asset: dirAsset });
      }
    });
    return entries;
  }

  async readDatasetFileAsset(assetPath: string): Promise<string | null> {
    return this._readText(assetPath);
  }

  async bibliography(): Promise<BibliographyData | null> {
    const raw = await this._readText('bibliography.yaml');
    if (raw === null) return null;
    return BibliographyData.fromYAML(raw);
  }

  async hasImages(): Promise<boolean> {
    const asset = DATASET_ASSETS.find((a) => a.type === 'directory' && a.path === 'images');
    if (!asset) return false;
    const prefix = `${asset.path}/`;
    let found = false;
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!found && !entry.dir && relativePath.startsWith(prefix)) {
        found = true;
      }
    });
    return found;
  }

  async imageFileNames(): Promise<string[]> {
    const asset = DATASET_ASSETS.find((a) => a.type === 'directory' && a.path === 'images');
    if (!asset) return [];
    const prefix = `${asset.path}/`;
    const names: string[] = [];
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!entry.dir && relativePath.startsWith(prefix)) {
        names.push(relativePath);
      }
    });
    return names.sort();
  }

  async imageFile(path: string): Promise<Uint8Array | null> {
    const asset = DATASET_ASSETS.find((a) => a.type === 'directory' && a.path === 'images');
    if (!asset) return null;
    const fullPath = path.startsWith(`${asset.path}/`) ? path : `${asset.path}/${path}`;
    const entry = this._zip.file(fullPath);
    if (!entry) return null;
    return entry.async('uint8array');
  }

  async eachImageFile(callback: (path: string, content: Uint8Array) => void | Promise<void>): Promise<void> {
    const names = await this.imageFileNames();
    for (const name of names) {
      const entry = this._zip.file(name);
      if (entry) {
        const content = await entry.async('uint8array');
        await callback(name, content);
      }
    }
  }

  async allImageFiles(): Promise<Map<string, Uint8Array>> {
    const map = new Map<string, Uint8Array>();
    await this.eachImageFile((path, content) => { map.set(path, content); });
    return map;
  }

  async readText(filePath: string): Promise<string | null> {
    const entry = this._zip.file(filePath);
    if (!entry) return null;
    return entry.async('text');
  }

  entryPaths(): Array<{ path: string; dir: boolean }> {
    const entries: Array<{ path: string; dir: boolean }> = [];
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      entries.push({ path: relativePath, dir: !!entry.dir });
    });
    return entries;
  }

  hasEntry(filePath: string): boolean {
    return this._zip.file(filePath) != null;
  }

  /** @deprecated Use readText instead */
  async _readText(filePath: string): Promise<string | null> {
    return this.readText(filePath);
  }

  async entityIds(type: EntityType): Promise<string[]> {
    const prefix = `${entityDir(type)}/`;
    const ids: string[] = [];
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!entry.dir && relativePath.startsWith(prefix) && relativePath.endsWith('.yaml')) {
        ids.push(relativePath.slice(prefix.length, -'.yaml'.length));
      }
    });
    return ids.sort(naturalSort);
  }

  async entity(type: EntityType, id: string): Promise<NonVerbalEntity | null> {
    const raw = await this.readText(entityPath(type, id));
    if (raw === null) return null;
    const yamlData = yaml.load(raw) as Record<string, unknown>;
    return NonVerbalEntity.fromData({ ...yamlData, type });
  }

  async eachEntity(type: EntityType, callback: (entity: NonVerbalEntity, id: string) => void | Promise<void>): Promise<void> {
    for (const id of await this.entityIds(type)) {
      const entity = await this.entity(type, id);
      if (entity) await callback(entity, id);
    }
  }

  async allEntities(type: EntityType): Promise<NonVerbalEntity[]> {
    const entities: NonVerbalEntity[] = [];
    await this.eachEntity(type, (e) => { entities.push(e); });
    return entities;
  }

  async entityTypes(): Promise<EntityType[]> {
    const seen = new Set<EntityType>();
    this._zip.forEach((relativePath: string, entry: JSZip.JSZipObject) => {
      if (!entry.dir) {
        const parsed = parseEntityPath(relativePath);
        if (parsed) seen.add(parsed.type);
      }
    });
    return ENTITY_TYPES.filter((t) => seen.has(t));
  }
}

export function parseConceptYaml(raw: unknown, context?: string): Concept {
  return conceptParser.parse(raw, context);
}
