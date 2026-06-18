/**
 * Registry of dataset assets that can be bundled inside a GCR package.
 *
 * Mirrors the Ruby glossarist gem's GcrPackage::DATASET_ASSETS.
 * Asset types:
 *   - file: a single named file at the GCR root (e.g. bibliography.yaml)
 *   - directory: a named directory with arbitrary nested files (e.g. images/)
 *
 * New asset types can be added by appending to DATASET_ASSETS (open/closed).
 */

const DATASET_ASSETS = Object.freeze([
  { path: 'bibliography.yaml', type: 'file' },
  { path: 'images', type: 'directory' },
  { path: 'figures', type: 'directory' },
  { path: 'tables', type: 'directory' },
  { path: 'formulas', type: 'directory' },
]);

const FILE_ASSETS = Object.freeze(
  DATASET_ASSETS.filter((a) => a.type === 'file'),
);

const DIRECTORY_ASSETS = Object.freeze(
  DATASET_ASSETS.filter((a) => a.type === 'directory'),
);

/**
 * Find a file asset descriptor by its ZIP path.
 * @param {string} path
 * @returns {{ path: string, type: string } | undefined}
 */
function findFileAsset(path) {
  return FILE_ASSETS.find((a) => a.path === path);
}

/**
 * Check whether a ZIP path belongs to a directory asset.
 * Returns the asset descriptor if so, undefined otherwise.
 * @param {string} zipPath
 * @returns {{ path: string, type: string } | undefined}
 */
function findDirectoryAssetPath(zipPath) {
  for (const asset of DIRECTORY_ASSETS) {
    if (zipPath === asset.path || zipPath.startsWith(`${asset.path}/`)) {
      return asset;
    }
  }
  return undefined;
}

/**
 * Check if a ZIP path is a dataset asset entry.
 * @param {string} zipPath
 * @returns {boolean}
 */
function isDatasetAssetPath(zipPath) {
  return findFileAsset(zipPath) !== undefined || findDirectoryAssetPath(zipPath) !== undefined;
}

export {
  DATASET_ASSETS,
  FILE_ASSETS,
  DIRECTORY_ASSETS,
  findFileAsset,
  findDirectoryAssetPath,
  isDatasetAssetPath,
};
