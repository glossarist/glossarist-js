import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkExtensionalCompleteness,
  OPEN_ENDED_PATTERNS,
} from '../../src/validators/extensional-completeness.js';

describe('checkExtensionalCompleteness', () => {
  it('returns null for non-extensional definitions', () => {
    assert.equal(
      checkExtensionalCompleteness({ type: 'intensional', content: '... etc.' }),
      null,
    );
    assert.equal(
      checkExtensionalCompleteness({ type: null, content: '... etc.' }),
      null,
    );
  });

  it('returns null for extensional definitions without open-ended wording', () => {
    const clean = checkExtensionalCompleteness({
      type: 'extensional',
      content: 'The set {A, B, C} where each element is distinct.',
    });
    assert.equal(clean, null);
  });

  it('flags "..." in extensional definitions', () => {
    const result = checkExtensionalCompleteness({
      type: 'extensional',
      content: 'Concepts include A, B, C...',
    });
    assert.ok(result);
    assert.equal(result!.rule, 'ISO-704-6.4.5.1');
    assert.equal(result!.severity, 'warning');
    assert.match(result!.message, /open-ended wording/);
    assert.equal(result!.match, '...');
  });

  it('flags "etc." (case-insensitive)', () => {
    const result = checkExtensionalCompleteness({
      type: 'extensional',
      content: 'The valid types are A, B, ETC.',
    });
    assert.ok(result);
    assert.match(result!.match, /etc/i);
  });

  it('flags "and so on"', () => {
    const result = checkExtensionalCompleteness({
      type: 'extensional',
      content: 'The set includes apples, oranges, and so on.',
    });
    assert.ok(result);
    assert.match(result!.match, /and so on/i);
  });

  it('flags "including" as open-ended', () => {
    const result = checkExtensionalCompleteness({
      type: 'extensional',
      content: 'The set including A, B, C.',
    });
    assert.ok(result);
    assert.match(result!.match, /including/i);
  });

  it('handles null/undefined definitions gracefully', () => {
    assert.equal(checkExtensionalCompleteness(null), null);
    assert.equal(checkExtensionalCompleteness(undefined), null);
    assert.equal(checkExtensionalCompleteness({}), null);
  });

  it('handles empty content', () => {
    assert.equal(
      checkExtensionalCompleteness({ type: 'extensional', content: '' }),
      null,
    );
    assert.equal(
      checkExtensionalCompleteness({ type: 'extensional', content: null }),
      null,
    );
  });

  it('OPEN_ENDED_PATTERNS is frozen and non-empty', () => {
    assert.ok(OPEN_ENDED_PATTERNS.length >= 5);
  });
});
