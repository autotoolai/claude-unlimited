"""把 dist/ 目录用静态服务暴露出来，用于本地预览与 Tailscale 内网访问。
用法：python scripts/serve_dist.py [端口]     默认 4180，监听 0.0.0.0。
"""
import functools
import http.server
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.vitepress', 'dist')


class Handler(http.server.SimpleHTTPRequestHandler):
    """把 /pricing 映射到 /pricing.html（Cloudflare Pages cleanUrls 的行为）。"""

    def translate_path(self, path):
        # 先剥掉查询串与锚点，再按 Cloudflare Pages 的 cleanUrls 规则找文件：
        # /pricing -> pricing.html，/guide -> guide/index.html（或 guide.html），
        # /knowledge/xxx -> knowledge/xxx.html，都找不到再回落 404
        path = path.split('?')[0].split('#')[0]
        p = super().translate_path(path)
        if os.path.isdir(p):
            idx = os.path.join(p, 'index.html')
            if os.path.isfile(idx):
                return idx
            flat = p + '.html'
            if os.path.isfile(flat):
                return flat
            return p
        if os.path.isfile(p):
            return p
        if os.path.isfile(p + '.html'):
            return p + '.html'
        return p

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass


def main():
    if not os.path.isfile(os.path.join(ROOT, 'index.html')):
        sys.exit('[serve] 未找到 dist/index.html，请先 npm run build')
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
    handler = functools.partial(Handler, directory=os.path.abspath(ROOT))
    print('[serve] dist -> http://0.0.0.0:%d/  (本机 http://127.0.0.1:%d/ )' % (port, port), flush=True)
    http.server.ThreadingHTTPServer(('0.0.0.0', port), handler).serve_forever()


if __name__ == '__main__':
    main()
