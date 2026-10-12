"""生成知识库分享卡片（Open Graph）：public/og/knowledge.png 与 public/og/knowledge_<slug>.png，1200x630。

用法：python scripts/gen_knowledge_og.py
依赖：Pillow。字体与 gen_og.py 一致。文章列表从 config/knowledge.ts 解析（与 gen_knowledge_routes.mjs、
verify_build.py 同源）：条目以「两空格缩进的 { 独占一行」开头，slug 是条目的第一个字段，其余字段按名字在条目内查找。
副标题用 summary（≤60 字短摘要），不填回落 desc。
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_og import draw_page  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
KNOWLEDGE_TS = os.path.join(ROOT, 'config', 'knowledge.ts')
B = chr(92)  # 需要在 Python 字符串里写正则反斜杠时用它拼
ENTRY_SEP = re.compile(r'(?m)^  ' + B + '{' + B + 's*$')  # 条目分隔：两空格缩进的 { 独占一行
SLUG_RE = re.compile(B + "s*slug: '([^']+)'")


def load_articles():
    t = open(KNOWLEDGE_TS, encoding='utf-8').read()
    body = t[t.index('export const knowledge: KnowledgeMeta[] = ['):]
    out = []
    for part in ENTRY_SEP.split(body)[1:]:
        sm = SLUG_RE.match(part)
        if not sm:
            continue
        slug = sm.group(1)

        def pick(name, rx=part):
            m = re.search(r"^" + B + "s*%s:" % name + B + "s*'([^']*)'", rx, re.M)
            return m.group(1) if m else ''

        title, desc, date = pick('title'), pick('desc'), pick('date')
        if not title or not desc or not date:
            sys.exit('[og] %s 缺少 title/desc/date；config/knowledge.ts 的条目首字段应为 slug' % slug)
        out.append({
            'slug': slug, 'cat': pick('cat'), 'title': title, 'desc': desc, 'date': date,
            'summary': pick('summary') or desc,
            'kicker': pick('kicker'),
            'minutes': int(pick('minutes') or 5),
        })
    if not out:
        sys.exit('[og] 未从 config/knowledge.ts 解析到文章')
    return out


PAGES = [
    ('knowledge', 'Claude 知识库', ['Claude Code 的用法、原理、成本与报错排查，按主题查。', '按四个主题分类。'], '按主题查', ['上手', '原理', '成本', '排错']),
]
for k in load_articles():
    desc = k['summary'][:60] + ('…' if len(k['summary']) > 60 else '')
    PAGES.append((
        "knowledge_%s" % k['slug'],
        k['title'],
        [desc],
        "知识库 · %s" % k['kicker'],
        ["约 %d 分钟" % k['minutes']],
    ))

if __name__ == '__main__':
    # 自检：文案里出现品牌词被替换后的占位（例如把 Claude 替成 The 的残骸）时直接报错，避免同类污染进入图片
    for _slug, _title, _sub, _eyebrow, _chips in PAGES:
        for _text in (_title, _eyebrow) + tuple(_sub) + tuple(_chips):
            if 'The' in _text:
                sys.exit('[og] %s 的文案里出现占位词 The：%s' % (_slug, _text))
    for slug, title, sub, eyebrow, chips in PAGES:
        draw_page(slug, title, sub, eyebrow, chips)
    sys.exit(0)
