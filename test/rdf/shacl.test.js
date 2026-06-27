import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/index.js';
import { Designation } from '../../src/models/designation.js';
import { DetailedDefinition } from '../../src/models/detailed-definition.js';
import {
  conceptToQuads,
  collectQuads,
  quadsToDataset,
  validateShacl,
  loadShapes,
} from '../../src/rdf/index.js';

function buildConcept() {
  return new Concept({
    id: '3.1.1',
    status: 'valid',
    localizations: {
      eng: {
        language_code: 'eng',
        terms: [new Designation({ type: 'expression', designation: 'atomic data unit', normative_status: 'preferred' })],
        definition: [new DetailedDefinition({ content: 'A data unit that cannot be subdivided.' })],
        sources: [],
        entry_status: 'valid',
        domain: 'data',
      },
    },
  });
}

describe('validateShacl', () => {
  it('loads the vendored canonical shapes', async () => {
    const shapes = await loadShapes();
    assert.ok(shapes.size > 0, 'shapes dataset should be non-empty');
  });

  it('returns a report with a `conforms` boolean for any dataset', async () => {
    const ds = quadsToDataset(collectQuads(conceptToQuads(buildConcept(), {
      registerId: 'iso', uriBase: 'https://glossarist.org',
    })));
    const report = await validateShacl(ds);
    assert.equal(typeof report.conforms, 'boolean');
    assert.ok(Array.isArray(report.results));
  });

  it('accepts an empty dataset without error', async () => {
    const empty = quadsToDataset([]);
    const report = await validateShacl(empty);
    assert.equal(typeof report.conforms, 'boolean');
  });

  it('accepts a custom shapes dataset via options.shapes', async () => {
    // Use the same shapes but pass explicitly — exercises the override path.
    const shapes = await loadShapes();
    const ds = quadsToDataset(collectQuads(conceptToQuads(buildConcept(), {
      registerId: 'iso', uriBase: 'https://glossarist.org',
    })));
    const report = await validateShacl(ds, { shapes });
    assert.equal(typeof report.conforms, 'boolean');
  });
});
