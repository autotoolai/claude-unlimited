# 故障排除指南

**什么时候读**：改了东西但行为不对、或脚本报错看着不像自己引起的。**验收命令**在 `README.md`「命令」一节。

每条都是本项目真实踩过的坑。症状在前，根因在后，处理方式最后。

---

## 一、预览与构建产物

### 「改了代码，远程浏览器看不到最新」

这是本项目历史上最高频的问题，根因已定位并修复：**dev 热更新与产物预览曾共用 41777**。
浏览器标签页还挂在旧进程上时，你以为在预览新产物，实际看的是上一次 build 的结果。

**现在按这个顺序判断**，不要一上来就杀进程：

1. **看页面左下角角标。** `DEV · 2026-10-13 16:20:01` 是热更新服务，`BUILD 2026-10-13 15:02:44` 是静态产物。角标由 `config.mts` 的 `transformIndexHtml`（dev）和 `serve_dist.mjs`（产物）各自注入。
2. 角标是 `DEV` 但时间戳很旧 → dev 进程是老的，重启 `npm run dev:site`。
3. 角标是 `BUILD` → 你在 41777，切到 41800。
4. 没有角标 → 白屏或跑错服务，见下一条。

日常开发只看 41800，完整流程见 `CLAUDE.md`「日常开发流程」。

### 「页面静默不挂载，浮标点了没反应，控制台只有资源 404」（旧结论已修正）

**旧诊断**：认为 `serve_dist.mjs` 把 dist 读进内存快照，新 hash 资源对旧进程全 404，必须杀进程重启。

**这个结论不成立。** `serve_dist.mjs` 每次请求都用 `readFileSync` / `createReadStream` 读磁盘，响应头已带 `cache-control: no-store`，不存在内存快照。真正的根因是上面那条端口复用。

**处理**：切到正确的端口；必要时 Ctrl+Shift+R 强刷。不要再把「杀进程」当成唯一手段。

### 产物里不要删 Vue SSR 片段标记

**根因**：`<!--[-->` / `<!--]-->` / `<!---->` 是 fragment 边界与 `v-if` 空分支的占位注释，客户端 hydration 靠它们定位 vnode。
删掉后每个多根组件都会触发 "Hydration node mismatch"，Vue 重建对应子树，用户看到内容闪一下。

**处理**：`scripts/copy_public.mjs` 里已经没有删标记的逻辑。不要再加。「产物里不能有 SSR 标记」那条断言也曾让 `npm run build` 恒 exit 1，现已移除。

### 生产构建每页一条 hydration mismatch 警告

现状，已知可接受，原因见 `temp/hydration_mismatch.md`。dev 下不出现。

---

## 二、类型检查

### `npm run typecheck` 报 26 条，其中 24 条可忽略、2 条是真错

- **24 条**来自 node_modules 里的 `.vue` 导入（VitePress 1.6.4 自身不带 `.js` 模块声明，`skipLibCheck` 管不到 `.vue`）。
  过滤方式：`npx vue-tsc --noEmit 2>&1 | grep -v node_modules` 应为空。
- **2 条真错**在 `.vitepress/analytics_snippets.ts`：把 `async: true` / `defer: true` 传给 VitePress 的 `HeadConfig`，
  而那里的属性类型是 `string`。不影响构建产物，但会让 typecheck 报红。想修就按 HeadConfig 的类型改写，别绕。

> 历史上 tsconfig.json 的注释写「24 条 TS7016 全部来自 node_modules、站点源码 0 条」，那是误判——实际是 `TS2307 Cannot find module '*.vue'`，
> 出在站点自己的 `theme/index.ts` 上。注释已改，判断依据以命令输出为准。

---

## 三、本机环境

### `pwsh` 跑 .ps1 报 ParserError，报错位置和中文注释所在的行无关

**根因**：本机 `pwsh` 指向 Windows PowerShell 5.1，不是 PowerShell 7。它按系统 ANSI 代码页（本机 936）读**无 BOM** 的 `.ps1`，
脚本里任何非 ASCII 字符（**包括注释**）都可能被解成乱码，个别字节落到引号或反引号上就报错，报错行会指向 `param` 默认值或 `throw`。

**处理**：`.ps1` 注释只写 ASCII，中文说明放同名 `.md`。拼变量用 `${Branch}` 而不是 `$Branch:`（后者被解析成作用域限定符）。

### `node -e "..."` 里正则不生效，单独写 .mjs 文件跑就正常

**根因**：Git Bash 下 `node -e` 的双引号里，正则的 `\.` `\?` `\|` 会被 shell 吞掉。源码实际变成了 `/^(?:h|s).js(?:?|&|$)/`。
2026-10-13 曾因此连续 5 轮拿失真结论排查百度 id 正则，而问题根本不在正则上。

**处理**：需要验证正则或解析逻辑时，先写进临时 `.mjs` / `.py` 文件再执行，不要用 `-e`。
**判断法则**：一个「实测」结论连续两次解释不了现象，先怀疑探针，再怀疑被测代码。

### 用 Write 工具写了 md，同一轮 ls 却看不到文件

**处理**：写完立刻 `ls -la <path> && head -2 <path>` 确认。不存在就用 Bash `cat` 重写。不要因为 Write「报成功」就当文件已落盘。

### 同一项目另开一个 Claude Code 会话并行改同一批文件

**根因**：两个进程改同一批脚本或语料文件会互相覆盖。症状是刚写好的内容在下一条命令里「自己变回旧内容」，
或 grep 找不到刚加的标识符，或批量 patch 报 `AssertionError`（目标行已被对方换掉）。

**处理**：动手前先看文件 mtime（`ls -lt`）确认没有更近的改动。要动共享文件时先和对方确认。

---

## 四、安全与提交

### 仓库 `config/` 下有明文凭据

- `agent_session.json`：明文账号密码 + Bearer token
- `agent_storage_state.json`：Playwright storageState
- `config/local/*.env`：Umami key、SEO token、GSC 服务账号 JSON

**处理**：只在本机用。根 `.gitignore` 已排除。**不要贴进聊天记录或日志**。`git add -A` 前先 `git status` 逐条看。

### 部署凭据

`CLOUDFLARE_API_TOKEN` 是本机环境变量，与其它项目共用。不要写进仓库。

---

## 五、SEO 与收录

### GSC / 百度接口本机直连不通

GSC 走 Google API，本机直连不通。密钥文件里的 `HTTPS_PROXY` 默认注释着，开 Clash Verge 后按实际端口打开。
IndexNow 与 Bing 不受影响。

### 百度报「未知原因: 308」

Cloudflare Pages 对 `/*.html` 一律 308 到无列路径，百度验证机器人不跟随重定向。
**处理**：`_redirects` 里配 `/xxx.html /xxx 200`，并把百度签发的 code 存成无后缀文件 `public/baidu_verify_codeva-<code>`。

### 本机到 github.com:443 间歇性连不上

`git push` 报连接失败时重试，或改用 SSH 传输。`api.github.com` 正常，Pages 不受影响。

---

## 六、验收命令的既有问题

判断「是不是我改坏的」时，先排除这一类：

- `npm run build` 的 `check_dist.mjs` 曾在断言「产物里不能有 SSR 标记」，与 `copy_public.mjs` 的要求直接矛盾，导致任何代码状态下都 exit 1。
  该断言已移除，当前通过。
- `check_dist.mjs` 断言 `/guide` 的 `cu-step-kicker` 必须恰好 11 个，当前产物里 0 个。教程页的 kicker 渲染与这条断言已不同步，
  与端口拆分、角标注入都无关（那些只碰 `config.mts` / `Layout.vue` / `serve_dist.mjs`）。改教程页时按这条判断，见
  `docs/troubleshooting_guide.md` 第六节。
- `npx tsc --noEmit` 会报 `.vue` 模块找不到（见第二节）。
- 文档里手写的「N 项 / N 条」是快照，脚本一改就漂。以命令输出为准。
