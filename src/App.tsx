import React, { useState, useEffect, useRef } from 'react';
import { SimulationEngine } from './lib/simulationEngine';
import {
  INITIAL_NODES,
  getInitialNodes,
  INITIAL_EDGES,
  ABLATION_CONDITIONS,
  INITIAL_METRICS,
  INITIAL_UCB_STATS,
  ARCHITECTURE_PRESETS,
} from './data/initialState';
import { NetworkMap } from './components/NetworkMap';
import { RadarChart } from './components/RadarChart';
import { AlertFeed } from './components/AlertFeed';
import { MTTDChart } from './components/MTTDChart';
import { PredictionPanel } from './components/PredictionPanel';
import { BanditHeatmap } from './components/BanditHeatmap';
import { ExperimentTable } from './components/ExperimentTable';
import { ArchitectureBenchmark } from './components/ArchitectureBenchmark';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { authService, UserProfile } from './lib/authService';
import { topologyService } from './lib/topologyService';
import { ConditionId, SimNode, NetworkEdge, SavedTopology } from './types';
import { soundFx } from './utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Radio,
  Layers,
  Activity,
  Zap,
  Cpu,
  Share2,
  Target,
  FastForward,
  Clock,
  ShieldAlert,
  Volume2,
  VolumeX,
  Radar,
  BrainCircuit,
  BarChart3,
  FileCheck2,
  Sliders,
  Flame,
  Crosshair,
  User,
  LogOut,
  ArrowLeft,
  Eye
} from 'lucide-react';

type ActiveTab = 'soc' | 'forecasting' | 'ablation' | 'audit';
type ViewMode = 'landing' | 'simulation';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const previousUserIdRef = useRef<string | null>(currentUser?.id || null);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    topologyService.cleanupLegacyStorage();
    const unsubscribe = authService.onAuthChange((user) => {
      const prevId = previousUserIdRef.current;
      if (prevId && user && prevId !== user.id) {
        // Logged in with a different user: reset simulation to default baseline enterprise architecture
        handleLoadPreset('default-enterprise');
      } else if (!user && prevId) {
        // Logged out: reset simulation to default baseline enterprise architecture
        handleLoadPreset('default-enterprise');
      }
      previousUserIdRef.current = user?.id || null;
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const [engine] = useState(
    () =>
      new SimulationEngine({
        isRunning: true,
        currentRound: 0,
        speedMs: 1000,
        activeCondition: 'F',
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES,
        alerts: [],
        predictions: [],
        ucbStats: INITIAL_UCB_STATS,
        metrics: INITIAL_METRICS,
        mttdHistory: [
          {
            round: 0,
            ConditionA: 142.5,
            ConditionB: 88.3,
            ConditionC: 72.1,
            ConditionD: 64.8,
            ConditionE: 27.4,
            ConditionF: 36.8,
          },
        ],
        logs: ['[SYSTEM] AdverSim Kinetic Cyber-Defense Telemetry Suite Online.'],
        attackStartRound: null,
        rollingMttdBuffer: [],
        simMttdValues: { A: 142.5, B: 88.3, C: 72.1, D: 64.8, E: 27.4 },
        totalAlertCount: 0,
      })
  );

  const [simState, setSimState] = useState(engine.getState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('soc');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-user-1');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default-enterprise');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsStatusMessage, setWsStatusMessage] = useState('Synchronizing Telemetry Channel...');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const toggleSound = () => {
    const isNowOn = soundFx.toggle();
    setSoundEnabled(isNowOn);
  };

  // WebSocket Connection Effect
  useEffect(() => {
    let ws: WebSocket | null = null;

    function getBackendWsUrl() {
      const configuredBackend = import.meta.env.VITE_BACKEND_URL as string | undefined;
      if (configuredBackend && configuredBackend.trim() !== '') {
        const cleanUrl = configuredBackend.trim().replace(/\/+$/, '');
        if (cleanUrl.startsWith('ws://') || cleanUrl.startsWith('wss://')) {
          return cleanUrl.endsWith('/ws') ? cleanUrl : `${cleanUrl}/ws`;
        }
        const wsProtocol = cleanUrl.startsWith('https://') ? 'wss://' : 'ws://';
        const hostPath = cleanUrl.replace(/^https?:\/\//, '');
        return `${wsProtocol}${hostPath}/ws`;
      }
      const isHttps = window.location.protocol === 'https:';
      const protocol = isHttps ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    }

    function connectWs() {
      const isHttps = window.location.protocol === 'https:';
      const primaryUrl = getBackendWsUrl();
      
      setWsStatusMessage(`Connecting: ${primaryUrl}`);

      try {
        ws = new WebSocket(primaryUrl);

        ws.onopen = () => {
          setWsConnected(true);
          setWsStatusMessage(`ONLINE: ${primaryUrl}`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROUND_TICK') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              } else {
                const nextState = engine.stepRound();
                setSimState({ ...nextState });
              }
              soundFx.playTick();
            } else if (data.type === 'STATE_UPDATE' || data.type === 'INIT') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              }
            } else if (data.type === 'STATUS') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              } else {
                engine.setState({ isRunning: data.running });
                setSimState({ ...engine.getState() });
              }
            } else if (data.type === 'RESET') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              } else {
                engine.setState({ isRunning: true, currentRound: 0, alerts: [] });
                setSimState({ ...engine.getState() });
              }
            }
          } catch (e) {}
        };

        ws.onerror = () => {
          if (!isHttps) {
            connectLocal8000Ws();
          } else {
            setWsConnected(false);
            setWsStatusMessage('LOCAL TELEMETRY ENGINE (ACTIVE)');
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
        };

        wsRef.current = ws;
      } catch (err) {
        if (!isHttps) connectLocal8000Ws();
      }
    }

    function connectLocal8000Ws() {
      try {
        const altWs = new WebSocket('ws://localhost:8000/ws');
        altWs.onopen = () => {
          setWsConnected(true);
          setWsStatusMessage('ONLINE: ws://localhost:8000/ws');
        };
        altWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROUND_TICK') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              } else {
                const nextState = engine.stepRound();
                setSimState({ ...nextState });
              }
              soundFx.playTick();
            } else if (data.type === 'STATE_UPDATE' || data.type === 'INIT') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              }
            } else if (data.type === 'STATUS') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              } else {
                engine.setState({ isRunning: data.running });
                setSimState({ ...engine.getState() });
              }
            } else if (data.type === 'RESET') {
              if (data.state) {
                engine.setState(data.state);
                setSimState({ ...data.state });
              }
            }
          } catch (e) {}
        };
        altWs.onerror = () => {
          setWsConnected(false);
          setWsStatusMessage('LOCAL TELEMETRY ENGINE (ACTIVE)');
        };
        wsRef.current = altWs;
      } catch (e) {
        setWsConnected(false);
        setWsStatusMessage('LOCAL TELEMETRY ENGINE (ACTIVE)');
      }
    }

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [engine]);

  // Client Simulation Ticker when running and WebSocket is disconnected (fallback)
  useEffect(() => {
    let interval: any = null;
    if (simState.isRunning && !wsConnected) {
      interval = setInterval(() => {
        const nextState = engine.stepRound();
        setSimState({ ...nextState });
        soundFx.playTick();
      }, simState.speedMs);
    }
    return () => clearInterval(interval);
  }, [simState.isRunning, simState.speedMs, engine, wsConnected]);

  // Step 1 round manually
  const handleStepOnce = async () => {
    try {
      fetch('/api/step', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/step', { method: 'POST' })
      );
    } catch (e) {}

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'step' }));
    } else {
      const nextState = engine.stepRound();
      setSimState({ ...nextState });
      soundFx.playTick();
    }
  };

  // Speed adjustments
  const handleSpeedChange = (ms: number) => {
    engine.setState({ speedMs: ms });
    setSimState({ ...engine.getState() });
  };

  // REST API Handlers for Start / Stop / Reset
  const handleStart = async () => {
    try {
      await fetch('/api/start', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/start', { method: 'POST' })
      );
    } catch (e) {}

    engine.setState({ isRunning: true });
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'start' }));
    }
  };

  const handleStop = async () => {
    try {
      await fetch('/api/stop', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/stop', { method: 'POST' })
      );
    } catch (e) {}

    engine.setState({ isRunning: false });
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/reset', { method: 'POST' })
      );
    } catch (e) {}

    engine.setState({
      isRunning: false,
      currentRound: 0,
      nodes: getInitialNodes(),
      alerts: [],
      predictions: [],
      logs: ['[SYSTEM] Telemetry buffers reset to baseline T+000.'],
      attackStartRound: null,
      rollingMttdBuffer: [],
      simMttdValues: { A: 142.5, B: 88.3, C: 72.1, D: 64.8, E: 27.4 },
      totalAlertCount: 0,
      mttdHistory: [
        {
          round: 0,
          ConditionA: 142.5,
          ConditionB: 88.3,
          ConditionC: 72.1,
          ConditionD: 64.8,
          ConditionE: 27.4,
          ConditionF: 36.8,
        },
      ],
    });
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'reset' }));
    }
  };

  const handleConditionChange = async (condId: ConditionId) => {
    engine.setState({ activeCondition: condId });
    setSimState({ ...engine.getState() });

    try {
      fetch('/api/condition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionId: condId }),
      }).catch(() =>
        fetch('http://localhost:8000/api/condition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conditionId: condId }),
        })
      );
    } catch (e) {}

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'condition', conditionId: condId }));
    }
  };

  // Attack Injection Trigger
  const handleInjectAttack = async (type: 'apt29' | 'pth' | 'exfil' | 'decoy_probe') => {
    if (type === 'decoy_probe') {
      soundFx.playHoneypotTrap();
    } else {
      soundFx.playAlert();
    }

    try {
      fetch('/api/inject_attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      }).catch(() =>
        fetch('http://localhost:8000/api/inject_attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })
      );
    } catch (e) {}

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'inject_attack', attackType: type }));
    } else {
      const nextState = engine.injectAttackScenario(type);
      setSimState({ ...nextState });
    }
  };

  // Cyber Architecture Customization Handlers
  const handleAddNode = (newNode: SimNode) => {
    const currentNodes = engine.getState().nodes;
    const currentRound = engine.getState().currentRound;
    const updatedLogs = [
      `[TOPOLOGY] Added node '${newNode.name}' (${newNode.type}). Continuing telemetry at Round ${currentRound}.`,
      ...engine.getState().logs.slice(0, 99),
    ];
    engine.setState({
      nodes: [...currentNodes, newNode],
      logs: updatedLogs,
    });
    setSimState({ ...engine.getState() });
    setSelectedNodeId(newNode.id);
    setSelectedPresetId('custom');
  };

  const handleDeleteNode = (nodeId: string) => {
    const state = engine.getState();
    const targetNode = state.nodes.find((n) => n.id === nodeId);
    const currentNodes = state.nodes.filter((n) => n.id !== nodeId);
    const currentEdges = state.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    const updatedLogs = [
      `[TOPOLOGY] Decommissioned node '${targetNode?.name || nodeId}'. Continuing telemetry at Round ${state.currentRound}.`,
      ...state.logs.slice(0, 99),
    ];
    engine.setState({
      nodes: currentNodes,
      edges: currentEdges,
      logs: updatedLogs,
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(currentNodes[0]?.id || null);
    }
    setSimState({ ...engine.getState() });
    setSelectedPresetId('custom');
  };

  const handleUpdateNode = (updatedNode: SimNode) => {
    const currentNodes = engine.getState().nodes.map((n) =>
      n.id === updatedNode.id ? updatedNode : n
    );
    engine.setState({ nodes: currentNodes });
    setSimState({ ...engine.getState() });
  };

  const handleAddEdge = (sourceId: string, targetId: string) => {
    const state = engine.getState();
    const currentEdges = state.edges;
    const exists = currentEdges.some(
      (e) =>
        (e.source === sourceId && e.target === targetId) ||
        (e.source === targetId && e.target === sourceId)
    );
    if (!exists) {
      const newEdge = { source: sourceId, target: targetId, bandwidth: '10 Gbps' };
      const updatedLogs = [
        `[TOPOLOGY] Wired link [${sourceId}] <-> [${targetId}]. Continuing telemetry at Round ${state.currentRound}.`,
        ...state.logs.slice(0, 99),
      ];
      engine.setState({
        edges: [...currentEdges, newEdge],
        logs: updatedLogs,
      });
      setSimState({ ...engine.getState() });
      setSelectedPresetId('custom');
    }
  };

  const handleDeleteEdge = (sourceId: string, targetId: string) => {
    const state = engine.getState();
    const currentEdges = state.edges.filter(
      (e) =>
        !(e.source === sourceId && e.target === targetId) &&
        !(e.source === targetId && e.target === sourceId)
    );
    const updatedLogs = [
      `[TOPOLOGY] Severed link [${sourceId}] -/- [${targetId}]. Continuing telemetry at Round ${state.currentRound}.`,
      ...state.logs.slice(0, 99),
    ];
    engine.setState({
      edges: currentEdges,
      logs: updatedLogs,
    });
    setSimState({ ...engine.getState() });
    setSelectedPresetId('custom');
  };

  const handleMoveNode = (nodeId: string, x: number, y: number) => {
    const currentNodes = engine.getState().nodes.map((n) =>
      n.id === nodeId ? { ...n, x, y } : n
    );
    engine.setState({ nodes: currentNodes });
    setSimState({ ...engine.getState() });
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = ARCHITECTURE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      // Defensive network topology changed: reset everything to start from the beginning
      const freshNodes: SimNode[] = preset.nodes.map((n) => ({
        ...n,
        status: 'normal',
        lastDetectedRound: undefined,
        compromisedSurface: undefined,
        bayesianWeights: { ...n.bayesianWeights },
      }));
      const freshEdges: NetworkEdge[] = preset.edges.map((e) => ({ ...e }));

      engine.setState({
        currentRound: 0,
        nodes: freshNodes,
        edges: freshEdges,
        alerts: [],
        predictions: [],
        rollingMttdBuffer: [],
        attackStartRound: null,
        totalAlertCount: 0,
        simMttdValues: { A: 142.5, B: 88.3, C: 72.1, D: 64.8, E: 27.4 },
        logs: [
          `[SYSTEM] Architecture reconfigured to '${preset.name}'. Simulation restarted from baseline (Round 0).`,
        ],
        mttdHistory: [
          {
            round: 0,
            ConditionA: 142.5,
            ConditionB: 88.3,
            ConditionC: 72.1,
            ConditionD: 64.8,
            ConditionE: 27.4,
            ConditionF: 36.8,
          },
        ],
      });

      setSelectedNodeId(freshNodes[0]?.id || null);
      setSelectedPresetId(presetId);
      setSimState({ ...engine.getState() });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'reset' }));
      }
    }
  };

  const handleLoadCustomTopology = (topology: SavedTopology) => {
    const freshNodes: SimNode[] = topology.nodes.map((n) => ({
      ...n,
      status: 'normal',
      lastDetectedRound: undefined,
      compromisedSurface: undefined,
      bayesianWeights: { ...(n.bayesianWeights || n.defensiveAllocation) },
      defensiveAllocation: { ...(n.defensiveAllocation || n.bayesianWeights) },
      bayesianRisk: { ...n.bayesianRisk },
    }));
    const freshEdges: NetworkEdge[] = topology.edges.map((e) => ({ ...e }));

    engine.setState({
      currentRound: 0,
      nodes: freshNodes,
      edges: freshEdges,
      alerts: [],
      predictions: [],
      rollingMttdBuffer: [],
      attackStartRound: null,
      totalAlertCount: 0,
      simMttdValues: { A: 142.5, B: 88.3, C: 72.1, D: 64.8, E: 27.4 },
      logs: [
        `[SYSTEM] Architecture reconfigured to '${topology.name}'. Simulation baseline initialized at Round 0.`,
        ...engine.getState().logs.slice(0, 99),
      ],
      mttdHistory: [
        {
          round: 0,
          ConditionA: 142.5,
          ConditionB: 88.3,
          ConditionC: 72.1,
          ConditionD: 64.8,
          ConditionE: 27.4,
          ConditionF: 36.8,
        },
      ],
    });

    setSelectedNodeId(freshNodes[0]?.id || null);
    setSelectedPresetId(topology.id || 'custom');
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'reset' }));
    }
  };

  const selectedNode: SimNode | null =
    simState.nodes.find((n) => n.id === selectedNodeId) || simState.nodes[0] || null;

  const activeCondObj = ABLATION_CONDITIONS.find((c) => c.id === simState.activeCondition);

  // Compute Fleet Defcon Status
  const nodesUnderAttack = simState.nodes.filter((n) => n.status === 'under_attack').length;
  let defconLabel = 'DEFCON-4 • NOMINAL PATROL';
  let defconColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
  if (nodesUnderAttack > 0) {
    defconLabel = `DEFCON-1 • ${nodesUnderAttack} NODES ENGAGED`;
    defconColor = 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse';
  } else if (simState.alerts.length > 0 && simState.currentRound - (simState.alerts[0]?.round || 0) < 3) {
    defconLabel = 'DEFCON-2 • ADVERSARY PROBING';
    defconColor = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
  }

  // Active MTTD for currently selected condition
  const latestMttd = simState.mttdHistory[simState.mttdHistory.length - 1] || {
    ConditionA: 142.5,
    ConditionB: 88.3,
    ConditionC: 72.1,
    ConditionD: 64.8,
    ConditionE: 27.4,
    ConditionF: 36.8,
  };
  const activeKey = `Condition${simState.activeCondition}` as keyof typeof latestMttd;
  const activeMetric = simState.metrics.find((m) => m.conditionId === simState.activeCondition);
  const activeMttd = typeof latestMttd[activeKey] === 'number'
    ? (latestMttd[activeKey] as number)
    : (activeMetric?.mttd ?? 36.8);
  const baselineA = (latestMttd.ConditionA as number) || 142.5;
  const mttdReductionPct = simState.activeCondition === 'A'
    ? 0
    : Math.max(0, Math.min(95, ((baselineA - activeMttd) / baselineA) * 100));

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: UserProfile) => {
    const prevId = previousUserIdRef.current;
    if (prevId && prevId !== user.id) {
      handleLoadPreset('default-enterprise');
    }
    previousUserIdRef.current = user.id;
    setCurrentUser(user);
    // User can either stay on landing or proceed to simulator
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    previousUserIdRef.current = null;
    topologyService.clearGuestTopologies();
    handleLoadPreset('default-enterprise');
  };

  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onEnterSimulator={() => setViewMode('simulation')}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER */}
      <header className="spacious-card p-4 md:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-2xl">
        {/* Left System Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('landing')}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 text-[11px]"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Landing</span>
          </button>
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-md flex items-center justify-center">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                AdverSim
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-agent collaborative cyber defense simulation
            </p>
          </div>
        </div>

        {/* Center Single-Line Status Strip */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded bg-slate-950 border border-slate-800/80 text-[11px] flex-wrap">
          {/* Connection Status */}
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            <span>{wsConnected ? 'Connected' : 'Local Engine'}</span>
          </span>

          <span className="text-slate-800">|</span>

          {/* Round Clock */}
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Round:</span>
            <span className="text-cyan-400 font-bold tracking-wider">
              T+{String(simState.currentRound).padStart(4, '0')}
            </span>
          </span>

          <span className="text-slate-800">|</span>

          {/* Threat Level */}
          <span className={`flex items-center gap-1.5 font-medium ${
            nodesUnderAttack > 0
              ? 'text-rose-400'
              : simState.alerts.length > 0 && simState.currentRound - (simState.alerts[0]?.round || 0) < 3
              ? 'text-amber-400'
              : 'text-slate-300'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Threat Level:</span>
            <span className="font-bold">
              {nodesUnderAttack > 0
                ? `Critical (${nodesUnderAttack} under attack)`
                : simState.alerts.length > 0 && simState.currentRound - (simState.alerts[0]?.round || 0) < 3
                ? 'Elevated'
                : 'Nominal'}
            </span>
          </span>
        </div>

        {/* Right Unified Control Cluster */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-1 text-xs gap-1 flex-wrap">
          {/* Run / Pause */}
          <button
            onClick={simState.isRunning ? handleStop : handleStart}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              simState.isRunning
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {simState.isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {simState.isRunning ? 'Pause' : 'Start'}
          </button>

          {/* Step +1 */}
          <button
            onClick={handleStepOnce}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded text-xs font-medium transition-colors"
            title="Step forward 1 round"
          >
            Step
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Speed Toggles */}
          <div className="flex items-center text-[10px]">
            {[
              { label: '0.5×', val: 2000 },
              { label: '1×', val: 1000 },
              { label: '2×', val: 500 },
              { label: '4×', val: 250 },
            ].map((spd) => (
              <button
                key={spd.val}
                onClick={() => handleSpeedChange(spd.val)}
                className={`px-1.5 py-1 rounded transition-colors ${
                  simState.speedMs === spd.val
                    ? 'text-cyan-400 font-bold bg-slate-900'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded transition-colors"
            title="Reset simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1 rounded transition-colors ${
              soundEnabled
                ? 'text-cyan-400 bg-slate-900'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Audio Muted' : 'Audio Enabled'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* User Account Session Indicator */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[10px] text-cyan-300 max-w-[100px] truncate" title={currentUser.name}>
                {currentUser.name.split(' ')[0]}
              </span>
              <button
                onClick={handleLogout}
                title="Log out session"
                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleOpenAuth('login')}
              className="px-2 py-1 text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/40 rounded transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* 2. RESTRAINED 5 KPI TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="spacious-card p-4 shadow-lg rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Time to Detect (MTTD)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-slate-900/90 text-cyan-300 border border-slate-700">
              Cond {simState.activeCondition}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-cyan-400">{activeMttd.toFixed(1)}s</span>
            <span className="text-[10px] text-slate-400">
              {simState.activeCondition === 'A'
                ? 'Baseline Reference'
                : `-${mttdReductionPct.toFixed(0)}% vs baseline A`}
            </span>
          </div>
        </div>

        <div className="spacious-card p-4 shadow-lg rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            Max UCB Regret
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-100">
              {Math.max(...simState.ucbStats.map((s) => s.ucbScore)).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">15 techniques</span>
          </div>
        </div>

        <div className="spacious-card p-4 shadow-lg rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5 font-medium">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            Mesh Connections
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-100">{simState.edges.length} Links</span>
            <span className="text-[10px] text-slate-400">Peer sharing</span>
          </div>
        </div>

        <div className="spacious-card p-4 shadow-lg rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5 font-medium">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Decoy Nodes
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-100">
              {simState.nodes.filter((n) => n.isHoneypot).length} Active
            </span>
            <span className="text-[10px] text-slate-400">Poisoning active</span>
          </div>
        </div>

        <div className="spacious-card p-4 shadow-lg rounded-xl flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Total Alerts
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-100">{simState.totalAlertCount}</span>
            <span className="text-[10px] text-slate-400">{simState.alerts.length} recent</span>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION BAR */}
      <div className="spacious-card p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-lg rounded-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-sans">
          <button
            onClick={() => setActiveTab('soc')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'soc'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Radar className="w-4 h-4" />
            <span>Topology & Threat Map</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
              activeTab === 'soc' ? 'bg-slate-900 text-cyan-400' : 'text-slate-500'
            }`}>
              {simState.nodes.length} Nodes
            </span>
          </button>

          <button
            onClick={() => setActiveTab('forecasting')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'forecasting'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Attack Forecasting & Bandit</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
              activeTab === 'forecasting' ? 'bg-slate-900 text-cyan-400' : 'text-slate-500'
            }`}>
              15 Arms
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ablation')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'ablation'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ablation & Detection Benchmarks</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
              activeTab === 'ablation' ? 'bg-slate-900 text-cyan-400' : 'text-slate-500'
            }`}>
              Cond {simState.activeCondition}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Security Audit & Event Log</span>
          </button>
        </div>

        {/* Global Condition Selector */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono border-t sm:border-t-0 sm:border-l border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
          <span className="text-slate-400 uppercase hidden md:inline">Profile:</span>
          <div className="flex items-center gap-1">
            {ABLATION_CONDITIONS.map((cond) => {
              const isSelected = simState.activeCondition === cond.id;
              return (
                <button
                  key={cond.id}
                  onClick={() => handleConditionChange(cond.id)}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title={cond.name}
                >
                  {cond.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. TAB CONTENT PANELS */}
      <main className="space-y-6">
        {/* TAB 1: TOPOLOGY & THREAT MAP */}
        {activeTab === 'soc' && (
          <div className="space-y-6">
            {/* 1. Hero Topology Canvas (Full width, clear borders, never cramped) */}
            <div className="w-full">
              <NetworkMap
                nodes={simState.nodes}
                edges={simState.edges}
                selectedNodeId={selectedNodeId}
                selectedPresetId={selectedPresetId}
                onSelectNode={setSelectedNodeId}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                onUpdateNode={handleUpdateNode}
                onAddEdge={handleAddEdge}
                onDeleteEdge={handleDeleteEdge}
                onMoveNode={handleMoveNode}
                onLoadPreset={handleLoadPreset}
                onLoadCustomTopology={handleLoadCustomTopology}
                currentUser={currentUser}
                onOpenAuthModal={() => handleOpenAuth('login')}
                onInjectAttack={handleInjectAttack}
                honeypotBroadcastActive={simState.nodes.some(n => n.isHoneypot && n.status === 'under_attack')}
                onOpenScorecard={() => setActiveTab('audit')}
              />
            </div>

            {/* 2. Secondary Telemetry Grid: 2 Equal, Spacious, Well-Bounded Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <RadarChart selectedNode={selectedNode} />
              </div>
              <div>
                <AlertFeed alerts={simState.alerts} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATTACK FORECASTING & BANDIT */}
        {activeTab === 'forecasting' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PredictionPanel predictions={simState.predictions} />
              <BanditHeatmap ucbStats={simState.ucbStats} />
            </div>
          </div>
        )}

        {/* TAB 3: ABLATION & DETECTION BENCHMARKS */}
        {activeTab === 'ablation' && (
          <div className="space-y-6">
            <MTTDChart history={simState.mttdHistory} activeCondition={simState.activeCondition} />
            <ExperimentTable
              metrics={simState.metrics}
              activeCondition={simState.activeCondition}
              onSelectCondition={handleConditionChange}
            />
          </div>
        )}

        {/* TAB 4: SECURITY AUDIT & EVENT LOG */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <ArchitectureBenchmark
              nodes={simState.nodes}
              edges={simState.edges}
              metrics={simState.metrics}
              currentRound={simState.currentRound}
              mttdHistory={simState.mttdHistory}
              alerts={simState.alerts}
              predictions={simState.predictions}
              activeCondition={simState.activeCondition}
              selectedPresetId={selectedPresetId}
            />

            {/* Simulation Event Log */}
            <div className="spacious-card shadow-2xl rounded-2xl p-4 sm:p-5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Simulation Event Log</span>
                </div>
                <span className="text-[10px] text-slate-400">10-Tick Verification Audits</span>
              </div>

              <div className="h-64 overflow-y-auto bg-slate-950 p-3 rounded border border-slate-800/80 space-y-1.5 mt-3 text-[11px]">
                {simState.logs.map((log, i) => {
                  const isVerification = log.includes('VERIFICATION') || log.includes('MTTD');
                  const isAlert = log.includes('ALERT');
                  const isHoneypot = log.includes('HONEYPOT');
                  const isInject = log.includes('MANUAL INJECTION');
                  return (
                    <div
                      key={i}
                      className={
                        isAlert
                          ? 'text-rose-400'
                          : isVerification
                          ? 'text-amber-400'
                          : isHoneypot
                          ? 'text-emerald-400'
                          : isInject
                          ? 'text-cyan-400 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Authentication Modal accessible across all views and modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
