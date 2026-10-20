#!/usr/bin/env python3
"""知识库文章 SEO 元信息门禁。

中文 SERP 里标题约 30 字后被截断，description 约 78 字后被截断；规范里定的上限是
title ≤ 32 字、description ≤ 110 字。keywords 由 config/knowledge.ts 的 tags 供给，
经 .vitepress/config.mts 的 transformHead 注入到每篇文章页；tags 缺失等于该页没有
per-page keywords，会静默回落到全站那条全局 keywords。

同时校验 md 的 frontmatter 与 config/knowledge.ts 的 title 一致（两处不同步会让
JSON-LD 的 Article.name 和页面 H1 对不上）。

用法：python scripts/check_seo_meta.py          # 有问题 exit 1
      python scripts/check_seo_meta.py --fix    # 只提示不报错，预览将要改什么
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_TS = ROOT / 'config' / 'knowledge.ts'
KNOWLEDGE_DIR = ROOT / 'docs' / 'knowledge'

TITLE_MAX = 32
DESC_MAX = 110
BANNED_TITLE_WORDS = ['详解', '全解析', '一文读懂', '深度解析', '全面解析']


def parse_ts_meta() -> dict:
    """从 config/knowledge.ts 里抽出每条 {slug, title, desc, tags}。

    刻意用行级正则而不是 eval：knowledge.ts 是 TS 源码，不能直接 exec。
    条目形如「  {\n    slug: 'x',\n ... }」，按 slug 行切块最稳。
    """
    src = KNOWLEDGE_TS.read_text(encoding='utf-8')
    meta = {}
    # 只切 knowledge[] 数组本体：后面还有 retiredKnowledgePages 块，它也有 slug 字段，
    # 按全文切块会把退役页当成现役文章（它没有 md 与 title/desc）。
    start = src.index('export const knowledge: KnowledgeMeta[] = [')
    end = src.index('\n]', start)
    src = src[start:end]
    # 从每个 slug 行开始，到下一个 slug 行之前，是一条完整条目
    chunks = re.split(r'\n(?=\s*slug: )', src)
    for chunk in chunks:
        m = re.search(r"slug: '([^']+)'", chunk)
        if not m:
            continue

        def field(key):
            fm = re.search(rf"\b{key}: '([^']*)'", chunk)
            return fm.group(1) if fm else None

        tags_m = re.search(r'tags: \[([^\]]*)\]', chunk)
        tags = re.findall(r"'([^']+)'", tags_m.group(1)) if tags_m else []
        meta[m.group(1)] = {
            'title': field('title'),
            'desc': field('desc'),
            'tags': tags,
        }
    return meta


def parse_md_meta(slug: str) -> dict | None:
    p = KNOWLEDGE_DIR / f'{slug}.md'
    if not p.exists():
        return None
    text = p.read_text(encoding='utf-8')
    if not text.startswith('---'):
        return None
    fm = text.split('---', 2)[1]
    out = {}
    for key in ('title', 'description'):
        m = re.search(rf'^{key}: (.+)$', fm, re.M)
        out[key] = m.group(1).strip() if m else None
    h1 = re.search(r'^# (.+)$', fm, re.M)
    out['h1'] = h1.group(1).strip() if h1 else None
    return out


def main() -> int:
    ts = parse_ts_meta()
    if not ts:
        print('[seo_meta] config/knowledge.ts 里没解析出任何条目，先检查文件格式')
        return 1

    problems = []
    for slug, m in sorted(ts.items()):
        md = parse_md_meta(slug)
        if md is None:
            problems.append(f'{slug}: 缺少 docs/knowledge/{slug}.md')
            continue

        title = md['title'] or ''
        desc = md['description'] or ''

        if not title:
            problems.append(f'{slug}: frontmatter 缺 title')
        if not desc:
            problems.append(f'{slug}: frontmatter 缺 description')

        if title and len(title) > TITLE_MAX:
            problems.append(f'{slug}: title {len(title)} 字，超出 {TITLE_MAX}（{title}）')
        if desc and len(desc) > DESC_MAX:
            problems.append(f'{slug}: description {len(desc)} 字，超出 {DESC_MAX}')

        for w in BANNED_TITLE_WORDS:
            if title and w in title:
                problems.append(f'{slug}: title 含规范禁用词「{w}」（{title}）')

        # md 的 title / H1 与 knowledge.ts 三处必须一致
        if m['title'] and title != m['title']:
            problems.append(
                f'{slug}: title 与 config/knowledge.ts 不一致\n'
                f'    md: {title}\n    ts: {m["title"]}'
            )
        if md['h1'] and md['h1'] != title:
            problems.append(
                f'{slug}: H1 与 frontmatter title 不一致\n'
                f'    H1:  {md["h1"]}\n    title: {title}'
            )

        if len(m['tags']) < 3:
            problems.append(
                f'{slug}: tags 只有 {len(m["tags"])} 个，per-page keywords 会过薄'
                f'（至少 3 个）'
            )

    if problems:
        print(f'[seo_meta] {len(problems)} 项未通过：')
        for p in problems:
            print(f'  - {p}')
        return 1

    print(f'[seo_meta] {len(ts)} 篇知识库文章元信息全部通过'
          f'（title ≤ {TITLE_MAX} 字 / description ≤ {DESC_MAX} 字 / tags ≥ 3）')
    return 0


if __name__ == '__main__':
    sys.exit(main())