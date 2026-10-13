"""把 public/videos/*.mp4 上传到 R2 媒体桶，产物名带内容哈希。

为什么视频不走 Pages：单支 4–37MB，五支加上版本对比会到 140MB+，放 public/ 意味着每次
部署都重传全部视频，且吃 Pages 单文件体积上限。迁到 R2 后部署包与视频彻底解耦。

为什么产物名带哈希：videos/v1_round3.a1b2c3d4.mp4。视频一改名字就变，于是
max-age=31536000, immutable 的缓存永远不会拿到旧内容，不需要做缓存失效。

哈希映射写在 site/config/media_cdn.ts 的 VIDEO_KEYS 里，本脚本不 import TS，
直接读该文件里的正则，与 config 保持同一份事实。清单变了要重新跑本脚本
（npm run upload:media），否则站点会指向还没上传的对象。

前置：CLOUDFLARE_API_TOKEN 环境变量（与部署同一个 token）。
用法：
    python scripts/upload_media.py --dry-run    # 只打印待传清单
    python scripts/upload_media.py              # 实际上传
    python scripts/upload_media.py --no-skip    # 连已存在且哈希一致的对象也重传
"""
from __future__ import annotations

import argparse
import hashlib
import io
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUCKET = 'claude-unlimited-media'
CDN = 'https://media.claude-unlimited.aiautotools.com'
# mp4 是不可变大文件，长期缓存；poster 会随视频重抽，给一天
CACHE_MP4 = 'public, max-age=31536000, immutable'
CACHE_IMG = 'public, max-age=86400, must-revalidate'


def read_keys() -> dict[str, str]:
    """从 config/media_cdn.ts 读 'videos/x.mp4': 'videos/x.<hash>.mp4' 映射。"""
    text = io.open(ROOT / 'config' / 'media_cdn.ts', encoding='utf-8').read()
    return dict(re.findall(r"'(videos/[^']+)'\s*:\s*'(videos/[^']+)'", text))


def sha8(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:8]


def expected_key(p: Path) -> str:
    return f'videos/{p.stem}.{sha8(p)}.mp4'


def put(local: Path, key: str, content_type: str, cache: str) -> None:
    r = subprocess.run(
        ['npx', '--yes', 'wrangler@4', 'r2', 'object', 'put', f'{BUCKET}/{key}',
         '--file', str(local), '--content-type', content_type, '--cache-control', cache],
        capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        raise SystemExit(f'[media] 上传失败: {key}')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-skip', action='store_true')
    args = ap.parse_args()

    keys = read_keys()
    videos = sorted((ROOT / 'public' / 'videos').glob('*.mp4'))
    if not videos:
        raise SystemExit('[media] public/videos 下没有 mp4')
    drift: list[str] = []
    for v in videos:
        want = expected_key(v)
        got = keys.get(f'videos/{v.name}')
        if got != want:
            drift.append(f'{v.name}: config 写的是 {got}，实际应为 {want}')
    if drift:
        print('[media] config/media_cdn.ts 与磁盘不一致，先跑 npm run gen:media_keys')
        for d in drift:
            print('  ' + d)
        raise SystemExit(1)

    jobs: list[tuple[Path, str, str, str]] = []
    for v in videos:
        jobs.append((v, keys[f'videos/{v.name}'], 'video/mp4', CACHE_MP4))
        poster = ROOT / 'public' / 'videos' / 'poster' / f'{v.stem}.jpg'
        if poster.exists():
            jobs.append((poster, f'videos/poster/{v.stem}.{sha8(poster)}.jpg',
                         'image/jpeg', CACHE_IMG))

    for local, key, ct, cache in jobs:
        size = local.stat().st_size / 1048576
        print(f'[media] {local.name:22s} {size:6.1f}MB -> {CDN}/{key}')
        if args.dry_run:
            continue
        put(local, key, ct, cache)
    print(f'[media] 完成 {len(jobs)} 个对象' + ('（dry-run，未上传）' if args.dry_run else ''))


if __name__ == '__main__':
    main()
