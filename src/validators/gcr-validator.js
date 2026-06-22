import * as yaml from 'js-yaml';
import { DATASET_ASSETS } from '../dataset-asset.js';
import { ValidationResult } from './validation-result.js';

export class GcrValidator {
  async validate(pkg) {
    const result = new ValidationResult();
    await this._validateMetadata(pkg, result);
    await this._validateConcepts(pkg, result);
    await this._validateAssets(pkg, result);
    return result;
  }

  async _validateMetadata(pkg, result) {
    const raw = await pkg.readText('metadata.yaml');
    if (!raw) {
      result.addError('metadata.yaml is missing');
      return;
    }

    let meta;
    try {
      meta = yaml.load(raw);
    } catch (e) {
      result.addError(`metadata.yaml: invalid YAML: ${e.message}`);
      return;
    }

    if (!meta.shortname) result.addError('metadata.yaml missing shortname');
    if (!meta.version) result.addError('metadata.yaml missing version');
    if (meta.concept_count == null) result.addError('metadata.yaml missing concept_count');
  }

  async _validateConcepts(pkg, result) {
    const ids = await pkg.conceptIds();
    if (ids.length === 0) {
      result.addError('No concept files found in concepts/');
    }
  }

  async _validateAssets(pkg, result) {
    for (const asset of DATASET_ASSETS) {
      if (asset.type === 'file') {
        await this._validateFileAsset(pkg, asset.path, result);
      } else if (asset.type === 'directory') {
        await this._validateDirectoryAsset(pkg, asset.path, result);
      }
    }
  }

  async _validateFileAsset(pkg, path, result) {
    const raw = await pkg.readText(path);
    if (!raw) return;
    try {
      yaml.load(raw);
    } catch (e) {
      result.addError(`${path}: invalid YAML at line ${e.mark?.line ?? '?'}: ${e.message}`);
    }
  }

  _validateDirectoryAsset(pkg, dirPath, result) {
    let hasFiles = false;
    let hasEntries = false;
    for (const entry of pkg.entryPaths()) {
      if (entry.path.startsWith(`${dirPath}/`)) {
        hasEntries = true;
        if (!entry.dir) hasFiles = true;
      }
    }
    if (hasEntries && !hasFiles) {
      result.addWarning(`${dirPath}/ directory exists but is empty`);
    }
  }
}
