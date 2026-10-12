"""下载知识库文章的封面图，并回写 config/knowledge.ts 的 cover 字段。

用法：
  python scripts/fetch_knowledge_covers.py           # 下载缺失的封面并回写 cover 字段
  python scripts/fetch_knowledge_covers.py --check   # 只校验，不写文件（CI / 本地核对用）

封面地址来自 config/knowledge_sources.ts：取每个 slug 的 files[] 里 section === '/blog/' 的源页面，
把 URL 末段拼成 https://aiprimetech.io/blog/heroes/<末段>.jpg。一个 slug 对多个 /blog/ 源页时按
files[] 顺序逐个尝试，HEAD 校验 Content-Type 是 image/jpeg 后才 GET，命中即止。

没有 /blog/ 源页的文章（files: []，如从官方文档或搜索结果整理的两篇），urls 为空，
改从 config/knowledge_cover_map.json 里指定的素材站封面名取图（本地 temp/aiprimetech_covers/<名>.jpg）。

落盘位置：public/knowledge/<slug>.jpg（静态目录，copy_public.mjs 会原样复制到 dist/knowledge/）。
回写位置：config/knowledge.ts 的 KnowledgeMeta，插在 kicker 之后，写成站点根相对路径 '/knowledge/<slug>.jpg'。

版权说明：这些封面图版权归 aiprimetech.io（https://aiprimetech.io）所有，本项目只用它们做
文章卡片的氛围配图，正文全部是中文原创改写（见 config/knowledge.ts 文件头）。

无封面可下的 slug 不写 cover 字段，KnowledgeTile 卡片自动退化成无图的纯文字卡。
"""
import os
import json
import re
import shutil
import subprocess
import sys
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCES_TS = os.path.join(ROOT, 'config', 'knowledge_sources.ts')
KNOWLEDGE_TS = os.path.join(ROOT, 'config', 'knowledge.ts')
COVER_MAP_PATH = os.path.join(ROOT, 'config', 'knowledge_cover_map.json')
LOCAL_COVERS_DIR = os.path.join(ROOT, 'temp', 'aiprimetech_covers')
OUT_DIR = os.path.join(ROOT, 'public', 'knowledge')
SITE = 'https://aiprimetech.io'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) knowledge-cover-fetcher/1.0'
B = chr(92)  # 在 Python 字符串里拼正则反斜杠用

# 条目以 `  {` + slug 行开头，slug 行前可能有注释行；条目到下一个 `  {` 之前结束
ENTRY_RE = re.compile(r"(?ms)^  \{\n(?:    //[^\n]*\n)*    slug: '([^']+)',.*?^  \},\n")
FILEURL_RE = re.compile(r"url: `?\$\{SITE\}(/blog/[^'\`]+)`?")


def slug_block_urls(text):
    """slug -> 该 slug 的 /blog/ 源页面 URL 列表（按 files[] 顺序）"""
    out = {}
    for m in ENTRY_RE.finditer(text):
        slug = m.group(1)
        out[slug] = FILEURL_RE.findall(m.group(0))
    return out


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.headers.get('Content-Type', ''), r.read()


_CURL = shutil.which('curl')


def fetch_via_curl(url):
    """本机直连 aiprimetech.io 被拒（WinError 10061）但 curl 经本机代理可通，故失败两次后把 curl 作为下载后端。"""
    p = subprocess.run(
        [_CURL, '-sSL', '--max-time', '40', '-A', UA, '-D', '-', url],
        capture_output=True, timeout=60,
    )
    if p.returncode != 0:
        raise RuntimeError('curl 退出码 %d' % p.returncode)
    raw = p.stdout
    head, sep, body = raw.partition(B'\r\n\r\n')
    if not sep:
        head, sep, body = raw.partition(b'\n\n')
    headers = head.decode('latin-1', 'replace').lower()
    ctype = ''
    for line in headers.splitlines():
        if line.startswith('content-type:'):
            ctype = line.split(':', 1)[1].strip()
    return ctype, body


def fetch_auto(url):
    try:
        return fetch(url)
    except Exception as e:
        if not _CURL:
            raise
        try:
            return fetch_via_curl(url)
        except Exception:
            raise e


def covers_in_ts():
    """slug -> cover 值；必须逐条目找，跨条目匹配会把 cover 贴到上一个 slug 上。"""
    text = open(KNOWLEDGE_TS, encoding='utf8').read()
    body = text[text.index('export const knowledge: KnowledgeMeta[] = ['):]
    out = {}
    for m in ENTRY_RE.finditer(body):
        cm = re.search(r"cover: '([^']+)'", m.group(0))
        if cm:
            out[m.group(1)] = cm.group(1)
    return out


def main():
    check_only = '--check' in sys.argv
    if not os.path.isdir(OUT_DIR):
        if check_only:
            sys.exit('[cover] public/knowledge/ 不存在：先跑一次不带 --check 的下载')
        os.makedirs(OUT_DIR, exist_ok=True)

    slugs = slug_block_urls(open(SOURCES_TS, encoding='utf8').read())
    have = covers_in_ts()
    cover_map = {}
    if os.path.exists(COVER_MAP_PATH):
        with open(COVER_MAP_PATH, encoding='utf8') as f:
            cover_map = json.load(f).get('covers', {})
    # 源条目里 files 为空的文章不会出现在 slugs 里（没有 /blog/ 源页），
    # 它们只能靠 cover map 取图，按 knowledge.ts 的条目补进来，避免永远取不到
    for slug in have:
        slugs.setdefault(slug, [])
    saved, skipped, missing = [], [], []

    for slug, urls in slugs.items():
        dest = os.path.join(OUT_DIR, slug + '.jpg')
        if os.path.exists(dest) and have.get(slug) == '/knowledge/%s.jpg' % slug:
            skipped.append(slug)
            continue
        if cover_map.get(slug) and not urls:
            src = os.path.join(LOCAL_COVERS_DIR, cover_map[slug] + '.jpg')
            if os.path.exists(src):
                if not check_only:
                    with open(src, 'rb') as fi, open(dest, 'wb') as fo:
                        fo.write(fi.read())
                saved.append(slug)
                print('  [ok] %s <- cover map 本地素材 %s' % (slug, src))
                continue
            print('  [x] %s <- cover map 指向的素材不存在：%s' % (slug, src))
        for u in urls:
            img = SITE + '/blog/heroes/' + u.rstrip('/').rsplit('/', 1)[-1] + '.jpg'
            try:
                ctype, body = fetch_auto(img)
            except Exception as e:
                print('  [x] %s <- %s (%s)' % (slug, img, e))
                continue
            if 'image/jpeg' not in ctype or len(body) < 4000:
                print('  [x] %s <- %s 不是 jpeg 或过小（%s, %dB）' % (slug, img, ctype, len(body)))
                continue
            if not check_only:
                with open(dest, 'wb') as f:
                    f.write(body)
            saved.append(slug)
            print('  [ok] %s <- %s (%dKB)' % (slug, img, len(body) // 1024))
            break
        else:
            missing.append(slug)

    if not check_only:
        text = open(KNOWLEDGE_TS, encoding='utf8').read()
        n = 0
        for slug in saved:
            if have.get(slug):
                continue
            # 插在该条目的 slug 行之后、cover 字段之前，保持条目顺序
            pat = re.compile(r"(slug: '" + re.escape(slug) + r"',\n(?:\s*[^\n]*\n)*?)(\s*)kicker:", re.M)
            m = pat.search(text)
            if not m:
                continue
            line = "%scover: '/knowledge/%s.jpg',\n" % (m.group(2), slug)
            text = text[:m.end(1)] + line + text[m.end(1):]
            n += 1
        if n:
            open(KNOWLEDGE_TS, 'w', encoding='utf8', newline='').write(text)
    print('[cover] 回写 cover 字段 %d 条' % n if not check_only else '[cover] --check 模式不写文件')
    print('[cover] 新增 %d / 已有 %d / 未找到 %d' % (len(saved), len(skipped), len(missing)))
    if missing:
        print('[cover] 未找到封面的 slug：%s' % ', '.join(sorted(missing)))
    if check_only and missing:
        sys.exit(1)


if __name__ == '__main__':
    main()