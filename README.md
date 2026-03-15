# OpenClaw Feishu Email Installer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-blue.svg)](https://nodejs.org/)

[中文版](./README.zh.md) | English

This is the installer CLI for `openclaw-feishu-email`. It supports binding existing app credentials (`appId`/`appSecret`), writes plugin config to OpenClaw, and runs install/update/doctor/info workflows.

## Prerequisites

- Node.js `>= 22`
- OpenClaw CLI installed and available in PATH
- Network access to Feishu/Lark OpenAPI

## Commands

- `install`
- `update`
- `doctor`
- `info`

## Install CLI

```bash
npm install -g openclaw-feishu-email-tools
```

## Usage

```bash
# Interactive install (manual appId/appSecret input)
openclaw-feishu-email-tools install

# Install with existing credentials
openclaw-feishu-email-tools install --app "appId:appSecret"

# Use credentials already saved in config
openclaw-feishu-email-tools install --use-existing

# Update plugin (default source: openclaw-feishu-email)
openclaw-feishu-email-tools update

# Install/update from custom source (path/package/git)
openclaw-feishu-email-tools install --plugin-source "<source>"
openclaw-feishu-email-tools update --plugin-source "<source>"

# Health check
openclaw-feishu-email-tools doctor

# Show configuration
openclaw-feishu-email-tools info
```

## npx (no global install)

```bash
npx -y openclaw-feishu-email-tools install
npx -y openclaw-feishu-email-tools doctor
```

## What Install Does

1. Check OpenClaw version.
2. Collect or reuse `appId`/`appSecret`.
3. Validate tenant credential by Feishu OpenAPI.
4. Write plugin config to `~/.openclaw/openclaw.json`.
5. Install plugin source (`openclaw-feishu-email` by default).
6. Restart OpenClaw gateway and run health check.

## Upgrade And Uninstall

- Upgrade:
```bash
openclaw-feishu-email-tools update
```
- Uninstall plugin manually:
```bash
openclaw plugins uninstall openclaw-feishu-email --force
```

## Troubleshooting

| Problem | Cause | Action |
|------|------|------|
| `credential validation` failed | invalid appId/appSecret | verify app credentials and retry install |
| plugin install conflict | plugin already exists | run installer again; tool has reinstall/rollback logic |
| `required mail scopes` failed in doctor | missing app scopes | grant and publish required scopes in Feishu Open Platform |
| gateway restart failed | local OpenClaw service issue | run `openclaw gateway restart` manually |

## Compatibility

| Component | Version |
|------|------|
| Node.js | `>=22` |
| OpenClaw | `>=2026.2.26` |
