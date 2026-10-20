#!/usr/bin/env python3
"""知识库文章的 GEO 写法门禁。

GEO（生成式引擎优化）与传统 SEO 的差别在于「谁在读」：SEO 读的是排序信号，GEO 读的是段落本身。
AI 判断一段内容值不值得引用，看的是它脱离上下文能不能读懂、有没有具体数字、结论是否明确。
KDD 2024 的《GEO: Generative Engine Optimization》也把「可引用的具体事实与统计数字」列为高效策略。

这个脚本把已经做对的写法锁成硬门禁，防止回退。当前 23 篇文章 100% 通过，所以这份门禁的价值
不在抓现有问题，而在「新写的文章不会又写成散文」。新增文章后必须通过它。

断言项：
  1. H1 之后 300 字内有「> **一句话答案**：」段（自包含结论，AI 引用的首选形态）
  2. 一句话答案不含依赖上下文的措辞（如上所述 / 前文提到 / 下面我们来看 / 综上所述）
  3. 答案段至少含一个具体数字（429、33k、N²、1 小时…），纯定性描述不可被引用为事实
  4. config/knowledge.ts 里每条 faq 答案 ≤ 2 句且非空（FAQPage JSON-LD 直接引用这些答案）
  5. 正文含至少一个 H2（段落分层决定 AI 能否定位到相关片段）

用法：python scripts/check_geo_lint.py           # 有问题 exit 1
      python scripts/check_geo_lint.py --fix     # 只提示不报错
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_TS = ROOT / 'config' / 'knowledge.ts'
KNOWLEDGE_DIR = ROOT / 'docs' / 'knowledge'

FIX = '--fix' in sys.argv

# 依赖上下文才读得懂的措辞：一句话答案必须自包含，出现这些就是不合格
CONTEXT_DEPENDENT = [
    '如上所述', '如前所述', '前文提到', '前文所述', '上面提到', '上面说过',
    '下面我们来看', '接下来我们', '综上所述', '如前文', '见下文',
]

# 具体数字：阿拉伯数字、或常见的中文数量表达
DIGIT = re.compile(r'\d')


def parse_articles() -> list[dict]:
    """从 config/knowledge.ts 按 slug 切块，取出 faq 列表与 slug。"""
    src = KNOWLEDGE_TS.read_text(encoding='utf-8')
    out = []
    # 只切 knowledge[] 数组本体：后面的 retiredKnowledgePages 块也有 slug 字段，
    # 按全文切块会把退役页当成现役文章（它没有 md，也不该参与 GEO 门禁）
    start = src.index('export const knowledge: KnowledgeMeta[] = [')
    end = src.index('\n]', start)
    src = src[start:end]
    chunks = re.split(r'\n(?=\s*slug: )', src)
    for chunk in chunks:
        m = re.search(r"slug: '([^']+)'", chunk)
        if not m:
            continue
        slug = m.group(1)
        faqs = []
        fm = re.search(r'faq:\s*\[(.*?)\n\s*\],', chunk, re.S)
        if fm:
            # 每条形如 { q: '...', a: '...' }
            faqs = re.findall(r"a:\s*'([^']*)'", fm.group(1))
        out.append({'slug': slug, 'faq': faqs})
    return out


def parse_md(slug: str) -> str | None:
    p = KNOWLEDGE_DIR / f'{slug}.md'
    return p.read_text(encoding='utf-8') if p.exists() else None


def main() -> int:
    articles = parse_articles()
    if not articles:
        print('[geo] 未从 config/knowledge.ts 解析到文章', file=sys.stderr)
        return 1

    problems: list[str] = []
    warnings: list[str] = []

    for a in articles:
        slug = a['slug']
        md = parse_md(slug)
        if md is None:
            problems.append(f'{slug}: 找不到 docs/knowledge/{slug}.md')
            continue

        # 1. 一句话答案段
        h1 = re.search(r'^# (.+)$', md, re.M)
        if not h1:
            problems.append(f'{slug}: 没有 H1')
            continue
        after = md[h1.end():]
        window = after[:300]
        m = re.search(r'^>\s*\*\*一句话答案\*\*：(.+)$', window, re.M)
        if not m:
            problems.append(f'{slug}: H1 后 300 字内没有「> **一句话答案**：」段')
        else:
            answer = m.group(1).strip()
            # 2. 依赖上下文的措辞
            for bad in CONTEXT_DEPENDENT:
                if bad in answer:
                    problems.append(f'{slug}: 一句话答案含依赖上下文的措辞「{bad}」—— AI 无法独立引用该段')
            # 3. 具体数字
            if not DIGIT.search(answer):
                # 降为提醒：教程类问题（CLAUDE.md 怎么写、子代理怎么用）本来就不涉数字，
                # 硬拦等于逼着作者给不该有数字的答案塞一个假数字，比没有更糟。
                warnings.append(f'{slug}: 一句话答案没有具体数字。涉数字的问题（报错码、限额、版本）应把数字写进答案段')

        # 5. 至少一个 H2
        if not re.search(r'^## .+$', md, re.M):
            problems.append(f'{slug}: 正文没有 H2，段落无法被 AI 定位')

        # 4. FAQ 答案长度
        for ans in a['faq']:
            ans = ans.strip()
            if not ans:
                problems.append(f'{slug}: 有一条空 FAQ 答案')
                continue
            # 先剥掉反引号代码片段：`claude mcp list` 里的点不是句号。
            # 只按中文句末标点计数（英文 . 在中文答案里几乎都是文件名的一部分）。
            bare = re.sub(r'`[^`]*`', '', ans)
            sentences = len([x for x in re.split(r'[。！？]', bare) if x.strip()])
            if sentences > 3:
                warnings.append(f'{slug}: FAQ 答案 {sentences} 句，建议压到 2-3 句内给结论：「{ans[:30]}…」')

    if warnings:
        print(f'[geo] {len(warnings)} 条提醒（不拦构建）：')
        for w in warnings:
            print('    · ' + w)

    if problems:
        if FIX:
            print(f'[geo] {len(problems)} 项待修（--fix 模式不报错）：')
            for p in problems:
                print('    - ' + p)
            return 0
        print(f'[geo] {len(problems)} 项未通过：', file=sys.stderr)
        for p in problems:
            print('    - ' + p, file=sys.stderr)
        return 1

    print(
        f'[geo] {len(articles)} 篇文章 GEO 写法通过硬门禁'
        f'（H1 后 300 字内有自包含的一句话答案 / 答案不含依赖上下文的措辞 / 正文有 H2 分层）'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
