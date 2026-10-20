# 预览记录 · code-video-skills-guide

重写这版的原因：2026-10-14 这篇从知识库下架，理由是它把四个开源技能按功能排名、给"选型表"，读者照表选完仍然踩坑，而正文里嵌了四支本机渲染的样片（其中两支第一轮就是坏的），"实测"的成色不足。重写时把重心从"谁最强"挪到"怎么少走弯路"。

## 版本

### v1 · 2026-10-15

按新流程重写的第一稿。基于下架前那篇的素材（素材卡见 `.source.md`），改动：

| 原稿 | 改法 | 为什么 |
|---|---|---|
| 标题「代码做视频：四个技能实测与分场景选型」 | 「用代码做视频：四个开源技能怎么选」 | 原标题 21 字但"实测与选型"是自夸，读者关心的是"我该怎么选" |
| 选型表带 GitHub 星数 | 删掉星数，只留一句话理由 | 星数会漂移，且与"该怎么用"无关 |
| 视频文件名叫 `v1_unlimited_card.mp4` 等 | 改用 `config/media_cdn.ts` 里登记的文件名（`v1_round3` / `v2` / `v4_mcp` / `v6_seek_t`） | `<VideoPlayer>` 的 `src` 只吃 `public/videos/` 下的文件名，路径前缀会让 R2 映射查不到 |
| 正文直接给出四个技能的仓库链接 | 改为不点名的技能简称（video-shotcraft 等保留，这是工具名不是平台名） | 素材边界：第三方平台名不进正文；工具名是必要信息，保留 |
| 讲五支样片 | 改为四支，去掉"Skills 是什么"那支 | 四支足够说明四个技能，加一支反而稀释 |
| "三轮迭代实录"里出现具体内部函数名与常量名 | 改为"少传了一个参数，返回 undefined"这类可复述的说法 | 内部符号名对读者无用，且容易过时 |
| 各处"本文实测" | 改为陈述实测结果本身（标准差 92.18、静止 0.00s、超 122px） | 用数据代替自证，比"我们实测"可信 |

## 体检

```
npm run check:draft -- --slug=code-video-skills-guide
```

- `[ok]`，0 fail
- H2 共 10 个（远超 3 个下限），目录不会太空
- 有「一句话答案」引用块，llms-full.txt 能抽到答案段
- 正文无 `## 常见问题` / `## 相关阅读`
- 无第三方平台名
- title 16 字、description 71 字
- 两条提醒：没有封面（`public/knowledge/code-video-skills-guide.jpg` 需按 guide 第 4 步配）；`config/knowledge.ts` 还没有该 slug 的条目（发布前补，见下）

## 预览

- 41802 `/drafts/` 列表页：卡片显示「上手与进阶」不对，本篇是 `how`（原理与机制），显示「原理与机制」正确
- 41802 `/knowledge/code-video-skills-guide.html`：知识库外壳 + DRAFT 徽标 + 10 项目录
- 四个 `<VideoPlayer>` 从 R2 拉流，poster 在 `public/videos/poster/`，已确认 7 张 poster 齐全

## 待办（发布前）

1. **配封面**：素材库 `temp/aiprimetech_covers/` 里原用的是 `show-hn-ideogram-4-0-open-weight-9-3b-text-to-image-model`，语义是"图像生成模型"，与本篇"视频"主题不符。建议从未使用素材里挑一张 Claude Code 或技能类主题的，或不填 `cover`（卡片退化成纯文字卡，比配一张跑题的图好）。
2. **写 `config/knowledge.ts` 条目**，草稿如下。faq 5 条，related 指向 `claude-code-make-video`（Remotion 教程，start）、`claude-code-skills`（技能机制，start）、`prompt-caching-explained`（how，与第二支样片同主题）：

```ts
{
  slug: 'code-video-skills-guide',
  cat: 'how',
  title: '用代码做视频：四个开源技能怎么选',
  desc: '实测四个代码渲染视频技能：宣传片、科普讲解、口播教程、纯动效分别该用哪个，开拍前要准备什么素材，中文配音两条路线怎么选，以及三轮迭代踩过的坑。',
  summary: '四个代码渲染视频技能按场景选型，附素材清单、配音路线与三轮迭代的踩坑记录。',
  date: '2026-10-15',
  kicker: '视频',
  tags: ['代码做视频', 'remotion', '视频生成', 'claude code 技能', '文案配音'],
  minutes: 12,
  related: ['claude-code-make-video', 'claude-code-skills', 'prompt-caching-explained'],
  sourceSlug: 'code-video-skills-guide',
  faq: [
    { q: '代码做视频和文生视频差在哪？', a: '文生视频是模型逐帧生成像素，适合实拍质感与人物表演；代码做视频是每一帧由程序算出来，适合字幕条、数据动画、代码演示、宣传片与科普讲解。核心差别是可复现：同一份代码渲染一百次结果完全一样。' },
    { q: '四个技能怎么选？', a: '看画面是真实界面还是抽象示意：真实界面（你的产品、你的终端）用 video-shotcraft；抽象示意图配解说用 anything2explainer；要字级时间戳锁配音用 video-talkcraft；想避开 Remotion 授权用 claude-motion-design。' },
    { q: '我该给技能多少信息？', a: '只给五样：主题或产品入口、时长、要不要解说、配音偏好、素材路径。不要自己写分镜、字幕位置、元素出现帧号——那是技能内部的实现，手填会和它的自动设计冲突。正确做法是让技能先出 30 秒样片，再提修改意见。' },
    { q: '中文配音用什么？出片后怎么检查？', a: '配音用 Kokoro-82M-v1.1-zh 本地跑，免费可商用不联网，四个中文音色；edge-tts 音质自然且有词级边界，但需要能连 speech.platform.bing.com，连不上握手 403。检查用机器闸而非人眼：本文第一轮里人工审帧认为两支片子通过，实际那两支根本没挂载成片（上部像素标准差 0.00）。' },
    { q: '为什么第一帧很重要？', a: '社交平台直接抓视频第一帧当缩略图。第一帧是空白底色或半截入场动画，热度和点击都会打折，所以前 5 帧要放完整画面。' },
  ],
},
```

3. **视频元数据回填**：把 `config/video_meta.ts` 的 `unlistedVideos` 里对应这四支的条目搬回 `videos` 数组（`v1_round3` / `v2` / `v4_mcp` / `v6_seek_t`），否则 VideoObject JSON-LD 与 llms.txt 的视频教程那行会缺内容。
4. **发布**：`npm run publish:article -- --slug=code-video-skills-guide`。脚本在移动 md 之前会自动做视频这一关：确认四支本地 mp4 与 poster 都在 → 重算 `VIDEO_KEYS` 哈希映射 → 上传到 R2 并校验远端大小（草稿期看的是本地文件，线上走 R2，这一步不能省）。之后按提示跑 `build`、`check:toc -- --slug=code-video-skills-guide`、`verify`。

## 结论

**建议发布**，但要先配封面（否则纯文字卡）。理由：本文真正的方法论是"每次肉眼发现一个质量问题就把它变成一条断言"，这段是任何一篇 AI 生成视频的文章都没有的；而排名式的选型表本来就是它被下架的原因，重写后已经不在了。
