#!/usr/bin/env python3
"""向 Google Search Console 提交 sitemap（服务账号须对资源有完全权限）。

支持环境变量 HTTP_PROXY / HTTPS_PROXY（国内直连 Google 常超时）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def _proxy_handlers() -> list:
    proxy = (
        os.environ.get("HTTPS_PROXY")
        or os.environ.get("https_proxy")
        or os.environ.get("HTTP_PROXY")
        or os.environ.get("http_proxy")
        or ""
    ).strip()
    if not proxy:
        return []
    return [urllib.request.ProxyHandler({"http": proxy, "https": proxy})]


def _urlopen(req: urllib.request.Request, timeout: int = 60):
    opener = urllib.request.build_opener(*_proxy_handlers())
    return opener.open(req, timeout=timeout)


def _load_sa(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _access_token(sa: dict) -> str:
    """优先 google-auth；否则用标准 JWT 断言（需 cryptography）。"""
    scopes = ["https://www.googleapis.com/auth/webmasters"]
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        import requests

        class _ProxyRequest(Request):
            def __call__(
                self,
                url,
                method="GET",
                body=None,
                headers=None,
                timeout=None,
                **kwargs,
            ):
                proxies = None
                proxy = (
                    os.environ.get("HTTPS_PROXY")
                    or os.environ.get("https_proxy")
                    or os.environ.get("HTTP_PROXY")
                    or os.environ.get("http_proxy")
                    or ""
                ).strip()
                if proxy:
                    proxies = {"http": proxy, "https": proxy}
                resp = requests.request(
                    method,
                    url,
                    data=body,
                    headers=headers,
                    timeout=timeout or 60,
                    proxies=proxies,
                )

                class _R:
                    pass

                r = _R()
                r.status = resp.status_code
                r.data = resp.content
                r.headers = resp.headers
                return r

        creds = service_account.Credentials.from_service_account_info(sa, scopes=scopes)
        creds.refresh(_ProxyRequest())
        return creds.token
    except ImportError:
        pass

    try:
        from google.auth import crypt, jwt
    except ImportError:
        print(
            "缺少 google-auth。可执行: "
            "uv venv temp/seo_probe/.venv && "
            "uv pip install --python temp/seo_probe/.venv/Scripts/python.exe google-auth requests",
            file=sys.stderr,
        )
        raise SystemExit(2)

    import time as _time

    signer = crypt.RSASigner.from_service_account_info(sa)
    now = int(_time.time())
    payload = {
        "iss": sa["client_email"],
        "scope": " ".join(scopes),
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }
    assertion = jwt.encode(signer, payload)
    if isinstance(assertion, bytes):
        assertion = assertion.decode("ascii")
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with _urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    token = data.get("access_token")
    if not token:
        print(f"换 token 失败: {data}", file=sys.stderr)
        raise SystemExit(1)
    return token


def submit_sitemap(token: str, site_url: str, sitemap_url: str) -> None:
    site_enc = urllib.parse.quote(site_url, safe="")
    feed_enc = urllib.parse.quote(sitemap_url, safe="")
    api = f"https://www.googleapis.com/webmasters/v3/sites/{site_enc}/sitemaps/{feed_enc}"
    req = urllib.request.Request(api, method="PUT", data=b"")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Length", "0")
    try:
        with _urlopen(req, timeout=60) as resp:
            print(f"GSC OK HTTP {resp.status} site={site_url} sitemap={sitemap_url}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"GSC HTTP {e.code}: {body}", file=sys.stderr)
        raise SystemExit(1)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--credentials", required=True)
    p.add_argument("--site-url", required=True)
    p.add_argument("--sitemap-url", required=True)
    args = p.parse_args()
    sa = _load_sa(Path(args.credentials))
    token = _access_token(sa)
    time.sleep(0.2)
    submit_sitemap(token, args.site_url, args.sitemap_url)


if __name__ == "__main__":
    main()
