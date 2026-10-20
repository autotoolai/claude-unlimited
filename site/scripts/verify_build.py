"""
把构建产物抽到临时根目录，按 Pages cleanUrls 起服务，跑 SEO / 购买按钮 / 组件 / 助手语料 / 知识库验收。
srcDir='docs' 时条目页产物直接在 dist 根（index.html / pricing.html ...），与 Cloudflare Pages 的路由一致。

用法：npm run build && python scripts/verify_build.py [port]

临时目录建在 site/temp/ 下并全程用绝对路径解析：系统 TEMP 路径本身就长，
再叠加文件名容易触碰 Windows MAX_PATH，表现为「文件存在但 os.path.isfile 为 False」。
"""
import io
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
KNOWLEDGE_TS = os.path.join(SITE, 'config', 'knowledge.ts')
B = chr(92)  # 需要在 Python 字符串里写正则反斜杠时用它拼，避免编辑器/工具链层层转义


def knowledge_entries():
    """从 config/knowledge.ts 读出文章条目：slug 与 faq[] 的问题文本。加文章不用改本脚本。

    解析规则（与 scripts/gen_knowledge_routes.mjs、scripts/gen_knowledge_og.py 一致）：
    条目以「两空格缩进的 { 独占一行」开头，slug 是条目的第一个字段。
    """
    t = open(KNOWLEDGE_TS, encoding='utf-8').read()
    # 只取 knowledge[] 数组本体，不截到文件尾：后面还有 retiredKnowledgePages 块，
    # 它也有 slug 字段，截到文件尾会把退役页当成现役文章。
    start = t.index('export const knowledge: KnowledgeMeta[] = [')
    end = t.index('\n]', start)
    body = t[start:end]
    out = []
    for e in re.split(r'(?m)^  ' + B + '{' + B + 's*$', body)[1:]:
        sm = re.search(B + "s*slug: '([^']+)'", e)
        if not sm:
            continue
        qs = re.findall(B + "{ q: '((?:[^'\\\\\\\\]|\\\\\\\\.)*)'", e)
        out.append({'slug': sm.group(1), 'faq': [q.replace(B + B, B) for q in qs]})
    if not out:
        sys.exit('[verify] 未从 config/knowledge.ts 解析到文章')
    return out


def knowledge_slugs():
    return [e['slug'] for e in knowledge_entries()]


def retired_knowledge_pages():
    """从 config/knowledge.ts 的 retiredKnowledgePages 读出退役页：slug 与现在的落点 to。"""
    t = open(KNOWLEDGE_TS, encoding='utf-8').read()
    m = re.search(r"export const retiredKnowledgePages[^=]*=\s*\[(.*?)\n\]", t, re.S)
    if not m:
        return []
    return [{'slug': a, 'to': b} for a, b in re.findall(r"slug: '([^']+)',\s*\n\s*to: '([^']+)'", m.group(1))]


def knowledge_categories():
    """从 config/knowledge.ts 的 knowledgeCategories 读出分类 key；加分类不用改本脚本。"""
    src = open(KNOWLEDGE_TS, encoding='utf-8').read()
    block = re.search(r"export const knowledgeCategories[^=]*=\s*\[(.*?)\n\]", src, re.S)
    if not block:
        sys.exit('[verify] 未从 config/knowledge.ts 解析到 knowledgeCategories')
    cats = re.findall(r"cat:\s*'([a-z]+)'", block.group(1))
    return cats


PAGES = ['/', '/models', '/console', '/pricing', '/faq', '/guide', '/knowledge'] + ['/knowledge/' + s for s in knowledge_slugs()] + ['/guide/cc', '/guide/desktop', '/guide/codex', '/guide/workbuddy', '/guide/cursor']  # cleanUrls=false 时条目页是 /knowledge/x.html、总览是 /guide.html，Handler 两种路径都接受
def _read_config(name: str) -> str:
    with io.open(os.path.join(SITE, 'config', name), encoding='utf-8') as f:
        return f.read()


def _const(text: str, var: str) -> str:
    m = re.search(r"export const " + re.escape(var) + r"\s*=\s*['\`]([^'\`]+)['\`]", text)
    if not m:
        sys.exit(f'未能从 config 读到 {var}，请检查配置')
    return m.group(1)


# 商品 URL 与正式域名只有一个权威源（config/site.ts 与 config/plans.ts），脚本里再抄一份必然漂移：
# 换域名后验收脚本会拿旧 URL 去比对 CTA，把正确的按钮全判成「缺 rel」。
_plans = _read_config('plans.ts')
# site.ts 里 url 是 siteConfig 的字段而不是 export const，单独按字段取
_m = re.search(r"^  url: '([^']+)'", _read_config('site.ts'), re.M)
if not _m:
    sys.exit('未能从 config/site.ts 读到 siteConfig.url，请检查配置')
SITE_URL = _m.group(1)
# shopUrl 在 config/plans.ts 里是模板字符串，这里取 shopToken 后按同一模板拼，避免抄第二份 URL
SHOP_URL = _const(_plans, 'shopUrl').replace('${shopToken}', _const(_plans, 'shopToken'))
# 档位专属商品页的前缀同样从 config/plans.ts 的 itemUrl 模板取，不在脚本里抄第二份域名
_m2 = re.search(r"export const itemUrl\s*=\s*\([^)]*\)\s*=>\s*`([^`]+)`", _plans)
if not _m2:
    sys.exit('未能从 config/plans.ts 读到 itemUrl 模板，请检查配置')
ITEM_URL_PREFIX = re.sub(r'\$\{[^}]*\}', '', _m2.group(1))  # 去掉模板占位符，只留前缀
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
            return os.path.join(self.root, 'index.html')
        p = os.path.join(self.root, rel)
        if os.path.isfile(p):
            return p
        if os.path.isfile(p + '.html'):
            return p + '.html'
        p = os.path.join(p, 'index.html')
        return p if os.path.isfile(p) else None

    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        f = self._find(path)
        if f is None:
            nf = os.path.join(self.root, '404.html')
            if os.path.isfile(nf):
                data = open(nf, 'rb').read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            self.send_error(404)
            return
        data = open(f, 'rb').read()
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
        if ok:
            print(f'  [ok] {label}')
        else:
            fails.append(label)
            print(f'  [!!] {label}  {detail}')

    pages = {}
    for u in PAGES + ['/robots.txt', '/sitemap.xml', '/llms.txt', '/favicon.svg', '/_headers', '/og/models.png', '/og/console.png']:
        try:
            st, raw = get(base, u)
        except Exception as e:
            raw = str(e).encode()
        pages[u] = raw

    print('首页 SEO 与购买按钮')
    h = pages['/'].decode('utf-8')
    if len(h) < 8000:
        sys.exit('[verify] 首页响应异常（%d 字节），服务可能被占用，换个端口重试：python scripts/verify_build.py <port>' % len(h))
    check('唯一 title', len(re.findall(r'<title>', h)) == 1, (re.findall(r'<title>([^<]*)</title>', h) or ['?'])[0])
    # H1 只统计 PageShell 正文里的（cu-shell 之前若有默认外壳节点则不计入）
    shell_h1 = len(re.findall(r'<h1', h[h.find('class="cu-shell"'):]))
    check('唯一 h1', shell_h1 == 1, f'外壳内 {shell_h1} 个 / 全文 {len(re.findall(H1_RE, h))} 个')
    check('canonical', bool(re.search(r'<link rel="canonical" href="https://[^/]+/"', h)))
    check('og:title / og:description / og:image / og:url', all(f'property="og:{k}"' in h for k in ['title', 'description', 'image', 'url']), str(re.findall(r'property="og:(title|description|image|url)" content="([^"]*)"', h)))
    check('twitter:card', 'name="twitter:card"' in h)
    # 只统计 CTA 按钮（cu-btn 类），FAQ 正文里的「前往下单页」是正文链接，不要求埋点
    # 商品入口现在分两处：页头（nav）与首屏（hero_primary）。套餐卡的购买按钮在 /pricing，底部 CTA 指向 /pricing。
    # 不断言按钮数量（区块增减是产品决定），只断言「该有的入口在、且属性合规」。
    buttons = re.findall(r'<a class="[^"]*cu-btn[^"]*"[^>]*href="' + re.escape(SHOP_URL) + r'"[^>]*>', h)
    ctas = [re.findall(r'data-cta="([^"]*)"', b) for b in buttons]
    cta_names = {c[0] for c in ctas if len(c) == 1 and c[0]}
    check(
        '首页商品入口：页头(nav) + 首屏(hero_primary) 都在',
        {'nav', 'hero_primary'} <= cta_names,
        f'实际 {sorted(cta_names)}',
    )
    check('CTA 按钮均 target=_blank + rel=noopener sponsored nofollow', all('target="_blank"' in b and 'rel="noopener sponsored nofollow"' in b for b in buttons))
    check('CTA 按钮均带非空 data-cta', all(len(c) == 1 and c[0] for c in ctas), str(ctas))
    # 导航条右侧 CTA 走 ExternalCta（带 data-cta），页头不再有第二个购买按钮
    check('导航条购买 CTA 走 ExternalCta', 'data-cta="nav"' in h, '')
    check('页头不再有第二个购买按钮', 'cu-navcta' not in h, '')
    text_links = re.findall(r'<a(?! class=)[^>]*href="' + re.escape(SHOP_URL) + r'"[^>]*>', h)
    check('正文下单链接同样带 rel', all('rel="noopener sponsored nofollow"' in a for a in text_links), f'{len(text_links)} 处')

    print('\n各页')
    for u in PAGES:
        x = pages[u].decode('utf-8')
        check(f'{u:12} 200', pages[u][:1] == b'<', f'实际 {pages[u][:40]!r}')
        title = re.findall(r'<title>([^<]*)</title>', x)
        is_knowledge_article = u.startswith('/knowledge/')
        # 外壳起点用正则定位：知识库文章页的 cu-shell 带第二个类名（cu-shell--knowledge），直接找 'class="cu-shell"' 会切到 -1
        shell_xm = re.search(r'class="cu-shell[^"]*"', x)
        shell_x = x[shell_xm.start():] if shell_xm else x
        check(f'{u:12} 唯一 h1', len(re.findall(H1_RE, shell_x)) == 1, f'外壳内 {len(re.findall(H1_RE, shell_x))} 个；title={title[0] if title else "?"}')
        check(f'{u:12} description', 'name="description"' in x)
        # 教程场景页的 title 与 description 是 SEO 契约：title ≤ 32 字（SERP 中文约 30 字后截断），
        # description ≤ 110 字（同 config/knowledge.ts 的 GEO 规范）。超了会在搜索结果里被截掉。
        if u.startswith('/guide/'):
            m_desc = re.search(r'name="description" content="([^"]*)"', x)
            desc = m_desc.group(1) if m_desc else ''
            m_title = re.search(r'<title>([^<]*)</title>', x)
            t = m_title.group(1) if m_title else ''
            check(f'{u:12} description ≤110 字', 0 < len(desc) <= 110, f'实际 {len(desc)} 字：{desc[:40]}')
            check(f'{u:12} title ≤32 字', 0 < len(t.replace(" | Claude 无限卡", "")) <= 32, f'实际 {len(t)} 字：{t}')
            check(f'{u:12} 场景切换条 5 个客户端', x.count('cu-guide-scenes__item') == 5, f"实际 {x.count('cu-guide-scenes__item')}")
            check(f'{u:12} 有 HowTo 与 FAQPage', 'HowTo' in x and 'FAQPage' in x, '')
        check(f'{u:12} canonical', '<link rel="canonical"' in x)
        # 文章页：正文是 VPDoc 的 page 分支（layout: page），没有原生目录 aside，也没有 cu-page__head
        # 页内目录：只有长文页有（教程页 /guide、后台页 /console 由 PageShell 传 toc，知识库文章页自带），
        # 形态统一是右侧竖排 cu-sidenav；营销页与列表页（首页 / 模型 / 套餐 / 无限额度 / FAQ / 知识库列表）没有目录。
        # 文章页的目录项在客户端挂载后才从正文 h2 生成，SSR 里整块不渲染（见 KnowledgeDoc.vue 与 SectionNav.vue 的 v-if），
        # 所以文章页只校验两列骨架在，不校验目录节点；锚点一致性由 npm run check:toc 在浏览器里核对
        has_toc = u.startswith('/guide') or u == '/console'
        shell_keys = ['cu-brandbar', 'cu-tabs', 'cu-shell__body'] + (['vp-doc', 'cu-shell__body--reading'] if is_knowledge_article else ([] if u == '/' else ['cu-page__head']))
        missing = [k for k in shell_keys if k not in x]
        check(f'{u:12} 页面外壳（品牌页头 + 导航条）', not missing, f'缺少 {missing}')
        if has_toc:
            # 教程页 / 后台页：目录项 SSR 就完整，校验竖排目录节点与两列骨架都在
            check(f'{u:12} 长文页左侧目录 cu-sidenav（DOM 在正文之前）', 'cu-sidenav' in x and 'cu-shell__body--reading' in x and x.index('cu-sidenav') < x.index('cu-shell__inner'), '缺少 cu-sidenav、两列骨架，或目录不在正文容器之前')
        else:
            check(f'{u:12} 营销/列表页无页内目录', 'cu-sectionnav' not in x, '产物里仍有 cu-sectionnav')
        check(
            f'{u:12} 无 VitePress 默认外壳残留',
            not any(k in x for k in ['class="VPDocAside', 'class="VPFooter', 'class="VPSidebar']),
            'VPNavBar / VPLocalNav 由 custom.css 兜底隐藏，SSR 产物里仍存在',
        )
        check(f'{u:12} 页面正文有 SSR 内容（不是空壳）', len(x) > 8000, f'{len(x)} 字节')
        check(f'{u:12} 无 SSR 报错占位（__vitepress_fn / [object Object]）', '__vitepress_fn' not in x and '[object Object]' not in x)
        check(f'{u:12} 无未渲染的模板（<template> / &lt;Component）', '<template>' not in x and '&lt;HomeHero' not in x and '&lt;ClientOnly' not in x)
        check(f'{u:12} 无 markdown 降级为 <pre><code> 的正文', '<pre><code>&lt;' not in x and '<pre><code><h2' not in x)
        # 页内目录项都要有对应锚点，否则点了没反应
        links = re.findall(r'class="cu-sectionnav[^"]*"[' + B + 's' + B + 'S]*?</aside>', x)
        # 页内目录锚点对应正文小节：普通小节是 <h2 id="…">，FAQ 分类是 <section id="cat-…">（h2 无 id）
        ids = re.findall(r'<h2 id="([^"]+)"|(?<=<section id=")([^"]+)"', x)
        ids = [a or b for a, b in ids]
        hrefs = re.findall(r'<a[^>]+href="#([^"]+)"', links[0]) if links else []
        if is_knowledge_article:
            # 文章页：页内目录在客户端挂载后由 KnowledgeDoc 从正文的 h2[id] 生成（见 KnowledgeDoc.vue），SSR 产物里为空，
            # 所以这里只断言「目录留待客户端生成 + 正文 h2 齐全」，锚点一致性由浏览器里的 check:toc 脚本核对
            check(f'{u:12} 文章页目录留待客户端生成（SSR 为空）', len(hrefs) == 0 and len(ids) >= 3, f'目录 {len(hrefs)} 项 / h2 {len(ids)} 个')
            check(f'{u:12} 文章页单列阅读容器与相关阅读', 'cu-shell__body--reading' in x and 'cu-krelated' in x)
        elif has_toc:
            # 教程页与后台页：目录是 SSR 就完整的右侧竖排，锚点必须全部命中正文小节
            check(f'{u:12} 页内目录锚点全部命中', bool(hrefs) and set(hrefs) <= set(ids), f'目录 {len(hrefs)} 项 / 页面 h2 {len(ids)} 个，缺失 {set(hrefs) - set(ids)}')

    # 条数从 config/faq.ts 现算：加 FAQ 的人只改数据源，不用同步脚本里的魔法数字
    faq_src = io.open(os.path.join(SITE, 'config', 'faq.ts'), encoding='utf-8').read()
    # 只数字面量：接口声明那行是 `cat: FaqCategory`，不能算进去
    _faq_total = len(re.findall(r"cat: '[a-z]+'", faq_src))
    _faq_cats = len(set(re.findall(r"cat: '([a-z]+)'", faq_src)))

    print('\n组件渲染')
    # 2026-10-11 首页瘦身到只剩首屏：Hero + CTA 带。内容全部推给定价页 / FAQ / 知识库。
    # 断言只锁「首页不得再承载正文」，不再锁区块数量——区块增减是产品决定，不该让验收脚本变红。
    check(
        '首页：只剩首屏与 CTA 带，不承载正文小节',
        'cu-hero' in h and 'cu-band' in h
        and 'cu-tcard' not in h and 'cu-stats' not in h and 'cu-faq__item' not in h,
        f'tiers={len(re.findall("cu-tcard__name", h))} faq={len(re.findall("cu-faq__item", h))}',
    )
    pricing = pages['/pricing'].decode('utf-8')
    # 2026-10-12 起 /pricing 页内不再挂 FAQ 组件：限速与封号规则只在 /faq 维护一份。
    # 卡片数与限速条数从 config 现算，不写死；「页内 0 条 FAQ」与「限速类在 /faq 齐活」一起断言，
    # 防止以后有人在定价页把 FAQ 加回来，或把限速条目从 /faq 漏掉。
    _tiers = len(re.findall(r'cu-tcard__name', pricing))
    _pricing_faq = len(re.findall('cu-faq__item', pricing))
    _limits_faq = len(re.findall(r"cat: 'limits'", faq_src))
    check(
        f'定价页：{_tiers} 张档位卡，页内不挂 FAQ（限速类 {_limits_faq} 条只在 /faq）',
        _tiers >= 1 and _pricing_faq == 0,
        f'tiers={_tiers} faq={_pricing_faq} limits={_limits_faq}',
    )
    # 结构化数据必须与页面可见内容一致：页内没有 FAQ 就不许声明 FAQPage
    check('定价页 JSON-LD 不含 FAQPage（页内没有 FAQ）', 'FAQPage' not in pricing, f'命中 {pricing.count("FAQPage")} 处')
    # 每张可购买档位卡一个商品 CTA，指向自己的档位商品页，target/rel/埋点齐活
    _tier_cards = _tiers - len(re.findall('cu-btn--disabled', pricing))
    _tier_ctas = re.findall(r'<a class="[^"]*cu-btn[^"]*"[^>]*href="' + re.escape(ITEM_URL_PREFIX) + r'[^"]*"[^>]*>', pricing)
    _tier_cta_names = [re.findall(r'data-cta="([^"]*)"', b) for b in _tier_ctas]
    check(
        f'定价页：{_tier_cards} 个档位 CTA，target/rel/埋点齐活',
        len(_tier_ctas) == _tier_cards
        and all('target="_blank"' in b and 'rel="noopener sponsored nofollow"' in b for b in _tier_ctas)
        and all(len(c) == 1 and c[0] for c in _tier_cta_names),
        f'cards={_tier_cards} ctas={len(_tier_ctas)} names={_tier_cta_names}',
    )
    faq = pages['/faq'].decode('utf-8')
    # 限速类条目必须逐条出现在 /faq（定价页不再挂 FAQ，这里是唯一主场页）
    _limits_on_page = len(re.findall(r'id="cat-limits-[a-z0-9]+"', faq))
    check(
        f'FAQ 页：限速类 {_limits_faq} 条齐活',
        _limits_on_page == _limits_faq,
        f'页内 {_limits_on_page} 条 / config {_limits_faq} 条',
    )
    check(
        f'FAQ 页：{_faq_total} 条 + {_faq_cats + 1} 个分类锚点（buying + {_faq_cats} 类）+ summary role=button',
        len(re.findall('cu-faq__item', faq)) == _faq_total
        and len(set(re.findall(r'id="(cat-[a-z]+)"', faq))) == _faq_cats + 1
        and faq.count('<summary role="button"') == _faq_total,
        f'faq={len(re.findall("cu-faq__item", faq))} anchors={len(set(re.findall(r"id=.cat-([a-z]+)", faq)))}',
    )
    check('FAQ 页：答案里没有残留 Markdown 语法', not re.search(r'class="cu-faq__para">' + B + 's*[-*#`|]', faq))
    check('FAQ 页：项目符号渲染成列表', 'cu-faq__bullets' in faq, f'bullets={len(re.findall("cu-faq__bullets", faq))}')
    # 内页不应再出现 markdown 标题渲染出的重复锚点（内页 H1 来自模板）
    for u in ['/pricing', '/faq']:
        x = pages[u].decode('utf-8')
        check(f'{u:12} 无空标题锚点（-1 后缀）', not re.search(r'<h2 id="[^"]+-1"', x), f'{re.findall(r"<h2 id=.([^\"]+-1)", x)}')
    # 知识库列表页：分类胶囊数 = config/knowledge.ts 的分类数 +「全部」，且不再有「最新文章」重复区块
    ki = pages['/knowledge'].decode('utf-8')
    switcher_count = ki.count('cu-seg__btn')          # 分类 tab（分类数 + 「全部」）
    cats = knowledge_categories()
    cats_present = all(('cat-' + c) in ki for c in cats)
    has_latest = 'id=' + chr(34) + 'latest' + chr(34) in ki or 'id=' + chr(39) + 'latest' + chr(39) in ki
    check('知识库列表页：每个分类一个 tab +「全部」，无「最新文章」重复区块', switcher_count == len(cats) + 1 and cats_present and not has_latest,
          f'tab={switcher_count} 分类={cats} 分类小节={cats_present} latest={has_latest}')

    print('\n助手语料与商品 URL')
    kefu_js = ''
    for base_dir, _dirs, files in os.walk(root):
        for name in files:
            if name.endswith('.js'):
                kefu_js += open(os.path.join(base_dir, name), encoding='utf-8', errors='ignore').read()
    check('助手语料已序列化进 bundle', 'bot-trouble-429' in kefu_js and '在线助手' in kefu_js)
    check('裁剪版二维码已进产物', os.path.isfile(os.path.join(root, 'wechat-qr-code.png')) and '/wechat-qr-code.png' in kefu_js)
    check('助手浮标进 SSR 产物（每页一处）', 'cu-kefu__fab' in h, 'PageShell 渲染 <KefuWidget />，构建期即可断言')
    for u in ['/pricing', '/faq']:
        check(f'{u:12} 助手浮标', 'cu-kefu__fab' in pages[u].decode('utf-8'))
    shop_count = kefu_js.count(SHOP_URL)
    check('商品 URL 只在数据层出现（site.ts + faq.ts），组件无硬编码', shop_count <= 3, f'出现 {shop_count} 次')

    print('\n知识库 FAQ / JSON-LD / 来源')
    check('知识库：bundle 含 FAQPage（Article + FAQPage JSON-LD）', 'FAQPage' in kefu_js)
    check('知识库：bundle 不含素材站域名', 'aiprimetech' not in kefu_js)
    redir_path = os.path.join(root, '_redirects')
    redir = open(redir_path, encoding='utf-8').read() if os.path.isfile(redir_path) else ''
    n_knowledge_rules = len(re.findall(r'(?m)^/knowledge/', redir))
    n_retired = len(retired_knowledge_pages())
    check(
        '_redirects 无重复知识库规则',
        n_knowledge_rules == len(knowledge_slugs()) + 1 + n_retired,
        f'{n_knowledge_rules} 条 vs {len(knowledge_slugs()) + 1} 条尾斜杠 + {n_retired} 条退役页',
    )
    # 退役页：301 必须在，目标页必须在，别忘了它已经不在 knowledge[] 里（否则是现役页被误标退役）
    for r in retired_knowledge_pages():
        check(
            f'_redirects 退役页 {r["slug"]} -> {r["to"]} 的 301',
            re.search(r'(?m)^/knowledge/' + re.escape(r['slug']) + r' ' + re.escape(r['to']) + r' 301$', redir) is not None,
            '缺这条 301 的话，已收录的旧地址会直接 404（跑 node scripts/gen_knowledge_routes.mjs）',
        )
        if r['to'] != '/knowledge':
            check(f'退役页 {r["slug"]} 的目标页 {r["to"]} 在现役文章里', r['to'].replace('/knowledge/', '') in knowledge_slugs(), '目标页不存在，重定向过去仍是 404')
        check(f'{r["slug"]} 已不在现役文章里', r['slug'] not in knowledge_slugs(), '退役页不该同时在 knowledge[] 里')
    for e in knowledge_entries():
        slug = e['slug']
        qs = e['faq']
        md = open(os.path.join(SITE, 'docs', 'knowledge', slug + '.md'), encoding='utf-8').read()
        # FAQ 与相关阅读由组件渲染（KnowledgeDoc.vue / KnowledgeFooter.vue），正文里不再写这两个小节；
        # 权威源只有 config/knowledge.ts 的 faq[]。这里断言「正文没有残留小节 + 折叠问题文本进了 bundle」。
        no_faq_md = not re.search(r'(?m)^## 常见问题\s*$', md)
        no_rel_md = not re.search(r'(?m)^## 相关阅读\s*$', md)
        check(f'/knowledge/{slug:38} faq 3–5 条且正文无 FAQ/相关阅读小节', 3 <= len(qs) <= 5 and no_faq_md and no_rel_md,
              f'faq={len(qs)} 正文常见问题小节={not no_faq_md} 正文相关阅读小节={not no_rel_md}')
        check(f'/knowledge/{slug:38} 正文无素材站域名', 'aiprimetech' not in md)
        check(f'/knowledge/{slug:38} layout: page + knowledge: true', 'layout: page' in md and 'knowledge: true' in md)
        check(f'/knowledge/{slug:38} bundle 含首个 FAQ 问题', bool(qs) and qs[0] in kefu_js)
        check(f'/knowledge/{slug:38} 产物含「常见问题」章节', '常见问题' in pages['/knowledge/' + slug].decode('utf-8'))

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