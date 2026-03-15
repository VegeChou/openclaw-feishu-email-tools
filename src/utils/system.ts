import { spawnSync } from 'node:child_process';

interface RunOptions {
  quiet?: boolean;
}

export function runCommand(cmd: string, args: string[], opts: RunOptions = {}): string {
  const res = spawnSync(cmd, args, {
    stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    shell: false
  });

  if (res.error) {
    throw res.error;
  }

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    const stdout = (res.stdout || '').trim();
    const detail = [stderr, stdout].filter(Boolean).join('\n');
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}${detail ? `\n${detail}` : ''}`);
  }

  return (res.stdout || '').trim();
}

export function tryRunCommand(cmd: string, args: string[], opts: RunOptions = {}) {
  try {
    return { ok: true, output: runCommand(cmd, args, opts) };
  } catch (err) {
    return { ok: false, error: err };
  }
}
