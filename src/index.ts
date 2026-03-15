#!/usr/bin/env node
import { Command } from 'commander';
import { installCommand } from './commands/install.js';
import { updateCommand } from './commands/update.js';
import { doctorCommand } from './commands/doctor.js';
import { infoCommand } from './commands/info.js';

const program = new Command();

program
  .name('openclaw-feishu-email-tools')
  .description('Installer for openclaw-feishu-email plugin')
  .version('2026.3.16');

program
  .command('install')
  .option('--domain <domain>', 'OpenAPI domain (feishu|lark)', 'feishu')
  .option('--app <app>', 'Use existing credential in appId:appSecret format')
  .option('--use-existing', 'Use appId/appSecret from existing config directly')
  .option('--plugin-source <source>', 'Plugin source for openclaw plugins install (default: openclaw-feishu-email)')
  .option('--plugin-path <path>', 'Deprecated alias of --plugin-source')
  .option('--default-user-mailbox-id <id>', 'Default mailbox ID')
  .option('--skip-version-check', 'Skip openclaw version check')
  .action(async (opts) => {
    await installCommand(opts);
  });

program
  .command('update')
  .option('--plugin-source <source>', 'Plugin source for openclaw plugins install (default: openclaw-feishu-email)')
  .option('--plugin-path <path>', 'Deprecated alias of --plugin-source')
  .action(async (opts) => {
    await updateCommand(opts);
  });

program.command('doctor').action(async () => {
  await doctorCommand();
});

program.command('info').action(async () => {
  await infoCommand();
});

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
