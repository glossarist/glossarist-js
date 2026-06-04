import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Register, Section, REGISTER_STATUSES, ORDERING_METHODS } from '../../src/models/index.js';

describe('Section', () => {
  it('constructs with id and localized names', () => {
    const s = new Section({ id: '5', names: { eng: 'Measurements', fra: 'Mesurages' } });
    assert.equal(s.id, '5');
    assert.equal(s.name('eng'), 'Measurements');
    assert.equal(s.name('fra'), 'Mesurages');
    assert.equal(s.name('deu'), 'Measurements');
  });

  it('falls back to eng for unknown language', () => {
    const s = new Section({ id: '1', names: { eng: 'General' } });
    assert.equal(s.name('deu'), 'General');
  });

  it('supports per-section ordering override', () => {
    const s = new Section({ id: '3', names: { eng: 'General' }, ordering: 'mixed' });
    assert.equal(s.ordering, 'mixed');
  });

  it('round-trips via toJSON/fromJSON', () => {
    const s = new Section({ id: '5', names: { eng: 'Measurements', fra: 'Mesurages' }, ordering: 'systematic' });
    const json = s.toJSON();
    const s2 = Section.fromJSON(json);
    assert.equal(s2.id, '5');
    assert.equal(s2.name('eng'), 'Measurements');
    assert.equal(s2.ordering, 'systematic');
  });

  it('omits ordering from JSON when null', () => {
    const s = new Section({ id: '1', names: { eng: 'General' } });
    const json = s.toJSON();
    assert.equal(json.ordering, undefined);
  });

  it('supports hierarchical children', () => {
    const s = new Section({
      id: '102',
      names: { eng: 'Mathematics' },
      children: [
        { id: '102-01', names: { eng: 'Sets and operations' } },
        { id: '102-02', names: { eng: 'Numbers' } },
      ],
    });
    assert.equal(s.children.length, 2);
    assert.ok(s.children[0] instanceof Section);
    assert.equal(s.children[0].id, '102-01');
    assert.equal(s.children[0].name('eng'), 'Sets and operations');
  });

  it('descendantById finds nested sections', () => {
    const s = new Section({
      id: '102',
      names: { eng: 'Mathematics' },
      children: [
        { id: '102-01', names: { eng: 'Sets and operations' } },
      ],
    });
    assert.equal(s.descendantById('102-01').name('eng'), 'Sets and operations');
    assert.equal(s.descendantById('999'), null);
  });

  it('round-trips hierarchical sections via toJSON/fromJSON', () => {
    const s = new Section({
      id: '102',
      names: { eng: 'Mathematics' },
      children: [
        { id: '102-01', names: { eng: 'Sets and operations' } },
        { id: '102-02', names: { eng: 'Numbers' } },
      ],
    });
    const json = s.toJSON();
    assert.equal(json.children.length, 2);
    assert.equal(json.children[0].id, '102-01');
    const s2 = Section.fromJSON(json);
    assert.equal(s2.children.length, 2);
    assert.equal(s2.children[0].name('eng'), 'Sets and operations');
  });
});

describe('Register', () => {
  it('constructs with identity fields', () => {
    const r = new Register({
      schema_version: '3',
      id: 'vim-2012',
      ref: 'OIML V 2-200:2012',
      year: 2012,
      urn: 'urn:oiml:pub:v:2:2012',
      status: 'current',
      languages: ['eng', 'fra'],
      ordering: 'systematic',
    });
    assert.equal(r.schemaVersion, '3');
    assert.equal(r.id, 'vim-2012');
    assert.equal(r.ref, 'OIML V 2-200:2012');
    assert.equal(r.year, 2012);
    assert.equal(r.urn, 'urn:oiml:pub:v:2:2012');
    assert.equal(r.status, 'current');
    assert.deepEqual(r.languages, ['eng', 'fra']);
    assert.equal(r.ordering, 'systematic');
  });

  it('constructs with sections', () => {
    const r = new Register({
      id: 'viml-2022',
      sections: [
        { id: '0', names: { eng: 'Basic terms', fra: 'Termes fondamentaux' } },
        { id: '1', names: { eng: 'Metrology and its legal aspects' } },
      ],
    });
    assert.equal(r.sections.length, 2);
    assert.ok(r.sections[0] instanceof Section);
    assert.equal(r.sections[0].name('eng'), 'Basic terms');
  });

  it('sectionById finds a section', () => {
    const r = new Register({
      sections: [
        { id: '5', names: { eng: 'Measurement standards' } },
      ],
    });
    assert.equal(r.sectionById('5').name('eng'), 'Measurement standards');
    assert.equal(r.sectionById('9'), null);
  });

  it('sectionById finds nested sections recursively', () => {
    const r = new Register({
      sections: [
        {
          id: '102',
          names: { eng: 'Mathematics' },
          children: [
            { id: '102-01', names: { eng: 'Sets and operations' } },
            { id: '102-02', names: { eng: 'Numbers' } },
          ],
        },
      ],
    });
    assert.equal(r.sectionById('102').name('eng'), 'Mathematics');
    assert.equal(r.sectionById('102-01').name('eng'), 'Sets and operations');
    assert.equal(r.sectionById('102-02').name('eng'), 'Numbers');
    assert.equal(r.sectionById('999'), null);
  });

  it('sectionName is a convenience method', () => {
    const r = new Register({
      sections: [
        { id: '5', names: { eng: 'Measurement standards', fra: 'Étalons' } },
      ],
    });
    assert.equal(r.sectionName('5', 'eng'), 'Measurement standards');
    assert.equal(r.sectionName('5', 'fra'), 'Étalons');
    assert.equal(r.sectionName('9', 'eng'), null);
  });

  it('round-trips via toJSON/fromJSON', () => {
    const r = new Register({
      schema_version: '3',
      id: 'viml-2022',
      ref: 'OIML V 1:2022',
      urn: 'urn:oiml:pub:v:1:2022',
      urnAliases: ['urn:oiml:pub:v:1:2022*'],
      status: 'current',
      supersedes: 'viml-2013',
      languages: ['eng', 'fra'],
      ordering: 'systematic',
      sections: [
        { id: '0', names: { eng: 'Basic terms', fra: 'Termes fondamentaux' } },
      ],
    });
    const json = r.toJSON();
    const r2 = Register.fromJSON(json);
    assert.equal(r2.id, 'viml-2022');
    assert.equal(r2.urn, 'urn:oiml:pub:v:1:2022');
    assert.equal(r2.sections.length, 1);
    assert.equal(r2.sections[0].name('fra'), 'Termes fondamentaux');
  });

  it('preserves unknown fields via proxy', () => {
    const r = Register.fromJSON({
      schema_version: '3',
      shortname: 'test-dataset',
      version: '1.0.0',
      custom_field: 'hello',
    });
    assert.equal(r.schemaVersion, '3');
    assert.equal(r.shortname, 'test-dataset');
    assert.equal(r.version, '1.0.0');
    assert.equal(r.custom_field, 'hello');
  });

  it('unknown fields survive round-trip', () => {
    const r = Register.fromJSON({
      schema_version: '3',
      shortname: 'test',
      concept_count: 42,
    });
    const json = r.toJSON();
    assert.equal(json.shortname, 'test');
    assert.equal(json.concept_count, 42);
  });

  it('snake_case properties resolve via proxy', () => {
    const r = Register.fromJSON({
      schema_version: '3',
      source_repo: 'https://example.com',
    });
    assert.equal(r.schema_version, '3');
    assert.equal(r.source_repo, 'https://example.com');
  });
});

describe('Constants', () => {
  it('REGISTER_STATUSES contains expected values', () => {
    assert.ok(REGISTER_STATUSES.includes('current'));
    assert.ok(REGISTER_STATUSES.includes('superseded'));
  });

  it('ORDERING_METHODS contains expected values', () => {
    assert.ok(ORDERING_METHODS.includes('systematic'));
    assert.ok(ORDERING_METHODS.includes('mixed'));
    assert.ok(ORDERING_METHODS.includes('alphabetical'));
  });
});
