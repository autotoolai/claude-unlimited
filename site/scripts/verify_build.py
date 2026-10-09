"""
把构建产物抽到临时根目录，按 Pages cleanUrls 起服务，跑 SEO / 购买按钮 / 组件 / 助手语料验收。
srcDir='docs' 时条目页产物直接在 dist 根（index.html / pricing.html ...），与 Cloudflare Pages 的路由一致。

用法：npm run build && python scripts/verify_build.py [port]

临时目录建在 site/temp/ 下并全程用绝对路径解析：系统 TEMP 路径本身就长，
再叠加文件名容易触碰 Windows MAX_PATH，表现为「文件存在但 os.path.isfile 为 False」。
"""
import os
import re
import shutil
import sys
import tempfile
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))  # 不受运行时 chdir 影响
DIST = os.path.join(SITE, '.vitepress', 'dist')
PAGES = ['/', '/pricing', '/unlimited', '/faq', '/guide', '/guide/clients', '/guide/models', '/guide/ccswitch']  # cleanUrls=false 时条目页是 /guide/clients.html、总览是 /guide.html，Handler 两种路径都接受
SHOP_URL = 'https://catfk.com/shop/VDR8ZBW9'
H1_RE = re.compile(r'<' + 'h1')


def stage_dist():
    """把 dist 复制到临时根目录，返回绝对路径。"""
    if not os.path.isdir(DIST) or not os.path.isfile(os.path.join(DIST, 'index.html')):
        sys.exit('未找到 dist/index.html，请先 npm run build（srcDir 配错也会走这里）')
    tmp_base = os.path.join(SITE, 'temp')
    os.makedirs(tmp_base, exist_ok=True)
    root = os.path.abspath(tempfile.mkdtemp(prefix='cv_', dir=tmp_base))
    for name in os.listdir(DIST):
        s, d = os.path.join(DIST, name), os.path.join(root, name)
        shutil.copytree(s, d) if os.path.isdir(s) else shutil.copy2(s, d)
    return root


class Handler(BaseHTTPRequestHandler):
    """/pricing -> /pricing.html（Pages cleanUrls），/ -> /index.html。所有路径判定都用绝对路径。"""

    root = ''

    def _find(self, path):
        rel = path.lstrip('/')
        if not rel:
            return 'index.html'
        p = os.path.join(self.root, rel)
        if os.path.isfile(p):
            return rel
        for cand in (rel + '.html', os.path.join(rel, 'index.html')):
            if os.path.isfile(os.path.join(self.root, cand)):
                return cand
        return '404.html'

    def do_GET(self):
        f = os.path.join(self.root, self._find(self.path))
        try:
            data = open(f, 'rb').read()
        except OSError:
            self.send_error(404)
            return
        ctype = 'text/html; charset=utf-8'
        if f.endswith('.js'):
            ctype = 'text/javascript'
        elif f.endswith('.css'):
            ctype = 'text/css'
        elif f.endswith('.svg'):
            ctype = 'image/svg+xml'
        elif f.endswith('.txt'):
            ctype = 'text/plain; charset=utf-8'
        elif f.endswith('.xml'):
            ctype = 'application/xml; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


def get(base, path):
    with urllib.request.urlopen(base + path) as r:
        return r.status, r.read()


def main():
    root = stage_dist()
    Handler.root = root
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4199
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{port}'
    print(f'[verify] 服务已启动 {base}（产物副本 {root}）\n')

    fails = []

    def check(label, ok, detail=''):
        print(('  OK   ' if ok else '  FAIL ') + label + (f'  {detail}' if detail else ''))
        if not ok:
            fails.append(label)

    pages = {}
    print('路由与静态资源')
    for u in PAGES + ['/robots.txt', '/sitemap.xml', '/llms.txt', '/favicon.svg', '/_headers']:
        st, raw = get(base, u)
        pages[u] = raw
        body = raw.decode('utf-8', errors='ignore')
        # 真实页面标题带站名，404 页标题是「404 | 站名」；用标题判定比找布局 class 稳
        titles = re.findall(r'<title>([^<]*)</title>', body)
        is_real = (not u.endswith('.html')) or (bool(titles) and not titles[0].startswith('404') and not titles[0].startswith('页面不存在'))
        check(f'{u:16} {st}', st == 200 and is_real, '' if is_real else f'实际标题 {titles[:1]}')

    print('\nOG 图（社交分享卡片）')
    for slug in ['home', 'pricing', 'unlimited', 'faq']:  # 教程页暂不出 OG 图，沿用 home
        try:
            st, raw = get(base, f'/og/{slug}.png')
            ok = st == 200 and raw.startswith(b'\x89PNG')
        except Exception:
            ok = False
        check(f'/og/{slug}.png 是 PNG', ok, '缺失：先跑 npm run gen:og' if not ok else '')

    h = pages['/'].decode('utf-8')
    print('\n首页 SEO 与购买按钮')
    check('唯一 title', len(re.findall(r'<title>', h)) == 1, (re.findall(r'<title>([^<]*)</title>', h) or ['?'])[0])
    # H1 只统计 PageShell 正文里的（cu-shell 之前若有默认外壳节点则不计入）
    shell_h1 = len(re.findall(r'<h1', h[h.find('class="cu-shell"'):]))
    check('唯一 h1', shell_h1 == 1, f'外壳内 {shell_h1} 个 / 全文 {len(re.findall(H1_RE, h))} 个')
    check('canonical', bool(re.search(r'<link rel="canonical" href="https://[^/]+/"', h)))
    check('og:title / og:description / og:image / og:url', all(f'property="og:{k}"' in h for k in ['title', 'description', 'image', 'url']), str(re.findall(r'property="og:(title|description|image|url)" content="([^"]*)"', h)))
    check('twitter:card', 'name="twitter:card"' in h)
    # 只统计 CTA 按钮（cu-btn 类），FAQ 正文里的「前往下单页」是正文链接，不要求埋点
    buttons = re.findall(r'<a class="[^"]*cu-btn[^"]*"[^>]*href="' + re.escape(SHOP_URL) + r'"[^>]*>', h)
    check('CTA 按钮至少 3 处（Hero / 套餐卡 / 底部 CTA）', len(buttons) >= 3, f'实际 {len(buttons)}')
    check('CTA 按钮均 target=_blank + rel=noopener sponsored nofollow', all('target="_blank"' in b and 'rel="noopener sponsored nofollow"' in b for b in buttons))
    ctas = [re.findall(r'data-cta="([^"]*)"', b) for b in buttons]
    check('CTA 按钮均带非空 data-cta', all(len(c) == 1 and c[0] for c in ctas), str(ctas))
    text_links = re.findall(r'<a(?! class=)[^>]*href="' + re.escape(SHOP_URL) + r'"[^>]*>', h)
    check('正文下单链接同样带 rel', all('rel="noopener sponsored nofollow"' in a for a in text_links), f'{len(text_links)} 处')

    print('\n各页')
    for u in PAGES:
        x = pages[u].decode('utf-8')
        title = re.findall(r'<title>([^<]*)</title>', x)
        shell_x = x[x.find('class="cu-shell"'):]
        check(f'{u:12} 唯一 h1', len(re.findall(H1_RE, shell_x)) == 1, f'外壳内 {len(re.findall(H1_RE, shell_x))} 个；title={title[0] if title else "?"}')
        check(f'{u:12} description', 'name="description"' in x)
        check(f'{u:12} canonical', '<link rel="canonical"' in x)
        shell_keys = ['cu-brandbar', 'cu-tabs', 'cu-sidenav'] + ([] if u == '/' else ['cu-page__head'])
        check(f'{u:12} 页面外壳（品牌页头 + 导航条 + 页内目录）', all(k in x for k in shell_keys))
        check(
            f'{u:12} 无 VitePress 默认外壳残留',
            not any(k in x for k in ['class="VPDocAside', 'class="VPFooter', 'class="VPSidebar']),
            'VPNavBar / VPLocalNav 由 custom.css 兜底隐藏，SSR 产物里仍存在',
        )
        check(f'{u:12} 页面正文有 SSR 内容（不是空壳）', len(x) > 8000, f'{len(x)} 字节')
        check(f'{u:12} 无 SSR 报错占位（__vitepress_fn / [object Object]）', '__vitepress_fn' not in x and '[object Object]' not in x)
        check(f'{u:12} 无 SSR 注释标记', '<!--[-->' not in x and '<!---->' not in x)
        check(f'{u:12} 无未渲染的模板（<template> / &lt;Component）', '<template>' not in x and '&lt;HomeHero' not in x and '&lt;ClientOnly' not in x)
        check(f'{u:12} 无 markdown 降级为 <pre><code> 的正文', '<pre><code>&lt;' not in x and '<pre><code><h2' not in x)
        # 页内目录项都要有对应锚点，否则点了没反应
        links = re.findall(r'class="cu-sidenav"[\s\S]*?</aside>', x)
        # 页内目录锚点对应正文小节：普通小节是 <h2 id="…">，FAQ 分类是 <section id="cat-…">（h2 无 id）
        ids = re.findall(r'<h2 id="([^"]+)"|(?<=<section id=")([^"]+)"', x)
        ids = [a or b for a, b in ids]
        hrefs = re.findall(r'<a[^>]+href="#([^"]+)"', links[0]) if links else []
        check(f'{u:12} 页内目录锚点全部命中', bool(hrefs) and set(hrefs) <= set(ids), f'目录 {len(hrefs)} 项 / 页面 h2 {len(ids)} 个，缺失 {set(hrefs) - set(ids)}')

    print('\n组件渲染')
    check(
        '首页：Hero + 卖点卡 6 + 步骤 4 + 数据条 4 + 对比表 + FAQ 6',
        all(k in h for k in ['cu-hero', 'cu-card', 'cu-step', 'cu-stat', 'cu-table', 'cu-faq__item']),
        f'cards={len(re.findall(r"class=.cu-card.", h))} steps={len(re.findall(r"cu-step.b", h))} stats={len(re.findall(r"cu-stat.b", h))}',
    )
    check('首页：成本对比示意图已内联', 'cu-figs' in h and '<svg' in h)
    pricing = pages['/pricing'].decode('utf-8')
    check(
        '定价页：套餐卡 + 2 表 + 9 FAQ',
        'cu-price-card' in pricing and pricing.count('<table') == 2 and len(re.findall('cu-faq__item', pricing)) == 9,
        f'card={"cu-price-card" in pricing} tables={pricing.count("<table")} faq={len(re.findall("cu-faq__item", pricing))}',
    )
    faq = pages['/faq'].decode('utf-8')
    check(
        'FAQ 页：33 条 + 7 个分类锚点',
        len(re.findall('cu-faq__item', faq)) == 33 and len(set(re.findall(r'id="cat-([a-z]+)"', faq))) == 7,
        f'faq={len(re.findall("cu-faq__item", faq))} anchors={len(set(re.findall(r"id=.cat-([a-z]+)", faq)))}',
    )
    check('FAQ 页：答案里没有残留 Markdown 语法', not re.search(r'class="cu-faq__para">\s*[-*#`|]', faq))
    check('FAQ 页：项目符号渲染成列表', 'cu-faq__bullets' in faq, f'bullets={len(re.findall("cu-faq__bullets", faq))}')
    # 内页不应再出现 markdown 标题渲染出的重复锚点（内页 H1 来自模板）
    for u in ['/pricing', '/unlimited', '/faq']:
        x = pages[u].decode('utf-8')
        check(f'{u:12} 无空标题锚点（-1 后缀）', not re.search(r'<h2 id="[^"]+-1"', x), f'{re.findall(r"<h2 id=.([^\"]+-1)", x)}')

    print('\n助手语料与商品 URL')
    kefu_js = ''
    for base_dir, _dirs, files in os.walk(root):
        for name in files:
            if name.endswith('.js'):
                kefu_js += open(os.path.join(base_dir, name), encoding='utf-8', errors='ignore').read()
    check('助手语料已序列化进 bundle', 'cat-limits-speed' in kefu_js and '在线助手' in kefu_js)
    check('助手浮标进 SSR 产物（每页一处）', 'cu-kefu__fab' in h, 'PageShell 渲染 <KefuWidget />，构建期即可断言')
    for u in ['/pricing', '/faq']:
        check(f'{u:12} 助手浮标', 'cu-kefu__fab' in pages[u].decode('utf-8'))
    shop_count = kefu_js.count(SHOP_URL)
    check('商品 URL 只在数据层出现（site.ts + faq.ts），组件无硬编码', shop_count <= 3, f'出现 {shop_count} 次')

    print('\n404 页')
    try:
        st, raw = get(base, '/no-such-page')
        body = raw.decode('utf-8', errors='ignore')
        check('404 是自定义模板页（标题以「页面不存在」开头，不是 VitePress 默认的 404 / PAGE NOT FOUND）', st == 200 and '<title>页面不存在' in body and 'PAGE NOT FOUND' not in body, re.findall(r'<title>([^<]*)</title>', body)[:1])
    except Exception as e:
        check('404 命中 not-found 模板', False, str(e))

    srv.shutdown()
    shutil.rmtree(root, ignore_errors=True)
    print('\n' + ('全部通过' if not fails else f'{len(fails)} 项未通过: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()