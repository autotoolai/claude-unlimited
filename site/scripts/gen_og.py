"""生成社交分享卡片（Open Graph）：public/og/<slug>.png，1200x630。

用法：python scripts/gen_og.py
依赖：Pillow。字体用系统自带的 Segoe UI Bold / Consolas；中文回退到 msyh.ttc（微软雅黑）。
"""
import io
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'og')

with io.open(os.path.join(ROOT, 'config', 'logo.json'), encoding='utf-8') as f:
    LOGO = json.load(f)

W, H = 1200, 630
PAPER = '#F5F1E8'
CARD = '#FFFDF8'
INK = '#16130F'
INK2 = '#403A33'
MUTED = '#6C6459'
ACCENT = '#C85A1E'
SOFT = '#F2E6D6'
LINE = '#E3DAC8'

FONTS = {
    'bold': [r'C:\Windows\Fonts\segoeuib.ttf', r'C:\Windows\Fonts\arialbd.ttf'],
    'regular': [r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arial.ttf'],
    'serif': [r'C:\Windows\Fonts\georgiab.ttf', r'C:\Windows\Fonts\timesbd.ttf'],
    'mono': [r'C:\Windows\Fonts\consolab.ttf', r'C:\Windows\Fonts\cour.ttf'],
    # 中文标题/副标题的主字体（拉丁与汉字同源，混排不会跳基线）
    'cjk': [r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc',
            r'C:\Windows\Fonts\simhei.ttf',
            '/System/Library/Fonts/PingFang.ttc',
            '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'],
}


def faq_count():
    """FAQ 条数直接从 config/faq.ts 数，避免卡片文案与数据脱钩。"""
    src = os.path.join(ROOT, 'config', 'faq.ts')
    with io.open(src, encoding='utf-8') as f:
        return sum(1 for line in f if line.strip().startswith("cat: '"))


def font(kind, size):
    for p in FONTS[kind]:
        if os.path.isfile(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def logo(d, x, y, s):
    """品牌标记：几何与配色读 config/logo.json（由 config/logo.ts 生成），与 favicon 同源。

    画法为归一化描述，不解析 SVG path 字符串。
    """
    sh = LOGO['shape']
    d.rounded_rectangle(
        [x, y, x + s, y + s],
        radius=int(LOGO['radius'] / LOGO['size'] * s),
        fill=LOGO['bg'],
    )
    w = max(2, int(round(sh['stroke'] * s)))
    fg = LOGO['fg']
    for ln in sh['lines']:
        d.line(
            [(x + ln['x1'] * s, y + ln['y1'] * s), (x + ln['x2'] * s, y + ln['y2'] * s)],
            fill=fg, width=w,
        )
    for arc in sh['arcs']:
        cx, cy, r = x + arc['cx'] * s, y + arc['cy'] * s, arc['r'] * s
        d.arc([cx - r, cy - r, cx + r, cy + r], start=arc['from'], end=arc['to'], fill=fg, width=w)


def text_w(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0], b[3] - b[1]


def draw_page(slug, title, subtitle, eyebrow, chips):
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    # 背景：右上角品牌色晕
    for i, r in enumerate([560, 420, 300]):
        a = 0.10 - i * 0.028
        col = tuple(int(int(PAPER[i2:i2 + 2], 16) * (1 - a) + int(ACCENT[i2:i2 + 2], 16) * a) for i2 in (1, 3, 5))
        d.ellipse([W - r, -r // 2, W + r, r], fill=col)
    d.rounded_rectangle([40, 40, W - 40, H - 40], radius=24, outline=LINE, width=2, fill=None)

    logo(d, 80, 78, 56)
    d.text((152, 84), 'Claude 无限卡', font=font('bold', 30), fill=INK)
    d.text((152, 120), 'Claude API · 固定订阅 · 不按 token 计费', font=font('regular', 18), fill=MUTED)

    d.text((80, 210), eyebrow, font=font('bold', 22), fill=ACCENT)
    # 标题按宽度折行，最多两行
    f_title = font('serif', 66)
    lines, cur = [], ''
    for ch in title:
        if text_w(d, cur + ch, f_title)[0] > W - 160:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    lines.append(cur)
    y = 250
    for ln in lines[:2]:
        d.text((80, y), ln, font=f_title, fill=INK)
        y += 78
    y += 10
    for ln in subtitle:
        d.text((80, y), ln, font=font('regular', 26), fill=INK2)
        y += 40

    # 底部筹码
    x = 80
    for c in chips:
        w = text_w(d, c, font('bold', 22))[0] + 44
        d.rounded_rectangle([x, H - 118, x + w, H - 70], radius=24, fill=SOFT)
        d.text((x + 22, H - 110), c, font=font('bold', 22), fill=ACCENT)
        x += w + 16

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{slug}.png')
    img.save(path, 'PNG', optimize=True)
    print('[og] 已生成', path)


PAGES = [
    ('home', '一个 Key，Claude 不限量用', ['有效期内不限次数调用，不按 token 计费。', '改一个 Base URL 加一个 Key 即可接入。'], '¥49 起 / 7 天 · 不限次数', ['Claude Code / Cursor / Cline', '不限次数调用', '单 Key 并发 20']),
    ('pricing', '套餐定价', ['无限卡三档在售，周期卡与额度卡筹备中。', '包含什么、不包含什么、退款规则一次说清。'], '价格与规格看商品页', ['¥49 起 / 7 天', '退款按已用天数折算', '不自动续费']),
    ('models', '模型广场', ['Claude 全系模型，不限次数调用。', '点复制拿 model ID。'], '有效期内 Opus / Sonnet / Fable 通用', ['6 个常用模型', '不限次数调用', '新模型自动提供']),
    ('console', '管理后台', ['兑换卡密、提取 Key、一键导入配置。', '用量、公告、图像生成都在后台。'], '买完卡密后的第一站', ['一键导入配置', '用量图表', '备用域名']),
    ('faq', '常见问题', ['关于商品、购买、接入、限速、数据安全的全部问题。', '退款规则、限速数字、申诉流程都写清楚。'], '点右下角在线助手，关键词秒回', [f'{faq_count()} 条问答', '退款规则', '限速具体数字']),
    ('guide', '使用教程', ['先选你在用的客户端。', '每条路都带真实截图，照着做就行。'], '5 个客户端任选', ['Claude Code', '桌面版', 'Codex']),
    ('guide_cc', 'Claude Code 教程', ['CC Switch 一键导入。', 'VS Code 插件与终端都能用。'], '最主流的一条路', ['6 步带截图', '一键导入', '/model 切换']),
    ('guide_desktop', 'Claude 桌面版教程', ['新增桌面版供应商。', '打开路由，装上就能用。'], '官方桌面客户端', ['8 步带截图', '接入方式选直连', '开路由']),
    ('guide_codex', 'Codex 教程', ['上游格式选对是关键。', '改完必须重启 Codex。'], '终端 Agent', ['8 步带截图', 'Anthropic Messages', '配置模型列表']),
    ('guide_workbuddy', 'WorkBuddy 教程', ['不用装 CC Switch。', '三个值填进自定义模型。'], '最省事的一条路', ['3 步带截图', '接口地址带 /v1', '添加自定义模型']),
    ('guide_cursor', '通用手动配置', ['三个值填对就能用。', '各客户端差异一张表说清。'], '任意支持自定义 API 的客户端', ['接口地址', 'API Key', '模型名']),
]

if __name__ == '__main__':
    for slug, title, sub, eyebrow, chips in PAGES:
        draw_page(slug, title, sub, eyebrow, chips)
    sys.exit(0)