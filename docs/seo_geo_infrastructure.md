# SEO / GEO 基建

官网的搜索引擎与 AI 检索基建。每一项都有对应脚本，改内容时不需要手动改这些文件。

| 能力 | 位置 | 说明 |
|---|---|---|
| canonical / og / keywords | `site/.vitepress/config.mts` 的 `transformHead` | 每页的 canonical、分享卡片与关键词标签，全部跟随 `config/site.ts` 的 `url` |
| JSON-LD（Organization / WebSite / Product / Article / FAQPage） | `site/.vitepress/theme/pages/jsonld_server.ts` | 构建后由 `site/scripts/gen_jsonld.ts` 注入产物 |
| sitemap | `site/scripts/gen_sitemap.ts` | 扫构建产物生成，与 dist 严格一一对应 |
| IndexNow / Bing / 百度 / GSC 主动推送 | `site/scripts/seo_notify.ps1` | 发版后自动跑 |
| llms.txt 与 llms-full.txt | `site/scripts/gen_llms.ts` | 给 AI 检索的索引与全文 |
| 知识库文章门禁 | `site/scripts/check_geo_lint.py`（一句话答案自包含且含数字）、`site/scripts/check_seo_meta.py`（标题与描述长度） | 写作规范由脚本卡住，不靠人记 |
| 站内反向链接 | `Organization.sameAs` 指向本仓库，仓库 README 指向官网 | 两者互为同一实体 |

## 改 URL 会连带改什么

`site/config/site.ts` 的 `url` 是全站唯一真源。改它以后，下面这些会自动跟着变：canonical、sitemap、robots、OG 图、llms.txt。**不要**在这些文件里另写一份域名。

`site/docs/404.md` 里另有一处 canonical 要同步改——VitePress 1.6 不对 404 页跑 `transformHead`，那页的 SEO 标签走 frontmatter 加正文里的裸 `<link rel="canonical">`。

## 主动推送

```bash
pwsh -File site/scripts/seo_notify.ps1
```

推送渠道与各自的坑：

- **IndexNow**：需要 `site/public/` 下的密钥文件。推完会 200。
- **Bing**：走 SubmitFeed 协议，推完会 200。
- **百度**：有每日配额，推满会返回 `over quota`，这是预期内的。台账要写成集合（`return ,$set`），写成标量会在第二次推送时丢记录。
- **GSC**：需要 `site/temp/seo_probe/.venv` 里的 `google-auth`，且服务账号在 GSC 后台要有该属性的 Full 权限。

## 死链检查扫不到的地方

`site/scripts/check_links.ts` 扫的是 dist 下 HTML 的 `href` 与 `src`。`llms.txt` 与 `llms-full.txt` 是纯文本，最初不在扫描范围内，于是 `gen_llms.ts` 里写了一条不存在的 `/troubleshooting` 链接，AI 读到的就是 404。

现在 `check_links.ts` 也会校验这两个文件里的站内绝对 URL，指向的路由在 dist 里不存在就报错。**给 llms.txt 加站内链接时，这条门禁会盯着你。**
