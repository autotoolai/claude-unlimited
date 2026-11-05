"""生成 GitHub README / Social Preview 横幅：仓库根 docs/social-preview.png，1280x640。

用法：python scripts/gen_social_preview.py
依赖：Pillow。字体与配色对齐 gen_og.py；品牌 logo 读 config/logo.json。

产品视角（非仓库基建数字）：卖点关键词 + 文档站/控制台双域名 + 售后微信号文字。
二维码不画进横幅（缩略不可扫、营销感过强）；码图放 README 联系区。
"""
import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = os.path.abspath(os.path.join(ROOT, '..'))
OUT = os.path.join(REPO, 'docs', 'social-preview.png')

with io.open(os.path.join(ROOT, 'config', 'logo.json'), encoding='utf-8') as f:
    LOGO = json.load(f)

W, H = 1280, 640
PAPER = '#F5F1E8'
CARD = '#FFFDF8'
INK = '#16130F'
INK2 = '#403A33'
MUTED = '#6C6459'
ACCENT = '#C85A1E'
SOFT = '#F2E6D6'
LINE = '#E3DAC8'
BAR = '#EDE4D4'

FONTS = {
    'bold': [r'C:\Windows\Fonts\segoeuib.ttf', r'C:\Windows\Fonts\arialbd.ttf'],
    'regular': [r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arial.ttf'],
    'cjk': [r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc',
            r'C:\Windows\Fonts\simhei.ttf',
            '/System/Library/Fonts/PingFang.ttc',
            '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'],
    'cjk_reg': [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf',
                '/System/Library/Fonts/PingFang.ttc',
                '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'],
}


def font(kind, size):
    for p in FONTS[kind]:
        if os.path.isfile(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def logo(d, x, y, s):
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


def draw():
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # 顶底品牌色条
    d.rectangle([0, 0, W, 10], fill=ACCENT)
    d.rectangle([0, H - 10, W, H], fill=ACCENT)

    # 右上角轻晕
    for i, r in enumerate([520, 380, 260]):
        a = 0.09 - i * 0.025
        col = tuple(
            int(int(PAPER[i2:i2 + 2], 16) * (1 - a) + int(ACCENT[i2:i2 + 2], 16) * a)
            for i2 in (1, 3, 5)
        )
        d.ellipse([W - r - 40, -r // 2, W + r - 40, r], fill=col)

    # 品牌行
    logo(d, 72, 48, 52)
    f_brand = font('cjk', 36)
    d.text((140, 52), 'Claude 无限卡', font=f_brand, fill=INK)
    f_sub = font('cjk_reg', 20)
    d.text((140, 96), '一个 Key，Claude 不限量用 · 订阅期内不按 token 计费', font=f_sub, fill=MUTED)

    # 分隔
    d.line([72, 148, W - 72, 148], fill=LINE, width=2)

    # 三块卖点卡
    cards = [
        ('Claude Code 中文教程', '用法 / 原理 / 成本 / 排错'),
        ('Claude · Cursor · Codex', '一个 Key 通吃主流客户端'),
        ('兑换控制台 rsxermu666.cn', '卡密兑换 · 提 Key · 查用量'),
    ]
    gap = 24
    card_w = (W - 72 * 2 - gap * 2) // 3
    card_h = 196
    y0 = 178
    f_card_t = font('cjk', 24)
    f_card_s = font('cjk_reg', 18)
    for i, (title, blurb) in enumerate(cards):
        x0 = 72 + i * (card_w + gap)
        d.rounded_rectangle(
            [x0, y0, x0 + card_w, y0 + card_h],
            radius=16, fill=CARD, outline=LINE, width=2,
        )
        # 左侧强调条
        d.rounded_rectangle(
            [x0 + 18, y0 + 28, x0 + 24, y0 + card_h - 28],
            radius=3, fill=ACCENT,
        )
        # 标题折行（最多两行）
        max_w = card_w - 56
        lines, cur = [], ''
        for ch in title:
            if text_w(d, cur + ch, f_card_t)[0] > max_w and cur:
                lines.append(cur)
                cur = ch
            else:
                cur += ch
        if cur:
            lines.append(cur)
        ty = y0 + 40
        for ln in lines[:2]:
            d.text((x0 + 40, ty), ln, font=f_card_t, fill=INK)
            ty += 34
        d.text((x0 + 40, y0 + card_h - 52), blurb, font=f_card_s, fill=MUTED)

    # 底栏：双域名 + 售后微信文字
    bar_y = H - 118
    d.rounded_rectangle([72, bar_y, W - 72, H - 42], radius=20, fill=BAR)
    f_url = font('cjk', 22)
    f_hint = font('cjk_reg', 18)
    left = 'claude-unlimited.aiautotools.com'
    mid = '  ·  '
    right = 'rsxermu666.cn（控制台）'
    # 左对齐排域名
    d.text((100, bar_y + 18), left + mid + right, font=f_url, fill=INK)
    d.text((100, bar_y + 48), '售后微信 ren_mo_mo · 完整二维码见 README 联系区 / 官网 /contact', font=f_hint, fill=MUTED)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, 'PNG', optimize=True)
    print('[social-preview] 已生成', OUT)


if __name__ == '__main__':
    draw()
    sys.exit(0)
