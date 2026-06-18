import { DATASET_ASSETS } from '../dataset-asset.js';

export class AssetIndex {
  constructor() {
    this._paths = new Set();
  }

  get paths() {
    return [...this._paths].sort();
  }

  get size() {
    return this._paths.size;
  }

  register(path) {
    if (path == null) return;
    this._paths.add(this._normalize(path));
  }

  has(path) {
    if (path == null) return false;
    return this._paths.has(this._normalize(path));
  }

  [Symbol.iterator]() {
    return this._paths[Symbol.iterator]();
  }

  _normalize(path) {
    return String(path).replace(/^\//, '');
  }

  static async fromGcrPackage(pkg) {
    const index = new AssetIndex();
    const names = await pkg.imageFileNames();
    for (const name of names) {
      index.register(name);
    }
    return index;
  }

  static fromDirectory(datasetPath, fs) {
    const index = new AssetIndex();
    const imagesAsset = DATASET_ASSETS.find(
      a => a.type === 'directory' && a.path === 'images');
    if (!imagesAsset) return index;

    const imagesDir = `${datasetPath}/${imagesAsset.path}`;
    _walkDir(fs, imagesDir, imagesAsset.path, index);
    return index;
  }
}

function _walkDir(fs, dirPath, relativePrefix, index) {
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
