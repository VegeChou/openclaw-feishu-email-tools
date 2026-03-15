import chalk from 'chalk';
import { readConfig } from '../utils/config.js';
import { listAppScopes, validateAppCredentials } from '../utils/feishu-auth.js';

const REQUIRED_SCOPES = [
  'mail:user_mailbox:readonly',
  'mail:user_mailbox:write',
  'mail:user_mailbox.message:send'
];

function openPlatformLink(domain: 'feishu' | 'lark') {
  return domain === 'lark' ? 'https://open.larksuite.com/app' : 'https://open.feishu.cn/app';
}

export async function doctorCommand(): Promise<void> {
  const cfg = await readConfig();
  const plugin = cfg?.plugins?.entries?.['openclaw-feishu-email'];
  const pc = plugin?.config || {};
  const domain = (pc.domain || 'feishu') as 'feishu' | 'lark';

  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
  checks.push({ name: 'plugin enabled', ok: plugin?.enabled === true });
  checks.push({ name: 'appId configured', ok: Boolean(pc.appId) });
  checks.push({ name: 'appSecret configured', ok: Boolean(pc.appSecret) });

  let validCredential = false;
  if (pc.appId && pc.appSecret) {
    validCredential = await validateAppCredentials({ appId: pc.appId, appSecret: pc.appSecret, domain });
    checks.push({ name: 'credential validation', ok: validCredential });
  }

  let missingScopes: string[] = [];
  if (validCredential) {
    try {
      const scopes = await listAppScopes({ appId: pc.appId, appSecret: pc.appSecret, domain });
      const granted = new Set(
        scopes
          .filter((s) => Number(s.grant_status) === 1)
          .map((s) => s.scope_name)
      );
      missingScopes = REQUIRED_SCOPES.filter((s) => !granted.has(s));
      checks.push({
        name: 'required mail scopes',
        ok: missingScopes.length === 0,
        detail: missingScopes.length > 0 ? `missing: ${missingScopes.join(', ')}` : undefined
      });
    } catch (err) {
      checks.push({
        name: 'required mail scopes',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }
  }

  let unhealthy = false;
  for (const c of checks) {
    if (c.ok) {
      console.log(chalk.green(`✓ ${c.name}`));
    } else {
      unhealthy = true;
      console.log(chalk.red(`✗ ${c.name}${c.detail ? ` (${c.detail})` : ''}`));
    }
  }

  if (missingScopes.length > 0) {
    console.log(chalk.yellow('\nRecommended actions:'));
    console.log(`1. Open app permission page: ${openPlatformLink(domain)}`);
    console.log(`2. Apply and publish scopes: ${missingScopes.join(', ')}`);
    console.log('3. Run again: openclaw-feishu-email-tools doctor');
  }

  if (unhealthy) {
    process.exitCode = 1;
  }
}
