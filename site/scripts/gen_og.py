"""生成社交分享卡片（Open Graph）：public/og/<slug>.png，1200x630。

用法：python scripts/gen_og.py
依赖：Pillow。字体用系统自带的 Segoe UI Bold / Consolas；中文回退到 msyh.ttc（微软雅黑）。
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'og')

W, H = 1200, 630
PAPER = '#F5F1E8'
CARD = '#FFFDF8'
INK = '#16130F'
INK2 = '#403A33'
MUTED = '#6C6459'
ACCENT = '#C85A1E'
ACCENT_SOFT = 'rgba'  # 用 draw 时直接混色，避免依赖 alpha 合成
SOFT = '#F2E6D6'
LINE = '#E3DAC8'

FONTS = {
    'bold': [r'C:\Windows\Fonts\segoeuib.ttf', r'C:\Windows\Fonts\arialbd.ttf'],
    'regular': [r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arial.ttf'],
    'serif': [r'C:\Windows\Fonts\georgiab.ttf', r'C:\Windows\Fonts\timesbd.ttf'],
    'mono': [r'C:\Windows\Fonts\consolab.ttf', r'C:\Windows\Fonts\cour.ttf'],
    'cjk': [r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf'],
}


def font(kind, size):
    for p in FONTS[kind]:
        if os.path.isfile(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def logo(d, x, y, s):
    d.rounded_rectangle([x, y, x + s, y + s], radius=int(s * 0.22), fill=ACCENT)
    d.line([(x + s * 0.18, y + s * 0.38), (x + s * 0.36, y + s * 0.38)], fill='#FFF6EC', width=max(2, int(s * 0.08)))
    d.arc([x + s * 0.22, y + s * 0.3, x + s * 0.56, y + s * 0.66], start=90, end=270, fill='#FFF6EC', width=max(2, int(s * 0.08)))
    d.line([(x + s * 0.82, y + s * 0.62), (x + s * 0.64, y + s * 0.62)], fill='#FFF6EC', width=max(2, int(s * 0.08)))
    d.arc([x + s * 0.44, y + s * 0.34, x + s * 0.78, y + s * 0.7], start=270, end=90, fill='#FFF6EC', width=max(2, int(s * 0.08)))


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
    ('home', '一个 Key，Claude 不限量用', ['订阅期内调用 Claude 不按 token 计费。', '改一个 Base URL 加一个 Key 即可接入。'], '固定订阅价 ¥298 / 30 天', ['Claude Code / Cursor / Cline', '200k 长上下文', '单 Key 并发 20']),
    ('pricing', '套餐定价', ['只有一种套餐：订阅期内不按 token 计费。', '包含什么、不包含什么、退款规则一次说清。'], '最终价格以下单页为准', ['¥298 / 30 天', '7 天内可申请退款', '不自动续费']),
    ('unlimited', '无限额度到底无限到什么程度', ['1 千 token 和 20 万 token 的调用，成本相同。', '支持 Opus / Sonnet / Haiku / Fable。'], '取消计费压力，不取消流控', ['Anthropic + OpenAI 兼容端点', '工具调用 / 扩展思考', '20 并发 · 60 次/分钟']),
    ('faq', '常见问题', ['关于商品、购买、接入、限速、数据安全的全部问题。', '退款规则、限速数字、申诉流程都写清楚。'], '点右下角在线助手，关键词秒回', ['25 条问答', '退款规则', '限速具体数字']),
]

if __name__ == '__main__':
    for slug, title, sub, eyebrow, chips in PAGES:
        draw_page(slug, title, sub, eyebrow, chips)
    sys.exit(0)