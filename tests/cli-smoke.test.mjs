import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('cli prints help', () => {
  const res = spawnSync('node', ['dist/index.js', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /openclaw-feishu-email-tools/);
});
