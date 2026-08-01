import * as yaml from 'js-yaml';
import { DATASET_ASSETS } from '../dataset-asset.js';
import { ValidationResult } from './validation-result.js';
import type { GcrPackage } from '../gcr-reader.js';

interface DatasetAsset { path: string; type: string; }

export class GcrValidator {
  async validate(pkg: GcrPackage): Promise<ValidationResult> {
    const result = new ValidationResult();
    await this._validateMetadata(pkg, result);
    await this._validateConcepts(pkg, result);
    await this._validateAssets(pkg, result);
    return result;
  }

  async _validateMetadata(pkg: GcrPackage, result: ValidationResult): Promise<void> {
    const raw = await pkg.readText('metadata.yaml');
    if (!raw) {
      result.addError('metadata.yaml is missing');
      return;
    }

    let meta: Record<string, unknown> | undefined;
    try {
      meta = yaml.load(raw) as Record<string, unknown>;
    } catch (e) {
      result.addError(`metadata.yaml: invalid YAML: ${(e as Error).message}`);
      return;
    }

    if (!meta!.shortname) result.addError('metadata.yaml missing shortname');
    if (!meta!.version) result.addError('metadata.yaml missing version');
    if (meta!.concept_count == null) result.addError('metadata.yaml missing concept_count');
  }

  async _validateConcepts(pkg: GcrPackage, result: ValidationResult): Promise<void> {
    const ids = await pkg.conceptIds();
    if (ids.length === 0) {
      result.addError('No concept files found in concepts/');
    }
  }

  async _validateAssets(pkg: GcrPackage, result: ValidationResult): Promise<void> {
    for (const asset of DATASET_ASSETS as readonly DatasetAsset[]) {
      if (asset.type === 'file') {
        await this._validateFileAsset(pkg, asset.path, result);
      } else if (asset.type === 'directory') {
        this._validateDirectoryAsset(pkg, asset.path, result);
      }
    }
  }

  async _validateFileAsset(pkg: GcrPackage, path: string, result: ValidationResult): Promise<void> {
    const raw = await pkg.readText(path);
    if (!raw) return;
    try {
      yaml.load(raw);
    } catch (e) {
      const err = e as Error & { mark?: { line?: number } };
      result.addError(`${path}: invalid YAML at line ${err.mark?.line ?? '?'}: ${err.message}`);
    }
  }

  _validateDirectoryAsset(pkg: GcrPackage, dirPath: string, result: ValidationResult): void {
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
