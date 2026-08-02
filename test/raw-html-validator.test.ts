import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateNoRawHtml } from '../src/validators/raw-html-validator.js';

describe('validateNoRawHtml (P5)', () => {
  it('returns empty array for plain text', () => {
    assert.deepEqual(validateNoRawHtml('Hello world, no HTML here.'), []);
  });

  it('returns empty array for empty/null text', () => {
    assert.deepEqual(validateNoRawHtml(''), []);
    assert.deepEqual(validateNoRawHtml(null as unknown as string), []);
  });

  it('detects <a href> with label and suggests {{link:URL, label}}', () => {
    const issues = validateNoRawHtml('See <a href="http://example.com">click here</a> for details.');
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.severity, 'warning');
    assert.match(issues[0]!.match, /<a href/);
    assert.equal(issues[0]!.suggestion, '{{link:http://example.com, click here}}');
  });

  it('detects <a href> where label equals URL and suggests {{link:URL}}', () => {
    const issues = validateNoRawHtml('<a href="https://x.com">https://x.com</a>');
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.suggestion, '{{link:https://x.com}}');
  });

  it('detects <img src> without alt and suggests {{image:SRC}}', () => {
    const issues = validateNoRawHtml('<img src="diagram.png">');
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.suggestion, '{{image:diagram.png}}');
  });

  it('detects <img src alt> and suggests {{image:SRC, ALT}}', () => {
    const issues = validateNoRawHtml('<img src="d.png" alt="diagram">');
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.suggestion, '{{image:d.png, diagram}}');
  });

  it('detects <iframe> and suggests {{link:URL}}', () => {
    const issues = validateNoRawHtml('<iframe src="https://embed.com"></iframe>');
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /iframe/);
    assert.equal(issues[0]!.suggestion, '{{link:https://embed.com}}');
  });

  it('detects multiple HTML tags in the same text', () => {
    const text = 'See <a href="http://x.com">x</a> and <img src="y.png"> together.';
    const issues = validateNoRawHtml(text);
    assert.equal(issues.length, 2);
  });

  it('handles single-quoted attributes', () => {
    const issues = validateNoRawHtml("<a href='http://x.com'>link</a>");
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.suggestion, '{{link:http://x.com, link}}');
  });
});
