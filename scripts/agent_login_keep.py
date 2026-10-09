"""
只读查看器：从 config/agent_session.json 读取已保存的 token，打开浏览器窗口并进入已登录页面。

- 不读取、不打印明文密码，不需要再输入账号密码。
- 在 RustDesk 可见的桌面（会话 1）里运行：窗口会直接弹在桌面上。
  在别处（例如 Claude Code 的工具进程）运行时会先自动转到交互桌面。
- 窗口保持打开，可直接在上面操作；关掉本进程即关掉浏览器。

用法：
  python scripts\agent_login_keep.py            # 打开已登录的浏览器窗口并保持
  python scripts\agent_login_keep.py --seconds 60   # 打开 60 秒后自动关闭（默认一直保持）
  python scripts\agent_login_keep.py --console  # 禁止自动转到交互桌面
"""
import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from playwright.sync_api import sync_playwright  # noqa: E402
import agent_login as al  # noqa: E402
from agent_session_helper import relaunch_in_interactive_session  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="用已保存的会话打开浏览器窗口")
    parser.add_argument("--seconds", type=float, default=0, help="打开后保持多少秒（0=一直保持）")
    parser.add_argument("--console", action="store_true", help="不自动转到交互桌面")
    parser.add_argument("--headless", action="store_true", help="无头运行")
    args = parser.parse_args()

    if not args.console:
        try:
            relaunch_in_interactive_session(extra_args=["--seconds", str(args.seconds)])
        except Exception as e:
            print(f"[提示] 转到交互桌面失败（{e}），继续在当前会话执行。")

    session = al.load_session()
    al.log(f"[打开] 用户名：{session.get('username')}  token：{al.mask(session.get('token'))}")
    with sync_playwright() as pw:
        browser = al.launch_browser(pw, headless=args.headless)
        context = browser.new_context(storage_state=str(al.SESSION_FILE))
        page = context.new_page()
        try:
            al.inject_session(page, session)
            if not al.check_token(page, session):
                al.log("[错误] 已保存的 token 已失效，请先运行：python scripts\agent_login.py  刷新会话")
                sys.exit(2)
            time.sleep(1.5)
            al.log(f"[成功] 已登录，页面：{page.url}，浏览器窗口保持打开，可直接操作。")
            if args.seconds > 0:
                time.sleep(args.seconds)
            else:
                while True:
                    time.sleep(3600)
        except KeyboardInterrupt:
            al.log("[退出] 已关闭浏览器。")
        finally:
            context.storage_state(path=str(al.SESSION_FILE))
            browser.close()


if __name__ == "__main__":
    main()
