import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

export interface PluginEntryConfig {
  appId?: string;
  appSecret?: string;
  domain?: 'feishu' | 'lark';
  defaultUserMailboxId?: string;
  defaultSenderOpenId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface PluginEntry {
  enabled?: boolean;
  config?: PluginEntryConfig;
}

export interface OpenClawConfig {
  plugins?: {
    allow?: string[];
    entries?: Record<string, PluginEntry>;
  };
}

export function getOpenClawDir() {
  return process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw');
}

export function getConfigPath() {
  return path.join(getOpenClawDir(), 'openclaw.json');
}

export async function readConfig(): Promise<OpenClawConfig> {
  const file = getConfigPath();
  if (await fs.pathExists(file)) {
    return fs.readJSON(file) as Promise<OpenClawConfig>;
  }
  return {};
}

export async function writeConfig(config: OpenClawConfig) {
  const file = getConfigPath();
  await fs.ensureDir(path.dirname(file));
  await fs.writeJSON(file, config, { spaces: 2 });
}
