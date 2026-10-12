# -*- coding: utf-8 -*-
"""按 config/knowledge_sources.ts 把源站原文逐字复制到 archive/knowledge_source_20261009/<slug>/。

用法：
  python scripts/gen_sources.py            # 生成
  python scripts/gen_sources.py --check    # 只校验（archive 与源站不一致则以非 0 退出）

约定（见 .claude/plans/polymorphic-questing-brook.md F 节）：
- 只做「读源站 -> 写 archive」，不做任何字符串替换；源文件缺失或 URL 不一致直接报错，绝不写入被替换过的内容。
- 源站素材在仓库根 temp/aiprimetech_site/（gitignored），运行前先复制到 site/temp/aiprimetech_site/。
- 每个源文件去掉顶部 4 行元信息头（URL/TITLE/H1/DESC），正文原样写入；
  多文件时每个文件前加一行「===== <相对路径>（<语言>，<标题>） =====」分隔。
- 索引摘要（index）来自 knowledge_sources.ts 的 index 字段（all_summaries.md 的中文摘要原文，
  中文版页面用源文件 DESC），单独写成 _index.md 供后续核对，不参与一致性比对。
"""
import argparse
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE_URL = 'https://aiprimetech.io'
CRAWL_CANDIDATES = [
    os.path.join(ROOT, 'temp', 'aiprimetech_site'),                        # site/temp/（推荐）
    os.path.abspath(os.path.join(ROOT, '..', 'temp', 'aiprimetech_site')),  # 仓库根 temp/
]
ARCHIVE = os.path.join(ROOT, 'archive', 'knowledge_source_20261009')
SOURCES_TS = os.path.join(ROOT, 'config', 'knowledge_sources.ts')

LANGS = {'en', 'zh'}

RE_ENTRY = re.compile(r"(?m)^  \{\s*$")
RE_SLUG = re.compile(r"\s*slug:\s*'([^']+)'")
RE_FIELD = lambda name: re.compile(r"^\s*%s:\s*'([^']*)'" % name, re.M)
RE_FILE = re.compile(
    r"path:\s*'([^']+)',\s*url:\s*(`[^`]+`|'[^']+'),\s*title:\s*'([^']*)',\s*section:\s*'([^']+)',\s*lang:\s*'([^']+)'"
    r"(?:,\s*titleZh:\s*'([^']*)')?"
)
RE_URL_HEAD = re.compile(r'^# URL: (\S+)\s*$', re.M)
RE_META_HEAD = re.compile(r'\A(?:# (?:URL|TITLE|H1|DESC):.*\n)+\n?')


def crawl_root():
    for d in CRAWL_CANDIDATES:
        if os.path.isdir(os.path.join(d, 'pages')):
            return d
    sys.exit('[sources] 未找到源站素材，请先把 ../../temp/aiprimetech_site/ 复制到 site/temp/aiprimetech_site/')


def declared_url(expr, site_template):
    """把 files[].url 还原成字面量 URL：字面量直接用；`${SITE}/x` 用文件里 SITE 常量拼接。"""
    if not expr.startswith('`'):
        return expr.strip("'")
    m = re.fullmatch(r'\$\{SITE\}(/.*)', expr[1:-1])
    if not m:
        sys.exit('[sources] url 模板只允许 ${SITE}/...：%s' % expr)
    if not site_template:
        sys.exit('[sources] config/knowledge_sources.ts 缺少 SITE 常量')
    return site_template + m.group(1)


def parse_sources():
    """解析 config/knowledge_sources.ts（格式固定，用正则而非执行 TS）。"""
    src = open(SOURCES_TS, encoding='utf-8').read()
    site_template = (re.search(r"const SITE = '([^']+)'", src) or [None, ''])[1]
    entries = []
    # 以「两空格缩进的 { 独占一行」作为条目边界；每个条目第一行是 slug
    for part in RE_ENTRY.split(src)[1:]:
        sm = RE_SLUG.match(part)
        if not sm:
            continue
        slug = sm.group(1)
        fetched_at = RE_FIELD('fetchedAt').search(part)
        index = RE_FIELD('index').search(part)
        if not fetched_at:
            sys.exit('[sources] %s 缺少 fetchedAt' % slug)
        files = []
        for fm in RE_FILE.finditer(part):
            if fm.group(5) not in LANGS:
                sys.exit('[sources] %s 的 lang 只允许 en/zh：%s' % (slug, fm.group(5)))
            files.append(dict(path=fm.group(1), url=fm.group(2), title=fm.group(3),
                              section=fm.group(4), lang=fm.group(5), titleZh=fm.group(6) or ''))
        # files 为空 = 原创文章（素材来自站内调研而非源站页面），允许通过并跳过 archive 生成
        entries.append(dict(slug=slug, fetchedAt=fetched_at.group(1),
                            index=index.group(1) if index else '', files=files))
    if not entries:
        sys.exit('[sources] 未从 config/knowledge_sources.ts 解析到条目')
    slugs = [e['slug'] for e in entries]
    if len(set(slugs)) != len(slugs):
        sys.exit('[sources] 存在重复 slug')
    return entries, site_template


def read_source(crawl, rel, url_expr, site_template):
    """读源文件正文（去掉顶部 4 行元信息头），并核对 URL 属于源站、且与 knowledge_sources.ts 声明一致。"""
    p = os.path.join(crawl, 'pages', rel)
    if not os.path.isfile(p):
        sys.exit('[sources] 源文件缺失：%s' % p)
    text = open(p, encoding='utf-8').read()
    m = RE_URL_HEAD.search(text)
    if not m:
        sys.exit('[sources] 源文件缺少 URL 头：%s' % p)
    if not m.group(1).startswith(SITE_URL):
        sys.exit('[sources] 源 URL 不属于 %s：%s' % (SITE_URL, m.group(1)))
    want = declared_url(url_expr, site_template)
    if want and want != m.group(1):
        sys.exit('[sources] %s 声明的 url（%s）与源文件头（%s）不一致' % (rel, want, m.group(1)))
    return m.group(1), RE_META_HEAD.sub('', text).lstrip('\n')


def build(entries, crawl, site_template):
    out = {}
    for e in entries:
        if not e['files']:
            print('[sources] WARN %-38s 未登记源站页面（原创文章），跳过 archive 生成' % e['slug'])
            continue
        chunks, urls = [], []
        for f in e['files']:
            url, body = read_source(crawl, f['path'], f['url'], site_template)
            urls.append(url)
            label = '%s（%s，%s）' % (f['path'], f['lang'], f['titleZh'] or f['title'])
            chunks.append('===== %s =====\n%s\n' % (label, body.rstrip('\n')))
        index_md = (
            '# 源站索引摘要 · %s\n\n'
            '- 源站：%s\n- 抓取日期：%s\n- 源栏目：%s\n- 源页面：%s\n\n## %s\n\n%s\n'
            % (e['slug'], SITE_URL, e['fetchedAt'],
               '、'.join(dict.fromkeys(f['section'] for f in e['files'])),
               '、'.join(urls),
               e['files'][0]['titleZh'] or e['files'][0]['title'],
               e['index'] or '（无摘要）')
        )
        out[e['slug']] = dict(files_txt=('\n'.join(chunks)).rstrip('\n') + '\n', index_md=index_md)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='只校验，不写文件')
    args = ap.parse_args()

    crawl = crawl_root()
    entries, site_template = parse_sources()
    built = build(entries, crawl, site_template)

    fails = 0
    for slug, data in built.items():
        d = os.path.join(ARCHIVE, slug)
        ft, im = os.path.join(d, '_source_files.txt'), os.path.join(d, '_index.md')
        old_ft = open(ft, encoding='utf-8').read() if os.path.isfile(ft) else None
        if old_ft == data['files_txt']:
            print('[sources] OK   %-38s %d 个源文件，与 archive 一致' % (slug, data['files_txt'].count('===== ')))
            continue
        if args.check:
            print('[sources] DIFF %-38s archive 缺失或与源站不一致' % slug)
            fails += 1
            continue
        os.makedirs(d, exist_ok=True)
        open(ft, 'w', encoding='utf-8', newline='\n').write(data['files_txt'])
        open(im, 'w', encoding='utf-8', newline='\n').write(data['index_md'])
        print('[sources] 写入 %s（%d 个源文件）' % (os.path.relpath(d, ROOT), data['files_txt'].count('===== ')))
    if fails:
        sys.exit('[sources] %d 个条目的原文与源站不一致，先跑 python scripts/gen_sources.py' % fails)


if __name__ == '__main__':
    main()