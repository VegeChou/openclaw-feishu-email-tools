import path from 'node:path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getOpenClawDir, readConfig, writeConfig, type OpenClawConfig, type PluginEntryConfig } from '../utils/config.js';
import { runCommand, tryRunCommand } from '../utils/system.js';
import { validateAppCredentials } from '../utils/feishu-auth.js';

const PLUGIN_ID = 'openclaw-feishu-email';
const MIN_OPENCLAW_VERSION = '2026.2.26';

interface InstallOptions {
  domain?: 'feishu' | 'lark';
  app?: string;
  useExisting?: boolean;
  pluginPath?: string;
  pluginSource?: string;
  defaultUserMailboxId?: string;
  skipVersionCheck?: boolean;
}

function ensurePluginConfig(cfg: OpenClawConfig): PluginEntryConfig {
  if (!cfg.plugins) cfg.plugins = {};
  if (!cfg.plugins.allow) cfg.plugins.allow = [];
  if (!cfg.plugins.entries) cfg.plugins.entries = {};
  if (!cfg.plugins.entries[PLUGIN_ID]) cfg.plugins.entries[PLUGIN_ID] = {};
  if (!cfg.plugins.entries[PLUGIN_ID].config) cfg.plugins.entries[PLUGIN_ID].config = {};
  return cfg.plugins.entries[PLUGIN_ID].config;
}

function removeAllowPlugin(cfg: OpenClawConfig, pluginId: string): void {
  if (!cfg?.plugins?.allow || !Array.isArray(cfg.plugins.allow)) return;
  cfg.plugins.allow = cfg.plugins.allow.filter((x: string) => x !== pluginId);
}

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n));
  const pb = b.split('.').map((n) => Number(n));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function checkOpenclawVersion(skipCheck: boolean): void {
  if (skipCheck) return;

  const output = runCommand('openclaw', ['--version'], { quiet: true });
  const matched = output.match(/(\d+\.\d+\.\d+)/);
  if (!matched?.[1]) {
    throw new Error(`Cannot parse openclaw version from: ${output}`);
  }

  if (compareVersion(matched[1], MIN_OPENCLAW_VERSION) < 0) {
    throw new Error(`Openclaw version too low: ${matched[1]}, require >= ${MIN_OPENCLAW_VERSION}`);
  }
}

function checkInstalledPlugin(): boolean {
  const listed = tryRunCommand('openclaw', ['plugins', 'list'], { quiet: true });
  if (!listed.ok) return false;
  return String(listed.output || '').includes(PLUGIN_ID);
}

async function cleanupPluginExtensionDir(): Promise<void> {
  const extDir = path.join(getOpenClawDir(), 'extensions', PLUGIN_ID);
  if (!(await fs.pathExists(extDir))) return;
  await fs.remove(extDir);
}

function resolveInstalledPluginSource(): string {
  const res = tryRunCommand('openclaw', ['plugins', 'info', PLUGIN_ID], { quiet: true });
  if (!res.ok) return '';
  const text = String(res.output || '');
  const matched = text.match(/^\s*Source:\s+(.+)$/m);
  if (!matched?.[1]) return '';
  const source = matched[1].trim();
  if (source.startsWith('~/')) {
    return path.join(process.env.HOME || '', source.slice(2));
  }
  return source;
}

async function installWithRollback(pluginSource: string, previousSource: string): Promise<void> {
  try {
    runCommand('openclaw', ['plugins', 'install', pluginSource]);
    return;
  } catch (err) {
    const firstMessage = err instanceof Error ? err.message : String(err);
    if (!firstMessage.includes('plugin already exists')) {
      throw err;
    }
  }

  runCommand('openclaw', ['plugins', 'uninstall', PLUGIN_ID, '--force']);
  await cleanupPluginExtensionDir();

  try {
    runCommand('openclaw', ['plugins', 'install', pluginSource]);
  } catch (err) {
    const installErr = err instanceof Error ? err.message : String(err);
    let rollbackNote = '';
    if (previousSource && previousSource !== pluginSource) {
      try {
        runCommand('openclaw', ['plugins', 'install', previousSource]);
        rollbackNote = ` Rolled back to previous source: ${previousSource}`;
      } catch (rollbackErr) {
        const rollbackMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
        rollbackNote = ` Rollback failed: ${rollbackMsg}`;
      }
    }
    throw new Error(`Install failed after uninstall: ${installErr}.${rollbackNote}`.trim());
  }
}

async function collectExistingCredentials(defaultAppId = ''): Promise<{ appId: string; appSecret: string }> {
  const ans = await inquirer.prompt([
    {
      type: 'input',
      name: 'appId',
      message: 'Enter App ID',
      default: defaultAppId,
      validate: (v: string) => (String(v || '').trim() ? true : 'App ID is required')
    },
    {
      type: 'password',
      name: 'appSecret',
      message: 'Enter App Secret',
      mask: '*',
      validate: (v: string) => (String(v || '').trim() ? true : 'App Secret is required')
    }
  ]);

  return { appId: String(ans.appId).trim(), appSecret: String(ans.appSecret).trim() };
}

async function promptCredentialUntilValid(
  domain: 'feishu' | 'lark',
  defaultAppId = ''
): Promise<{ appId: string; appSecret: string }> {
  while (true) {
    const creds = await collectExistingCredentials(defaultAppId);
    const valid = await validateAppCredentials({ appId: creds.appId, appSecret: creds.appSecret, domain });
    if (valid) return creds;

    const retry = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Credential validation failed. Retry input?',
        default: true
      }
    ]);
    if (!retry.retry) {
      throw new Error('User canceled credential retry');
    }
    defaultAppId = creds.appId;
  }
}

function parseAppFlag(value: string): { appId: string; appSecret: string } {
  const idx = value.indexOf(':');
  if (idx <= 0 || idx >= value.length - 1) {
    throw new Error('--app must be in appId:appSecret format');
  }
  return {
    appId: value.slice(0, idx).trim(),
    appSecret: value.slice(idx + 1).trim()
  };
}

export async function installCommand(options: InstallOptions = {}): Promise<void> {
  checkOpenclawVersion(Boolean(options.skipVersionCheck));

  const alreadyInstalled = checkInstalledPlugin();
  if (alreadyInstalled) {
    console.log(chalk.yellow('Plugin already installed. Reinstalling over existing version.'));
  }
  const previousSource = alreadyInstalled ? resolveInstalledPluginSource() : '';

  const cfg = await readConfig();
  const pluginCfg = ensurePluginConfig(cfg);

  let appId = '';
  let appSecret = '';
  const domain = (options.domain || pluginCfg.domain || 'feishu') as 'feishu' | 'lark';

  if (options.app) {
    const parsed = parseAppFlag(options.app);
    appId = parsed.appId;
    appSecret = parsed.appSecret;
    const valid = await validateAppCredentials({ appId, appSecret, domain });
    if (!valid) throw new Error('Credential validation failed for --app');
  } else if (options.useExisting) {
    appId = pluginCfg.appId || '';
    appSecret = pluginCfg.appSecret || '';
    if (!appId || !appSecret) {
      throw new Error('--use-existing specified but no appId/appSecret found in config');
    }
    const valid = await validateAppCredentials({ appId, appSecret, domain });
    if (!valid) throw new Error('Credential validation failed for --use-existing');
  } else {
    const creds = await promptCredentialUntilValid(domain, pluginCfg.appId || '');
    appId = creds.appId;
    appSecret = creds.appSecret;
  }

  pluginCfg.appId = appId;
  pluginCfg.appSecret = appSecret;
  pluginCfg.domain = domain;
  if (!pluginCfg.defaultUserMailboxId) {
    pluginCfg.defaultUserMailboxId = options.defaultUserMailboxId || '';
  }
  if (!pluginCfg.timeoutMs) pluginCfg.timeoutMs = 15000;
  if (pluginCfg.maxRetries === undefined) pluginCfg.maxRetries = 2;

  if (!cfg.plugins?.entries) cfg.plugins = { ...cfg.plugins, entries: {} };
  if (!cfg.plugins.entries?.[PLUGIN_ID]) cfg.plugins.entries[PLUGIN_ID] = {};
  cfg.plugins.entries[PLUGIN_ID].enabled = true;
  removeAllowPlugin(cfg, PLUGIN_ID);
  await writeConfig(cfg);

  const pluginSource = options.pluginSource || options.pluginPath || PLUGIN_ID;
  console.log(chalk.yellow(`Installing plugin: ${pluginSource}`));
  await installWithRollback(pluginSource, previousSource);

  if (!cfg.plugins.allow.includes(PLUGIN_ID)) {
    cfg.plugins.allow.push(PLUGIN_ID);
  }
  await writeConfig(cfg);

  const restart = tryRunCommand('openclaw', ['gateway', 'restart']);
  if (!restart.ok) {
    console.log(chalk.yellow('Failed to restart gateway. Please run: openclaw gateway restart'));
  }

  const health = tryRunCommand('openclaw', ['health', '--json'], { quiet: true });
  if (!health.ok) {
    console.log(chalk.yellow('Health check failed. Please run: openclaw health --json'));
  }

  console.log(chalk.green('\nInstallation completed: openclaw-feishu-email enabled'));
  console.log(`appId: ${appId}`);
}
