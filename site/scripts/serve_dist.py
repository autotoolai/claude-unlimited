"""本地静态预览：按 Cloudflare Pages 的 cleanUrls 规则把 /pricing 映射到 dist/docs/pricing.html。

用法：python scripts/serve_dist.py [port]
"""
import http.server
import os
import sys

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.vitepress', 'dist')
# srcDir='docs' 时产物直接在 dist 根，无需前缀


class Handler(http.server.SimpleHTTPRequestHandler):
    def _resolve(self):
        path = self.path.split('?')[0].split('#')[0].strip('/')
        if path and not os.path.isfile(path) and not os.path.isfile(path + '.html'):
            # /pricing -> /pricing.html（cleanUrls）
            for cand in (path + '.html', os.path.join(path, 'index.html')):
                if os.path.isfile(cand):
                    self.path = '/' + cand
                    return
        if not path or os.path.isfile(path):
            return
        if os.path.isfile(path + '.html'):
            self.path = '/' + path + '.html'
            return
        if os.path.isfile(os.path.join(path, 'index.html')):
            self.path = '/' + os.path.join(path, 'index.html')
            return
        if os.path.isfile('404.html'):
            self.path = '/404.html'

    def do_GET(self):
        self._resolve()
        super().do_GET()

    def do_HEAD(self):
        self._resolve()
        super().do_HEAD()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    os.chdir(DIST)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
    print('[serve] dist -> http://127.0.0.1:%d/' % port, flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()