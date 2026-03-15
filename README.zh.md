# OpenClaw 飞书邮箱安装器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-blue.svg)](https://nodejs.org/)

[English](./README.md) | 中文版

这是 `openclaw-feishu-email` 的安装器 CLI。支持绑定已有应用凭证（`appId`/`appSecret`），写入 OpenClaw 插件配置，并提供 install/update/doctor/info 流程。

## 前置条件

- Node.js `>= 22`
- 已安装 OpenClaw CLI，且命令可用
- 可访问飞书/Lark OpenAPI 网络

## 命令

- `install`
- `update`
- `doctor`
- `info`

## 安装 CLI

```bash
npm install -g openclaw-feishu-email-tools
```

## 使用

```bash
# 交互安装（手动输入 appId/appSecret）
openclaw-feishu-email-tools install

# 使用已有凭证安装
openclaw-feishu-email-tools install --app "appId:appSecret"

# 使用配置中已保存的凭证
openclaw-feishu-email-tools install --use-existing

# 更新插件（默认源：openclaw-feishu-email）
openclaw-feishu-email-tools update

# 从自定义源安装/更新（路径/包名/git）
openclaw-feishu-email-tools install --plugin-source "<source>"
openclaw-feishu-email-tools update --plugin-source "<source>"

# 健康检查
openclaw-feishu-email-tools doctor

# 查看配置
openclaw-feishu-email-tools info
```

## npx 直接执行（无需全局安装）

```bash
npx -y openclaw-feishu-email-tools install
npx -y openclaw-feishu-email-tools doctor
```

## install 流程说明

1. 检查 OpenClaw 版本。
2. 采集或复用 `appId`/`appSecret`。
3. 调用飞书接口校验 tenant 凭证。
4. 写入 `~/.openclaw/openclaw.json` 插件配置。
5. 安装插件源（默认 `openclaw-feishu-email`）。
6. 重启 OpenClaw gateway 并做健康检查。

## 升级与卸载

- 升级：
```bash
openclaw-feishu-email-tools update
```
- 手动卸载插件：
```bash
openclaw plugins uninstall openclaw-feishu-email --force
```

## 常见问题

| 问题 | 原因 | 处理方式 |
|------|------|------|
| `credential validation` 失败 | appId/appSecret 无效 | 确认凭证后重新安装 |
| 插件安装冲突 | 已存在同名插件 | 重新执行安装器；已包含重装/回滚逻辑 |
| doctor 提示 `required mail scopes` 失败 | 应用权限不完整 | 在飞书开放平台申请并发布所需权限 |
| gateway 重启失败 | 本地 OpenClaw 服务异常 | 手动执行 `openclaw gateway restart` |

## 兼容性

| 组件 | 版本 |
|------|------|
| Node.js | `>=22` |
| OpenClaw | `>=2026.2.26` |
