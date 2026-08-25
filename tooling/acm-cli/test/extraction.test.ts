import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractACMBlock } from '../src/parser.js';
import { validManifest, wrapManifest } from './fixtures/manifest.js';

describe('extractACMBlock', () => {
  it('extracts an HTML comment block', () => {
    assert.equal(extractACMBlock(wrapManifest()).content, validManifest.trim());
  });

  it('extracts an acm tag block', () => {
    assert.equal(extractACMBlock(`<acm>\n${validManifest}\n</acm>`).content, validManifest.trim());
  });

  it('accepts a standalone frontmatter document', () => {
    assert.equal(extractACMBlock(`  \r\n${validManifest}\r\n  `).content, validManifest.trim());
  });

  it('rejects multiple blocks and unbalanced delimiters', () => {
    assert.match(extractACMBlock(`${wrapManifest()}\n${wrapManifest()}`).error!, /Exactly one ACM block/);
    assert.match(extractACMBlock('<!-- ACM-START -->\nbody').error!, /Mismatched/);
    assert.match(extractACMBlock('body\n<!-- ACM-END -->').error!, /Mismatched/);
  });

  it('ignores delimiter-looking text inside fenced code', () => {
    const input = `${wrapManifest(validManifest.replace('The request key', '```\n<!-- ACM-END -->\n```\nThe request key'))}`;
    assert.equal(extractACMBlock(input).content, validManifest.replace('The request key', '```\n<!-- ACM-END -->\n```\nThe request key').trim());
  });

  it('handles casing and CRLF delimiters', () => {
    const input = `\r\n<!-- acm-start -->\r\n${validManifest}\r\n<!-- ACM-end -->\r\n`;
    assert.equal(extractACMBlock(input).content, validManifest.trim());
  });

  it('rejects empty and comment-only blocks', () => {
    assert.equal(extractACMBlock('<!-- ACM-START --><!-- ACM-END -->').content, null);
    assert.equal(extractACMBlock('<!-- ACM-START -->\n<!-- note -->\n<!-- ACM-END -->').content, null);
  });
});