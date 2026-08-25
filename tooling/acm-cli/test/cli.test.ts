import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validManifest, wrapManifest } from './fixtures/manifest.js';

const cliPath = path.resolve('dist/cli.js');

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, 'validate', ...args], {
    encoding: 'utf8'
  });
}

describe('acm-cli validate process', () => {
  it('accepts a valid PR body', () => {
    const result = runCli('--pr-body', wrapManifest());
    assert.equal(result.status, 0);
    assert.match(result.stdout, /ACM Validation Passed/);
  });

  it('accepts a valid file and all repository examples', () => {
    const fixture = path.resolve('test/fixtures/valid.acm.md');
    const fileResult = runCli('--file', fixture);
    assert.equal(fileResult.status, 0);

    for (const example of [
      '01-distributed-saga-checkout/ACM.md',
      '02-auth-token-revocation/ACM.md',
      '03-cdc-stream-consumer/ACM.md'
    ]) {
      const result = runCli('--file', path.resolve('../../examples', example));
      assert.equal(result.status, 0, `${example}: ${result.stderr}`);
      assert.match(result.stdout, /ACM Validation Passed/);
    }
  });

  it('returns one for missing files or missing input options', () => {
    assert.equal(runCli('--file', 'does-not-exist.md').status, 1);
    assert.equal(runCli().status, 1);
  });

  it('returns one and reports validation errors on stderr', () => {
    const invalid = wrapManifest(validManifest.replace('acm_version: "1.1"', 'acm_version: "1.0"'));
    const result = runCli('--pr-body', invalid);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ACM Validation Failed/);
    assert.match(result.stderr, /Frontmatter Schema Error/);
  });
});