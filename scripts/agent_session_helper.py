"""把 agent_login.py / agent_login_keep.py 重新启动到当前用户的交互桌面会话（RustDesk 所在的会话），让浏览器窗口可见。

- 由 temp/agent_login_triggers.py 通过 PYTHONSTARTUP 自动触发；也可在任意目录直接调用：
      python scripts\\agent_session_helper.py --session      # 打印当前会话 / 交互会话 / 窗口站与桌面
      python scripts\\agent_session_helper.py                # 在交互桌面会话里重新拉起 agent_login.py
- CLI 脚本可加 --console 跳过自动触发。
"""
import csv
import ctypes
import os
import re
import subprocess
import sys
from ctypes import wintypes
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRIGGER_DIR = ROOT / "temp"
TRIGGER_MODULE = TRIGGER_DIR / "agent_login_triggers.py"
LOG_FILE = TRIGGER_DIR / "login_window.log"

# `query session` 输出的状态词（GBK 编码）：Active=运行中，Disc=断开
ACTIVE_WORDS = {"active", "运行中"}
DISC_WORDS = {"disc", "disccon", "断开"}


def current_session_id() -> int:
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    k32.ProcessIdToSessionId.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
    sid = wintypes.DWORD()
    if not k32.ProcessIdToSessionId(os.getpid(), ctypes.byref(sid)):
        return 0
    return sid.value


def _sessions_from_process_names(names) -> set:
    """从 tasklist 里取指定进程名所在的全部会话 ID 集合。"""
    raw = subprocess.run("tasklist /FO CSV /NH", shell=True, capture_output=True).stdout
    text = raw.decode("gbk", errors="replace")
    wanted = {n.lower() for n in names}
    found = set()
    for row in csv.reader(text.splitlines()):
        if len(row) >= 2 and row[0].strip().lower() in wanted:
            try:
                found.add(int(row[1].strip()))
            except ValueError:
                pass
    return found


def _detect_interactive_session_fallback() -> int:
    """备用方案：rustdesk.exe 与 explorer.exe 共同所在的会话即为交互桌面会话。"""
    try:
        rust = _sessions_from_process_names(["rustdesk.exe"])
        explorer = _sessions_from_process_names(["explorer.exe"])
        common = rust & explorer
        if common:
            return min(common)
    except Exception:
        pass
    return 0


def interactive_session_id() -> int:
    """返回当前交互桌面（RustDesk 所在）的 Windows 会话 ID；识别失败返回 0。

    主方案：解析 `query session`（GBK 编码）输出，取状态为 Active（运行中）的会话；
    备用方案：取 rustdesk.exe 与 explorer.exe 共同所在的会话。
    系统控制台服务（services，会话 0）状态为 Disc（断开），不会被选中。
    """
    raw = subprocess.run("query session", shell=True, capture_output=True).stdout
    try:
        text = raw.decode("gbk")
    except UnicodeDecodeError:
        text = raw.decode("utf-8", errors="replace")
    sessions = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 2:
            ids = [int(p) for p in parts if p.isdigit()]
            if not ids:
                continue
            state = parts[-1].lower()
            if state in ACTIVE_WORDS:
                sessions.append(min(ids))
            elif state in DISC_WORDS:
                # services 行只有一个数字（会话 0），状态词是最后一个非数字列，这里无需处理
                pass
    if sessions:
        return min(sessions)
    return _detect_interactive_session_fallback()


def window_station_and_desktop() -> str:
    u32 = ctypes.WinDLL("user32", use_last_error=True)
    out = []
    for getter in (u32.GetProcessWindowStation, u32.GetThreadDesktop):
        if getter is u32.GetThreadDesktop:
            getter.restype = wintypes.HANDLE
            getter.argtypes = [wintypes.DWORD]
            handle = getter(ctypes.windll.kernel32.GetCurrentThreadId())
        else:
            getter.restype = wintypes.HANDLE
            getter.argtypes = []
            handle = getter()
        buf = ctypes.create_unicode_buffer(256)
        need = wintypes.DWORD()
        u32.GetUserObjectInformationW(handle, 2, buf, 512, ctypes.byref(need))
        out.append(buf.value)
    return " / ".join(out)


def find_main_window_hwnd() -> int:
    """在当前桌面枚举可见的顶层窗口，返回标题匹配的第一个窗口句柄；找不到返回 0。"""
    u32 = ctypes.WinDLL("user32", use_last_error=True)
    EnumWindowsProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    u32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
    u32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    u32.IsWindowVisible.argtypes = [wintypes.HWND]
    found = []

    def cb(hwnd, lparam):
        n = u32.GetWindowTextLengthW(hwnd)
        if n:
            buf = ctypes.create_unicode_buffer(n + 1)
            u32.GetWindowTextW(hwnd, buf, n + 1)
            title = buf.value
            if any(k in title for k in ("Codex代理平台", "vpns.beer")) and u32.IsWindowVisible(hwnd):
                found.append(hwnd)
        return True

    u32.EnumWindows(EnumWindowsProc(cb), 0)
    return found[0] if found else 0


def _pythonw_path() -> Path:
    exe = Path(sys.executable)
    pythonw = exe.with_name("pythonw.exe")
    return pythonw if pythonw.exists() else exe


def build_child_env(skip_trigger: bool) -> dict:
    env = os.environ.copy()
    parts = [p for p in env.get("PYTHONSTARTUP", "").split(os.pathsep) if p and p != str(TRIGGER_MODULE)]
    if not skip_trigger:
        parts.insert(0, str(TRIGGER_MODULE))
    else:
        env["AGENT_LOGIN_SKIP_TRIGGER"] = "1"
    if parts:
        env["PYTHONSTARTUP"] = os.pathsep.join(parts)
    else:
        env.pop("PYTHONSTARTUP", None)
    root_path = str(ROOT)
    pp = [p for p in env.get("PYTHONPATH", "").split(os.pathsep) if p and p != root_path]
    env["PYTHONPATH"] = os.pathsep.join([root_path, *pp])
    env["PYTHONIOENCODING"] = "utf-8"
    return env


def relaunch_in_interactive_session(script: str | None = None, extra_args: list[str] | None = None) -> None:
    """当前进程不在交互桌面会话时，在交互会话里重新拉起脚本，然后本进程退出。"""
    target = interactive_session_id()
    script = str(Path(script or sys.argv[0]).resolve())
    args = [a for a in (extra_args if extra_args is not None else sys.argv[1:]) if a != "--console"]
    here = current_session_id()
    if target and here == target:
        print(f"[环境] 当前已在交互会话 {here}，直接使用本窗口。")
        return
    print(f"[环境] 当前进程在会话 {here}，交互桌面在会话 {target}，正在转交……")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as logf:
        subprocess.Popen(
            [str(_pythonw_path()), script, *args],
            cwd=str(ROOT), env=build_child_env(skip_trigger=True),
            creationflags=0x00000008 | 0x00000200,  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
            stdout=logf, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
        )
    print(f"[环境] 已在交互桌面会话 {target} 启动新进程，日志：{LOG_FILE}，本进程退出。")
    sys.exit(0)


if __name__ == "__main__":
    if "--session" in sys.argv:
        print("当前进程会话:", current_session_id())
        print("交互桌面会话:", interactive_session_id())
        print("窗口站 / 桌面:", window_station_and_desktop())
        print("已找到的目标窗口句柄:", find_main_window_hwnd())
    else:
        relaunch_in_interactive_session()