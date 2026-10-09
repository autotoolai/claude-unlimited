"""
vpns.beer 代理平台（https://vpns.beer/agent/）登录脚本。

登录流程：
  1. 用 Chromium 打开 https://vpns.beer/agent/
  2. 在页面上填入用户名/密码并点击"登录"按钮（和人工登录完全一样的行为）
  3. 登录接口 POST /api/agent/login 返回的 token 会写入浏览器
     sessionStorage/localStorage 的 covs_agent_session_token，以及隐藏框 #agentToken
  4. 把 token + localStorage + Cookie 统一保存到 config/agent_session.json
     （storageState 里的 Cookie 由脚本自行写入，用来给会话有效期打时间戳）

用法（在 RustDesk 可见的桌面里直接执行即可，窗口会自动弹在桌面上）：
  python scripts\agent_login.py --save                # 打开浏览器窗口手动登录，成功后自动保存并保持窗口不关
  python scripts\agent_login.py                        # 用已保存的账号登录，token 失效自动重新登录
  python scripts\agent_login.py --check                # 只校验已保存的会话是否还有效
  python scripts\agent_login.py --debug                # 保留浏览器窗口，显示浏览器控制台日志
  python scripts\agent_login.py --password "新密码"    # 手动更新 config/agent_session.json 里的密码
  python scripts\agent_login.py --console              # 强制在当前进程窗口里运行，不自动跳到交互桌面

自动登录：已保存账号且 token 失效时，脚本会无头自动登录并刷新会话（不再弹窗口）。
若是在非交互会话（服务/计划任务）里运行且需要弹窗，会先转到交互桌面再执行。

说明：
  - 站点没有 Cookie 登录态，登录凭证就是 localStorage 里的 Bearer token，
    所以后续自动化应先用本脚本换取 token，再注入到自己的浏览器上下文。
  - 脚本不会在日志/终端里打印明文密码和完整 token，只打印前后 4 位。
"""
import argparse
import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SESSION_FILE = ROOT / "config" / "agent_session.json"      # 凭证 + token + 视图状态（明文，已 gitignore）
STORAGE_STATE_FILE = ROOT / "config" / "agent_storage_state.json"  # 标准 Playwright storageState，给其它脚本/MCP 复用
BASE_URL = "https://vpns.beer/agent/"
API_LOGIN = "https://vpns.beer/api/agent/login"
API_ME = "https://vpns.beer/api/agent/me"
TOKEN_KEY = "covs_agent_session_token"
VIEW_KEY = "covs.agent.activeView"
FRESH_KEY = "covs_agent_session_fresh"
VALID_DAYS = 30  # storageState 里写一个本地 Cookie，用来给会话有效期打时间戳


def log(msg: str) -> None:
    print(msg, flush=True)


def mask(value: str) -> str:
    value = str(value or "")
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}(len={len(value)})"


def find_browser_channel() -> str | None:
    """优先用系统已安装的 Chrome/Edge（更可能被允许弹出窗口），找不到再回退到内置 Chromium。"""
    import os
    candidates = {
        "chrome": [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                   r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                   os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")],
        "msedge": [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                   r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"],
    }
    for channel, paths in candidates.items():
        for p in paths:
            if p and Path(p).exists():
                return channel
    return None


def launch_browser(pw, headless: bool):
    launch_kwargs = {"headless": headless}
    channel = find_browser_channel()
    if channel:
        launch_kwargs["channel"] = channel
    return pw.chromium.launch(**launch_kwargs)


def capture_credentials(page) -> None:
    """监听登录请求，把提交时的账号密码记到 page.agent_credentials 里（绝不打印明文）。"""
    page.agent_credentials = {}

    def on_request(request):
        if request.method == "POST" and request.url.split("?")[0].endswith("/api/agent/login"):
            try:
                body = request.post_data_json or {}
                page.agent_credentials = {"username": str(body.get("username") or ""),
                                         "password": str(body.get("password") or "")}
            except Exception:
                pass

    page.on("request", on_request)


def save_session(page, username: str, password: str, headless: bool) -> dict:
    token = page.evaluate(
        "(k) => sessionStorage.getItem(k) || localStorage.getItem(k) || ''", TOKEN_KEY
    )
    me = page.evaluate(
        """async ([url, token]) => {
            const r = await fetch(url, { headers: { authorization: 'Bearer ' + token } });
            let body = null;
            try { body = await r.json(); } catch {}
            return { status: r.status, body };
        }""",
        [API_ME, token],
    )
    expires = datetime.now() + timedelta(days=VALID_DAYS)
    # storageState 本身不带有效期，用一个只存在于本地的 Cookie 记录会话新鲜期
    page.context.add_cookies(
        [{
            "name": FRESH_KEY,
            "value": str(int(time.time())),
            "url": "https://vpns.beer",
            "expires": expires.timestamp(),
        }]
    )
    data = {
        "site": "https://vpns.beer",
        "login_url": BASE_URL,
        "api_login": API_LOGIN,
        "api_me": API_ME,
        "username": username,
        "password": password,
        "token": token,
        "local_storage": page.evaluate("() => JSON.parse(JSON.stringify(localStorage))"),
        "cookies": page.context.cookies(),
        "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "valid_until": expires.strftime("%Y-%m-%d %H:%M:%S"),
        "me_status": me["status"],
        "me": me["body"],
        "headless": headless,
        "note": "本文件包含明文账号密码和 token，仅限本机使用，请勿提交 git 或分享。",
    }
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    SESSION_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    try:  # 尽量把权限收紧到只有当前用户可读
        SESSION_FILE.chmod(0o600)
    except OSError:
        pass
    return data


def load_session() -> dict:
    if not SESSION_FILE.exists():
        log(f"[错误] 未找到会话文件：{SESSION_FILE}，请先运行：python scripts/agent_login.py --save")
        sys.exit(1)
    return json.loads(SESSION_FILE.read_text(encoding="utf-8"))


def save_password(password: str) -> None:
    """手动更新会话文件里的密码（--password）。"""
    if password == "" and sys.stdin.isatty():
        import getpass
        password = getpass.getpass("请输入代理密码（输入不回显）：")
    data = load_session()
    data["password"] = password
    SESSION_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"[成功] 已更新 {SESSION_FILE} 里的密码（长度 {len(password)}）")


def check_token(page, session: dict) -> bool:
    """调用 /api/agent/me 校验 token。"""
    token = session.get("token", "")
    if not token:
        return False
    result = page.evaluate(
        """async ([url, token]) => {
            const r = await fetch(url, { headers: { authorization: 'Bearer ' + token } });
            let body = null;
            try { body = await r.json(); } catch {}
            return { status: r.status, body };
        }""",
        [API_ME, token],
    )
    ok = result["status"] == 200
    log(f"[校验] /api/agent/me 返回 HTTP {result['status']} -> {'有效' if ok else '失效'}")
    if ok:
        session["me"] = result["body"]
    return ok


def inject_session(page, session: dict) -> None:
    """把保存下来的 token 写回页面并刷新，让站点进入已登录状态。"""
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.evaluate(
        """([tokenKey, viewKey, token, view]) => {
            sessionStorage.setItem(tokenKey, token);
            localStorage.setItem(tokenKey, token);
            localStorage.setItem(viewKey, view || 'cards');
            const box = document.getElementById('agentToken');
            if (box) box.value = token;
            const clear = document.getElementById('clearAgentTokenBtn');
            if (clear) clear.hidden = false;
        }""",
        [TOKEN_KEY, VIEW_KEY, session.get("token", ""), session.get("active_view", "cards")],
    )
    page.reload(wait_until="domcontentloaded")


def do_login(page, session: dict, headless: bool) -> dict:
    """在真实页面里填账号密码点击登录，成功后保存会话。"""
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.fill("#username", session["username"])
    page.fill("#password", session["password"])
    page.click("#loginBtn")  # 提交登录表单
    try:
        page.wait_for_function(
            "(k) => !!(sessionStorage.getItem(k) || localStorage.getItem(k))",
            arg=TOKEN_KEY,
            timeout=15000,
        )
    except Exception:
        msg = ""
        if page.locator("#loginMsg").count():
            msg = page.inner_text("#loginMsg")
        log(f"[错误] 登录失败，页面提示：{msg or '(无)'}")
        log("       请在 config/agent_session.json 里检查 username / password 是否正确。")
        sys.exit(2)
    time.sleep(1.5)  # 等 /api/agent/me 等初始化请求完成
    return save_session(page, session["username"], session["password"], headless)


def do_manual_login(page, headless: bool, keep_open: bool) -> dict:
    """打开可见窗口，让用户手动输入账号密码，登录成功后自动保存会话。"""
    page.goto(BASE_URL, wait_until="domcontentloaded")
    log("=" * 60)
    log("浏览器窗口已打开，请在窗口里输入账号密码并点击登录。")
    log("登录成功后本脚本会自动检测到 token 并保存，会话文件：" + str(SESSION_FILE))
    log("=" * 60)
    page.wait_for_function(
        "(k) => !!(sessionStorage.getItem(k) || localStorage.getItem(k))",
        arg=TOKEN_KEY,
        timeout=600000,
    )
    time.sleep(1.5)
    creds = getattr(page, "agent_credentials", {}) or {}
    username = creds.get("username") or page.input_value("#username").strip()
    password = creds.get("password") or ""
    data = save_session(page, username, password, headless)
    log(f"[成功] 会话已保存  用户名：{username or '(未取到)'}  token：{mask(data['token'])}  cookie：{len(data['cookies'])} 个")
    if not data["password"]:
        log("[提示] 未能从登录请求里取到明文密码，token 已保存；以后免登录请运行：")
        log("       python scripts/agent_login.py --password \"你的密码\"")
    if keep_open:
        log("[保持] 浏览器窗口将继续打开，可直接在上面操作。关闭本进程即可关掉浏览器。")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="vpns.beer 代理平台登录与会话保存")
    parser.add_argument("--save", action="store_true", help="打开浏览器窗口手动登录并保存会话")
    parser.add_argument("--check", action="store_true", help="只校验已保存的会话")
    parser.add_argument("--debug", action="store_true", help="保留浏览器窗口并输出浏览器控制台日志")
    parser.add_argument("--password", nargs="?", const="", default=None, metavar="新密码",
                        help="手动更新会话文件里的密码（不传值则交互式询问）")
    parser.add_argument("--keep-open", action="store_true", help="保存会话后不关闭浏览器，也不退出进程")
    parser.add_argument("--headless", action="store_true", help="无头运行（默认有头，方便远程看到窗口）")
    parser.add_argument("--console", action="store_true", help="强制在当前进程/窗口里运行，不自动跳到交互桌面")
    args = parser.parse_args()

    if args.password is not None:
        save_password(args.password)
        return

    # 在非交互会话（服务、计划任务、Claude Code 工具进程）里运行且需要弹窗时，先转到交互桌面
    if not args.console and (args.save or args.debug):
        sys.path.insert(0, str(ROOT))
        try:
            from agent_session_helper import relaunch_in_interactive_session
            relaunch_in_interactive_session()
        except Exception as e:
            log(f"[提示] 转到交互桌面失败（{e}），继续在当前会话执行。")

    auto_login = (not args.save and not args.debug
                  and SESSION_FILE.exists()
                  and bool(load_session().get("username")) and bool(load_session().get("password")))
    headless = args.headless or auto_login  # 自动登录时无头运行，失败再提示手动

    if auto_login:
        log(f"[自动登录] 使用已保存账号 {load_session()['username']} 登录（无头运行）……")
    with sync_playwright() as pw:
        browser = launch_browser(pw, headless)
        context = browser.new_context(storage_state=str(STORAGE_STATE_FILE) if STORAGE_STATE_FILE.exists() else None)
        page = context.new_page()
        capture_credentials(page)
        if args.debug:
            page.on("console", lambda m: log(f"[浏览器控制台:{m.type}] {m.text}"))

        try:
            if args.save:
                do_manual_login(page, headless, args.keep_open)
            else:
                session = load_session()
                inject_session(page, session)
                if check_token(page, session):
                    log(f"[成功] 会话有效  用户名：{session.get('username')}  token：{mask(session.get('token'))}")
                else:
                    log("[提示] 已保存的 token 已失效，正在用保存的账号密码重新登录……")
                    data = do_login(page, session, headless)
                    log(f"[成功] 会话已刷新  用户名：{data['username']}  token：{mask(data['token'])}")
                log(f"       页面：{page.url}")
            context.storage_state(path=str(STORAGE_STATE_FILE))  # 同步更新 storageState
            if args.debug and not args.keep_open:
                input("按回车关闭浏览器……")
            if args.keep_open:
                log("[保持] 进程继续运行，按 Ctrl+C 或关掉本终端即关闭浏览器。")
                while True:
                    time.sleep(3600)
        except KeyboardInterrupt:
            log("[退出] 已关闭浏览器。")
        finally:
            try:
                context.storage_state(path=str(STORAGE_STATE_FILE))
            except Exception:
                pass
            browser.close()


if __name__ == "__main__":
    main()