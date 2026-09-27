import express from 'express';
import http from 'http';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const PYTHON_PORT = Number(process.env.PYTHON_PORT) || 8000;

// Cache of latest simulation state relayed from genuine Python backend
let latestBackendState: any = null;
let pythonProcess: ChildProcess | null = null;
let backendWsClient: WebSocket | null = null;
let isReconnectingBackend = false;

// 1. Spawn and supervise Python Live Cyber-Range Backend
function startPythonBackend() {
  if (pythonProcess) return;

  console.log('[BACKEND PROCESS] Launching Live Python Cyber-Range Orchestrator on port 8000...');
  pythonProcess = spawn('python3', ['-m', 'simulation.api.main'], {
    env: { ...process.env, PYTHON_API_PORT: String(PYTHON_PORT) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[BACKEND PROCESS] Python backend process exited with code ${code} signal ${signal}. Restarting in 2s...`);
    pythonProcess = null;
    setTimeout(startPythonBackend, 2000);
  });

  pythonProcess.on('error', (err) => {
    console.error('[BACKEND PROCESS] Error spawning python backend:', err);
    pythonProcess = null;
  });
}

// 2. Main Server Setup
async function startServer() {
  const app = express();
  app.use(express.json());

  // Start Python Cyber-Range Backend Daemon
  startPythonBackend();

  // Create HTTP Server
  const server = http.createServer(app);

  // WebSocket Server setup on /ws for browser clients
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcastToBrowserClients(rawMessage: string) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(rawMessage);
      }
    });
  }

  // 3. Connect as a WebSocket client to genuine Python FastAPI / Live Backend
  function connectToPythonBackendWs() {
    if (backendWsClient && (backendWsClient.readyState === WebSocket.OPEN || backendWsClient.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const targetUrl = `ws://127.0.0.1:${PYTHON_PORT}/ws`;
      backendWsClient = new WebSocket(targetUrl);

      backendWsClient.on('open', () => {
        console.log(`[BACKEND WS CLIENT] Successfully connected to live Python backend at ${targetUrl}`);
        isReconnectingBackend = false;
      });

      backendWsClient.on('message', (data: any) => {
        const rawStr = data.toString();
        try {
          const parsed = JSON.parse(rawStr);
          if (parsed.state) {
            latestBackendState = parsed.state;
          }
        } catch (e) {}

        // Relay live genuine backend event immediately to all active dashboard browsers
        broadcastToBrowserClients(rawStr);
      });

      backendWsClient.on('close', () => {
        backendWsClient = null;
        scheduleBackendWsReconnect();
      });

      backendWsClient.on('error', () => {
        backendWsClient = null;
        scheduleBackendWsReconnect();
      });
    } catch (err) {
      scheduleBackendWsReconnect();
    }
  }

  function scheduleBackendWsReconnect() {
    if (!isReconnectingBackend) {
      isReconnectingBackend = true;
      setTimeout(() => {
        isReconnectingBackend = false;
        connectToPythonBackendWs();
      }, 1500);
    }
  }

  // Kick off WebSocket connection to Python backend
  setTimeout(connectToPythonBackendWs, 1000);

  // 4. Browser WebSocket Connection Handling
  wss.on('connection', (ws: WebSocket) => {
    // Send immediate initial state if available
    if (latestBackendState) {
      ws.send(JSON.stringify({ type: 'STATE_UPDATE', state: latestBackendState }));
    }

    // Forward browser client messages directly to Python backend
    ws.on('message', (msg: any) => {
      const strMsg = msg.toString();
      if (backendWsClient && backendWsClient.readyState === WebSocket.OPEN) {
        backendWsClient.send(strMsg);
      } else {
        // Queue or attempt connect if disconnected
        connectToPythonBackendWs();
      }
    });
  });

  // 5. REST API Proxies to Python Live Backend
  async function forwardToPython(
    reqPath: string,
    method: string = 'GET',
    body?: any
  ): Promise<{ status: number; data: any }> {
    try {
      const fetchUrl = `http://127.0.0.1:${PYTHON_PORT}${reqPath}`;
      const options: any = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(fetchUrl, options);
      const json = await res.json();
      return { status: res.status, data: json };
    } catch (err: any) {
      return {
        status: 503,
        data: { error: 'Python backend connecting...', details: err.message },
      };
    }
  }

  // Health Endpoint
  app.get('/api/health', async (req, res) => {
    const pyHealth = await forwardToPython('/api/health');
    res.status(pyHealth.status).json({
      nodeServer: 'online',
      port: PORT,
      pythonBackend: pyHealth.data,
      time: new Date().toISOString(),
    });
  });

  // State Endpoint
  app.get('/api/sim/state', async (req, res) => {
    const pyRes = await forwardToPython('/api/sim/state');
    if (pyRes.status === 200 && pyRes.data) {
      latestBackendState = pyRes.data;
      return res.json(pyRes.data);
    }
    if (latestBackendState) {
      return res.json(latestBackendState);
    }
    res.status(pyRes.status).json(pyRes.data);
  });

  app.get('/api/state', async (req, res) => {
    const pyRes = await forwardToPython('/api/sim/state');
    res.status(pyRes.status).json(pyRes.data || latestBackendState);
  });

  // Control Endpoints (Start / Stop / Reset / Step / Condition / Inject)
  const proxyHandler = (endpoint: string, method: string = 'POST') => {
    return async (req: express.Request, res: express.Response) => {
      const pyRes = await forwardToPython(endpoint, method, req.body);
      res.status(pyRes.status).json(pyRes.data);
    };
  };

  app.all('/api/start', proxyHandler('/api/start', 'POST'));
  app.all('/api/sim/start', proxyHandler('/api/start', 'POST'));
  app.all('/api/stop', proxyHandler('/api/stop', 'POST'));
  app.all('/api/sim/stop', proxyHandler('/api/stop', 'POST'));
  app.all('/api/reset', proxyHandler('/api/reset', 'POST'));
  app.all('/api/sim/reset', proxyHandler('/api/reset', 'POST'));
  app.all('/api/step', proxyHandler('/api/step', 'POST'));
  app.all('/api/condition', proxyHandler('/api/condition', 'POST'));
  app.all('/api/inject_attack', proxyHandler('/api/inject_attack', 'POST'));

  // 6. Vite middleware for frontend development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AdverSim Full-Stack Bridge running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
