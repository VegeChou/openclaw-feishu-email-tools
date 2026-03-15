import chalk from 'chalk';
import { readConfig } from '../utils/config.js';

function maskSecret(value = ''): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export async function infoCommand(): Promise<void> {
  const cfg = await readConfig();
  const plugin = cfg?.plugins?.entries?.['openclaw-feishu-email'];
  const pc = plugin?.config || {};

  console.log(chalk.cyan('openclaw-feishu-email configuration'));
  console.log(`enabled: ${plugin?.enabled === true}`);
  console.log(`appId: ${pc.appId || ''}`);
  console.log(`appSecret: ${maskSecret(pc.appSecret || '')}`);
  console.log(`domain: ${pc.domain || 'feishu'}`);
  console.log(`defaultUserMailboxId: ${pc.defaultUserMailboxId || ''}`);
  console.log(`defaultSenderOpenId(config): ${pc.defaultSenderOpenId || ''}`);
}
