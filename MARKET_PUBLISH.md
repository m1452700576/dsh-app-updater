# 发布到 dsh 插件市场（dsh-market）

## 重要：去哪里提 PR

- **dsh-market/dsh-market 是市场应用本身，不是插件目录，不要往它提插件条目。**
- 插件目录/精选列表在 **awesome-dsh-plugin**：
  - 站点：https://awesome-dsh-plugin.com（数据源 plugins.json 每天由 CI 刷新）
  - 仓库：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin
- 流程：**去 awesome-dsh-plugin 仓库提 PR，在精选列表里加一条即可**；站点和本市场会自动收录，通常一天内生效。

## 收录条目格式（参考 dshmarket 的 RegistryPlugin 结构）

```jsonc
{
  "name": "dsh-app-updater",
  "owner": "manxintai",
  "url": "https://github.com/manxintai/dsh-app-updater",
  "category": "tool",
  "description": {
    "en": "Sidebar button that checks whether DSH has a newer release and auto-downloads/opens the installer, with live progress, a minimizable panel, and download security checks.",
    "zh": "侧边栏按钮：检测 DSH 是否有新版本并自动下载/打开安装包，带实时进度、可最小化面板与下载安全校验。"
  },
  "npm": null,
  "tarball": null,
  "install": "dsh plugin --profile web add github:manxintai/dsh-app-updater",
  "added": "2026-08-25"
}
```

> 实际以 awesome-dsh-plugin 仓库里现有条目的字段为准，照抄一条最近的改成自己的即可。

## 仓库结构合规清单（当前已满足）

- [x] package.json：含 dsh.bundle.patch、dsh.client（inject + platform: web）、exports 暴露 ./client
- [x] cordis.patch.yml：插入插件行
- [x] lib/index.js：host 端入口（export const name/inject/apply）
- [x] lib/client.js：浏览器端入口（window.__ModuleLoader__.load，导出 apply）
- [x] README.md / LICENSE（Apache-2.0）

## 发布步骤（需在你自己的终端执行；本环境无外网、无法替你推送）

```bash
# 1) 把仓库挪出 /tmp（重启会清空）
mv /tmp/dsh-app-updater ~/dsh-app-updater
cd ~/dsh-app-updater

# 2) 在 GitHub 网页创建空仓库 dsh-app-updater（不要勾选初始化 README）

# 3) 配置远程并推送（用 Personal Access Token，或 SSH）
./push-to-github.sh
git push -u origin main

# 4) 去 awesome-dsh-plugin 仓库提 PR，加一条收录条目（上面格式）
#    站点 + 市场自动收录，约一天内生效
```

## 替代方案（不进精选市场也能装）

```bash
dsh plugin --profile web add github:manxintai/dsh-app-updater
```

## 备注

- 收录 != 背书：市场不会审核代码；确保仓库里没有密钥/凭据。
- 市场安全模型：只允许安装 awesome-dsh-plugin 精选列表内的来源。
- 更新：GitHub 打新 tag/release（git 源）或发新版 npm 包。
