from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse
import json
import socket
import shutil
import subprocess
import time
import webbrowser
import urllib.request


PORT = 8000
APP_DIR = Path(__file__).resolve().parent / "app"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)


def create_server(host: str, port: int, attempts: int = 20) -> tuple[ThreadingHTTPServer, int]:
    for candidate in range(port, port + attempts):
        try:
            return ThreadingHTTPServer((host, candidate), Handler), candidate
        except OSError as error:
            if error.errno not in (98, 48):
                raise
    raise OSError(f"Nenhuma porta livre encontrada entre {port} e {port + attempts - 1}.")


def local_network_ips() -> list[str]:
    ips = set()
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                ips.add(ip)
    except OSError:
        pass
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if not ip.startswith("127."):
                ips.add(ip)
    except OSError:
        pass
    return sorted(ips)


def start_ngrok(port: int, ngrok_bin: str, timeout: int = 20) -> tuple[subprocess.Popen, str]:
    if shutil.which(ngrok_bin) is None:
        raise FileNotFoundError(
            f"Não encontrei o executável '{ngrok_bin}'. Instale o ngrok e deixe-o no PATH."
        )

    process = subprocess.Popen(
        [ngrok_bin, "http", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
    )

    api_url = "http://127.0.0.1:4040/api/tunnels"
    deadline = time.time() + timeout
    public_url = ""

    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError("O ngrok encerrou antes de criar o túnel. Verifique o login e o authtoken.")
        try:
            with urllib.request.urlopen(api_url, timeout=1) as response:
                payload = json.loads(response.read().decode("utf-8"))
            tunnels = payload.get("tunnels", [])
            https_tunnel = next((item for item in tunnels if item.get("proto") == "https"), None)
            http_tunnel = next((item for item in tunnels if item.get("proto") == "http"), None)
            tunnel = https_tunnel or http_tunnel
            if tunnel and tunnel.get("public_url"):
                public_url = tunnel["public_url"]
                break
        except Exception:
            time.sleep(0.5)
            continue
        time.sleep(0.5)

    if not public_url:
        process.terminate()
        raise TimeoutError("Não foi possível obter a URL pública do ngrok dentro do tempo limite.")

    return process, public_url


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor local do prototipo SmartLab SPDA.")
    parser.add_argument("--host", default="0.0.0.0", help="host de escuta do servidor")
    parser.add_argument("--port", type=int, default=PORT, help="porta inicial do servidor")
    parser.add_argument("--open", action="store_true", help="abre o navegador automaticamente")
    parser.add_argument("--ngrok", action="store_true", help="abre um túnel público com ngrok")
    parser.add_argument("--ngrok-bin", default="ngrok", help="caminho do executável do ngrok")
    parser.add_argument("--ngrok-timeout", type=int, default=20, help="tempo máximo para aguardar a URL pública do ngrok")
    args = parser.parse_args()
    server, selected_port = create_server(args.host, args.port)
    url = f"http://localhost:{selected_port}"
    ngrok_process = None
    ngrok_url = None
    print("Sistema SmartLab SPDA")
    print(f"Acesse: {url}")
    for ip in local_network_ips():
        print(f"No celular, tente: http://{ip}:{selected_port}")
    if selected_port != args.port:
        print(f"A porta {args.port} estava ocupada; usando {selected_port}.")
    if args.ngrok:
        try:
            ngrok_process, ngrok_url = start_ngrok(selected_port, args.ngrok_bin, args.ngrok_timeout)
            print(f"URL pública do ngrok: {ngrok_url}")
        except Exception as error:
            print(f"Não foi possível iniciar o ngrok: {error}")
    print("Pressione Ctrl+C para encerrar.")
    if args.open:
        try:
            webbrowser.open(ngrok_url or url)
        except Exception:
            pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()
        if ngrok_process and ngrok_process.poll() is None:
            ngrok_process.terminate()
            try:
                ngrok_process.wait(timeout=5)
            except Exception:
                ngrok_process.kill()


if __name__ == "__main__":
    main()
