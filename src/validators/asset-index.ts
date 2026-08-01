import { DATASET_ASSETS } from '../dataset-asset.js';
import type { GcrPackage } from '../gcr-reader.js';

interface DatasetAsset { path: string; type: string; }
type FsLike = {
  existsSync(path: string): boolean;
  readdirSync(path: string, opts: { withFileTypes: true }): Array<{ name: string; isDirectory(): boolean }>;
};

export class AssetIndex {
  private _paths: Set<string> = new Set();

  get paths(): string[] {
    return [...this._paths].sort();
  }

  get size(): number {
    return this._paths.size;
  }

  register(path: string | null | undefined): void {
    if (path == null) return;
    this._paths.add(this._normalize(path));
  }

  has(path: string | null | undefined): boolean {
    if (path == null) return false;
    return this._paths.has(this._normalize(path));
  }

  [Symbol.iterator](): Iterator<string> {
    return this._paths[Symbol.iterator]();
  }

  _normalize(path: string): string {
    return String(path).replace(/^\//, '');
  }

  static async fromGcrPackage(pkg: GcrPackage): Promise<AssetIndex> {
    const index = new AssetIndex();
    const names = await pkg.imageFileNames();
    for (const name of names) {
      index.register(name);
    }
    return index;
  }

  static fromDirectory(datasetPath: string, fs: FsLike): AssetIndex {
    const index = new AssetIndex();
    const imagesAsset = (DATASET_ASSETS as readonly DatasetAsset[]).find(
      a => a.type === 'directory' && a.path === 'images');
    if (!imagesAsset) return index;

    const imagesDir = `${datasetPath}/${imagesAsset.path}`;
    _walkDir(fs, imagesDir, imagesAsset.path, index);
    return index;
  }
}

function _walkDir(fs: FsLike, dirPath: string, relativePrefix: string, index: AssetIndex): void {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = `${dirPath}/${entry.name}`;
    const relPath = `${relativePrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      _walkDir(fs, fullPath, relPath, index);
    } else {
      index.register(relPath);
    }
  }
}
