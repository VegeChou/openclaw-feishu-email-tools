import chalk from 'chalk';
import path from 'node:path';
import { runCommand, tryRunCommand } from '../utils/system.js';

interface UpdateOptions {
  pluginPath?: string;
  pluginSource?: string;
}

export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  const pluginSource = options.pluginSource || options.pluginPath || 'openclaw-feishu-email';
  const previousSource = resolveInstalledPluginSource();

  if (!previousSource) {
    runCommand('openclaw', ['plugins', 'install', pluginSource]);
  } else {
    try {
      runCommand('openclaw', ['plugins', 'install', pluginSource]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('plugin already exists')) {
        throw err;
      }

      runCommand('openclaw', ['plugins', 'uninstall', 'openclaw-feishu-email', '--force']);
      try {
        runCommand('openclaw', ['plugins', 'install', pluginSource]);
      } catch (installErr) {
        const installMsg = installErr instanceof Error ? installErr.message : String(installErr);
        if (previousSource && previousSource !== pluginSource) {
          try {
            runCommand('openclaw', ['plugins', 'install', previousSource]);
          } catch (rollbackErr) {
            const rollbackMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
            throw new Error(`Update failed: ${installMsg}. Rollback failed: ${rollbackMsg}`);
          }
          throw new Error(`Update failed: ${installMsg}. Rolled back to previous source: ${previousSource}`);
        }
        throw new Error(`Update failed after uninstall: ${installMsg}`);
      }
    }
  }

  try {
    runCommand('openclaw', ['gateway', 'restart']);
  } catch {
    console.log(chalk.yellow('Failed to restart gateway. Please restart manually.'));
  }

  console.log(chalk.green('Plugin update completed.'));
}

function resolveInstalledPluginSource(): string {
  const res = tryRunCommand('openclaw', ['plugins', 'info', 'openclaw-feishu-email'], { quiet: true });
  if (!res.ok) return '';
  const output = String(res.output || '');
  const matched = output.match(/^\s*Source:\s+(.+)$/m);
  if (!matched?.[1]) return '';
  const source = matched[1].trim();
  if (source.startsWith('~/')) {
    return path.join(process.env.HOME || '', source.slice(2));
  }
  return source;
}
