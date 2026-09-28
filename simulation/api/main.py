"""
AdverSim Live Backend API Module
Provides HTTP REST endpoints and RFC 6455 WebSockets to stream genuinely live cyber range state:
- GET /api/sim/state -> Full live orchestrator + Bayesian defense + detection state
- POST /api/start, /api/stop, /api/reset, /api/step, /api/condition, /api/inject_attack
- WS /ws -> Real-time round tick stream and bidirectional control
"""

import sys
import os
import json
import time
import base64
import hashlib
import struct
import socket
import socketserver
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, Optional

from simulation.live.live_engine import live_engine
from simulation.api.websocket_manager import manager

# Attempt FastAPI integration if installed
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    FastAPI = None

# Background Simulation Loop Worker
_worker_thread: Optional[threading.Thread] = None
_stop_worker_event = threading.Event()


def live_simulation_worker():
    """Continuous background worker advancing live simulation rounds and broadcasting state."""
    print("[BACKEND WORKER] Live simulation orchestration worker started.")
    while not _stop_worker_event.is_set():
        if live_engine.is_running:
            try:
                state = live_engine.step_round()
                payload = {
                    "type": "ROUND_TICK",
                    "round": state["currentRound"],
                    "running": state["isRunning"],
                    "state": state,
                }
                manager.broadcast_sync(payload)
            except Exception as e:
                print(f"[BACKEND WORKER] Step error: {e}")

        # Sleep according to engine speed
        delay = max(0.2, (live_engine.speed_ms / 1000.0))
        time.sleep(delay)


def ensure_worker_running():
    global _worker_thread
    if _worker_thread is None or not _worker_thread.is_alive():
        _stop_worker_event.clear()
        _worker_thread = threading.Thread(target=live_simulation_worker, daemon=True)
        _worker_thread.start()


# -----------------------------------------------------------------------------
# Standard Library RFC 6455 WebSocket Connection Handler
# -----------------------------------------------------------------------------

class RawWebSocketClient:
    """Manages an individual RFC 6455 WebSocket TCP connection."""

    def __init__(self, sock: socket.socket, addr: tuple):
        self.sock = sock
        self.addr = addr
        self.closed = False

    def send_text_frame(self, message: str):
        if self.closed:
            return
        try:
            data = message.encode("utf-8")
            length = len(data)
            header = bytearray([0x81])  # FIN + Text Opcode

            if length <= 125:
                header.append(length)
            elif length <= 65535:
                header.append(126)
                header.extend(struct.pack("!H", length))
            else:
                header.append(127)
                header.extend(struct.pack("!Q", length))

            self.sock.sendall(header + data)
        except Exception:
            self.close()

    def handle_messages(self):
        """Reads and handles incoming WebSocket text frames."""
        try:
            while not self.closed:
                head = self.sock.recv(2)
                if not head or len(head) < 2:
                    break

                b1, b2 = head[0], head[1]
                fin = (b1 & 0x80) != 0
                opcode = b1 & 0x0F
                masked = (b2 & 0x80) != 0
                payload_len = b2 & 0x7F

                if opcode == 0x8:  # Close opcode
                    break
                elif opcode == 0x9:  # Ping opcode
                    # Respond with Pong
                    self.sock.sendall(bytearray([0x8A, 0x00]))
                    continue
                elif opcode != 0x1:  # Non-text frame
                    continue

                if payload_len == 126:
                    ext = self.sock.recv(2)
                    payload_len = struct.unpack("!H", ext)[0]
                elif payload_len == 127:
                    ext = self.sock.recv(8)
                    payload_len = struct.unpack("!Q", ext)[0]

                masks = self.sock.recv(4) if masked else None

                raw_data = bytearray()
                while len(raw_data) < payload_len:
                    chunk = self.sock.recv(min(4096, payload_len - len(raw_data)))
                    if not chunk:
                        break
                    raw_data.extend(chunk)

                if masked and masks:
                    decoded = bytearray(raw_data[i] ^ masks[i % 4] for i in range(len(raw_data)))
                else:
                    decoded = raw_data

                text_msg = decoded.decode("utf-8", errors="ignore")
                self.process_client_message(text_msg)
        except Exception:
            pass
        finally:
            self.close()

    def process_client_message(self, text: str):
        try:
            data = json.loads(text)
            action = data.get("action") or data.get("type", "").lower()

            if action == "start":
                live_engine.set_running(True)
                manager.broadcast_sync({"type": "STATUS", "running": True, "state": live_engine.get_full_state()})
            elif action == "stop":
                live_engine.set_running(False)
                manager.broadcast_sync({"type": "STATUS", "running": False, "state": live_engine.get_full_state()})
            elif action == "reset":
                live_engine.reset_state()
                manager.broadcast_sync({"type": "RESET", "state": live_engine.get_full_state()})
            elif action == "step":
                next_st = live_engine.step_round()
                manager.broadcast_sync({"type": "ROUND_TICK", "round": next_st["currentRound"], "running": next_st["isRunning"], "state": next_st})
            elif action == "condition":
                cond = data.get("conditionId", "F")
                live_engine.set_condition(cond)
                manager.broadcast_sync({"type": "STATE_UPDATE", "state": live_engine.get_full_state()})
            elif action == "inject_attack":
                atk_type = data.get("attackType") or data.get("type", "apt29")
                next_st = live_engine.inject_attack(atk_type)
                manager.broadcast_sync({"type": "ROUND_TICK", "round": next_st["currentRound"], "running": next_st["isRunning"], "state": next_st})
        except Exception as e:
            print(f"[WS CLIENT] Error parsing message: {e}")

    def close(self):
        if not self.closed:
            self.closed = True
            manager.remove_raw_client(self)
            try:
                self.sock.close()
            except Exception:
                pass


# -----------------------------------------------------------------------------
# Combined HTTP REST & WebSocket Request Handler
# -----------------------------------------------------------------------------

class LiveApiRequestHandler(BaseHTTPRequestHandler):
    """
    Handles HTTP REST requests for /api/* and handles WebSocket upgrades for /ws.
    """

    def log_message(self, format, *args):
        # Suppress noisy healthcheck logs safely
        try:
            msg = format % args if args else format
            if "GET /api/health" not in str(msg):
                pass
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def send_json_response(self, data: dict, status_code: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]

        # 1. WebSocket Upgrade Check on /ws
        if path in ["/ws", "/ws/"]:
            upgrade = self.headers.get("Upgrade", "").lower()
            if upgrade == "websocket":
                key = self.headers.get("Sec-WebSocket-Key", "")
                if key:
                    accept_key = base64.b64encode(
                        hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()
                    ).decode()

                    response = (
                        "HTTP/1.1 101 Switching Protocols\r\n"
                        "Upgrade: websocket\r\n"
                        "Connection: Upgrade\r\n"
                        f"Sec-WebSocket-Accept: {accept_key}\r\n\r\n"
                    )
                    self.wfile.write(response.encode("utf-8"))
                    self.wfile.flush()

                    client = RawWebSocketClient(self.connection, self.client_address)
                    manager.add_raw_client(client)
                    # Send initial full state immediately
                    initial_state = live_engine.get_full_state()
                    client.send_text_frame(json.dumps({"type": "STATE_UPDATE", "state": initial_state}))
                    client.handle_messages()
                    return

        # 2. REST Endpoints
        if path == "/api/health":
            self.send_json_response({
                "status": "ok",
                "app": "AdverSim Cyber Defense Simulator",
                "version": "4.0.0",
                "orchestrator": "Live Docker Engine Active",
                "current_round": live_engine.current_round
            })
        elif path in ["/api/sim/state", "/api/state"]:
            self.send_json_response(live_engine.get_full_state())
        else:
            self.send_json_response({"error": "Not Found", "path": path}, 404)

    def do_POST(self):
        path = self.path.split("?")[0]
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            req_data = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception:
            req_data = {}

        if path == "/api/start":
            live_engine.set_running(True)
            manager.broadcast_sync({"type": "STATUS", "running": True, "state": live_engine.get_full_state()})
            self.send_json_response({"status": "running", "round": live_engine.current_round})

        elif path == "/api/stop":
            live_engine.set_running(False)
            manager.broadcast_sync({"type": "STATUS", "running": False, "state": live_engine.get_full_state()})
            self.send_json_response({"status": "stopped", "round": live_engine.current_round})

        elif path == "/api/reset":
            live_engine.reset_state()
            manager.broadcast_sync({"type": "RESET", "state": live_engine.get_full_state()})
            self.send_json_response({"status": "reset", "round": 0})

        elif path == "/api/step":
            next_st = live_engine.step_round()
            manager.broadcast_sync({
                "type": "ROUND_TICK",
                "round": next_st["currentRound"],
                "running": next_st["isRunning"],
                "state": next_st
            })
            self.send_json_response(next_st)

        elif path == "/api/condition":
            cond = req_data.get("conditionId", "F")
            live_engine.set_condition(cond)
            manager.broadcast_sync({"type": "STATE_UPDATE", "state": live_engine.get_full_state()})
            self.send_json_response({"status": "ok", "activeCondition": cond})

        elif path == "/api/inject_attack":
            atk_type = req_data.get("type", "apt29")
            next_st = live_engine.inject_attack(atk_type)
            manager.broadcast_sync({
                "type": "ROUND_TICK",
                "round": next_st["currentRound"],
                "running": next_st["isRunning"],
                "state": next_st
            })
            self.send_json_response(next_st)
        else:
            self.send_json_response({"error": "Not Found", "path": path}, 404)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SO_REUSEPORT"):
            try:
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except Exception:
                pass
        super().server_bind()


def run_standalone_server(port: int = 5050, host: str = "127.0.0.1"):
    """Starts the multi-threaded HTTP + WebSocket live backend server."""
    ensure_worker_running()
    server_address = (host, port)
    try:
        httpd = ThreadedHTTPServer(server_address, LiveApiRequestHandler)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"[ADVERSIM BACKEND] Port {port} is currently busy, attempting fallback port {port + 1}...")
            port = port + 1
            server_address = (host, port)
            httpd = ThreadedHTTPServer(server_address, LiveApiRequestHandler)
        else:
            raise e

    print(f"[ADVERSIM BACKEND] Serving Live Cyber Range Engine on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except (KeyboardInterrupt, SystemExit):
        print("[ADVERSIM BACKEND] Shutting down server...")
        _stop_worker_event.set()
        try:
            httpd.server_close()
        except Exception:
            pass


# FastAPI App Definition for compatibility
if HAS_FASTAPI:
    app = FastAPI(title="AdverSim Live API", description="Real Live Cyber Range Defense Backend")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def startup_event():
        ensure_worker_running()

    @app.get("/api/health")
    async def fastapi_health():
        return {
            "status": "ok",
            "app": "AdverSim Cyber Defense Simulator",
            "version": "4.0.0",
            "orchestrator": "Live Docker Engine Active",
            "current_round": live_engine.current_round
        }

    @app.get("/api/sim/state")
    async def fastapi_get_state():
        return live_engine.get_full_state()

    @app.post("/api/start")
    async def fastapi_start():
        live_engine.set_running(True)
        manager.broadcast({"type": "STATUS", "running": True, "state": live_engine.get_full_state()})
        return {"status": "running", "round": live_engine.current_round}

    @app.post("/api/stop")
    async def fastapi_stop():
        live_engine.set_running(False)
        manager.broadcast({"type": "STATUS", "running": False, "state": live_engine.get_full_state()})
        return {"status": "stopped", "round": live_engine.current_round}

    @app.post("/api/reset")
    async def fastapi_reset():
        live_engine.reset_state()
        manager.broadcast({"type": "RESET", "state": live_engine.get_full_state()})
        return {"status": "reset", "round": 0}

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        # Send initial full state
        await websocket.send_json({"type": "STATE_UPDATE", "state": live_engine.get_full_state()})
        try:
            while True:
                data = await websocket.receive_json()
                action = data.get("action", "")
                if action == "start":
                    live_engine.set_running(True)
                    manager.broadcast({"type": "STATUS", "running": True, "state": live_engine.get_full_state()})
                elif action == "stop":
                    live_engine.set_running(False)
                    manager.broadcast({"type": "STATUS", "running": False, "state": live_engine.get_full_state()})
                elif action == "reset":
                    live_engine.reset_state()
                    manager.broadcast({"type": "RESET", "state": live_engine.get_full_state()})
        except WebSocketDisconnect:
            manager.disconnect(websocket)
else:
    app = None


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_API_PORT", 8000))
    run_standalone_server(port=port)
