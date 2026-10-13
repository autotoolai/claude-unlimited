#!/usr/bin/env bash
# 从 public/videos/*.mp4 抽第 1 秒做首帧缩略图，输出到 public/videos/poster/<同名>.jpg。
# VideoPlayer.vue 的 poster 属性与 config/video_meta.ts 的 VideoObject.thumbnailUrl 都指向这里，
# 三处路径必须一致。视频替换后重跑一次即可。
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/videos/poster
for f in public/videos/*.mp4; do
  b=$(basename "$f" .mp4)
  ffmpeg -hide_banner -loglevel error -y -ss 1 -i "$f" -frames:v 1 -vf "scale=960:-2" -q:v 4 "public/videos/poster/$b.jpg"
  echo "[poster] $b.jpg"
done
