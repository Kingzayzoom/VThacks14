"""Start the whole system: ANS simulator, hub + dashboard, and every agent.

    python scripts/run_all.py              # start everything and open the dashboard
    python scripts/run_all.py --no-browser
    python scripts/run_all.py --fresh      # wipe the local ANS + agent keys first (clean demo)

Ctrl+C stops everything.
"""
import os
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import httpx  # noqa: E402

from mc import config  # noqa: E402

COLORS = ["36", "33", "35", "32", "34", "31", "96", "93"]


def pump(name: str, color: str, proc: subprocess.Popen):
    for line in proc.stdout:
        print(f"\x1b[{color}m{name:>11}\x1b[0m | {line.rstrip()}", flush=True)


def spawn(name: str, module: str, port: int, extra_env: dict | None = None) -> subprocess.Popen:
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8", **(extra_env or {})}
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", module, "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning"],
        cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
    )
    color = COLORS[len(PROCS) % len(COLORS)]
    threading.Thread(target=pump, args=(name, color, proc), daemon=True).start()
    PROCS.append((name, proc))
    return proc


HTTP = httpx.Client(timeout=30)


def wait_healthy(name: str, url: str, timeout: float = 60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if HTTP.get(url, timeout=2).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        for n, p in PROCS:
            if p.poll() is not None:
                raise SystemExit(f"{n} exited during startup (code {p.returncode}). See its output above.")
        time.sleep(0.4)
    raise SystemExit(f"{name} didn't become healthy at {url}")


PROCS: list[tuple[str, subprocess.Popen]] = []


def main():
    backend = (config.env("ANS_BACKEND", "sim") or "sim").lower()
    if "--fresh" in sys.argv:
        if backend != "sim":
            raise SystemExit("--fresh only applies to the local ANS simulator")
        import shutil
        for d in (config.DATA_DIR / "ans_sim", config.KEYS_DIR):
            shutil.rmtree(d, ignore_errors=True)
        print("Wiped local ANS state and agent keys. Agents will register from scratch.")
    if backend == "sim":
        spawn("ans-sim", "services.ans_sim.app:app", config.port("ans_sim"))
        wait_healthy("ANS simulator", f"{config.ans_sim_url()}/health")
    spawn("hub", "services.hub.app:app", config.port("hub"))
    wait_healthy("hub", f"{config.hub_url()}/health")

    modules = {"commander": "services.agents.commander:app", "vendor": "services.agents.vendor:app",
               "impostor": "services.agents.impostor:app"}
    for key, cfg in config.agents().items():
        spawn(key, modules[cfg["role"]], cfg["port"], {"AGENT_KEY": key})
    for key, cfg in config.agents().items():
        wait_healthy(key, f"{config.agent_endpoint({**cfg, 'key': key})}/health")

    try:
        HTTP.post(f"{config.hub_url()}/api/reset")
    except httpx.HTTPError as exc:
        print(f"Warning: initial reset failed ({exc})")

    url = config.hub_url()
    print(f"\n  CortexAi is running at {url}\n  ANS backend: {backend}  |  Ctrl+C to stop\n", flush=True)
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)

    try:
        while True:
            time.sleep(1)
            for name, proc in PROCS:
                if proc.poll() is not None:
                    raise SystemExit(f"{name} stopped unexpectedly (code {proc.returncode}). Shutting down.")
    except KeyboardInterrupt:
        print("\nStopping…")
    finally:
        for _, proc in PROCS:
            if proc.poll() is None:
                proc.terminate()
        for _, proc in PROCS:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    main()
