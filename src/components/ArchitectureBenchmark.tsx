import React, { useState, useEffect, useMemo } from 'react';
import { SimNode, NetworkEdge, AblationMetric, AlertEvent, StagePrediction } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Share2,
  Target,
  CheckCircle2,
  XCircle,
  Activity,
  Award,
  Zap,
  Gauge,
  Maximize2,
  Minimize2,
  Server,
  Network,
} from 'lucide-react';

interface ArchitectureBenchmarkProps {
  nodes: SimNode[];
  edges: NetworkEdge[];
  metrics?: AblationMetric[];
  currentRound: number;
  mttdHistory?: {
    round: number;
    ConditionA: number;
    ConditionB: number;
    ConditionC: number;
    ConditionD: number;
    ConditionE: number;
    ConditionF: number;
  }[];
  alerts?: AlertEvent[];
  predictions?: StagePrediction[];
  activeCondition?: string;
  selectedPresetId?: string;
  displayMode?: 'tactical' | 'executive';
}

export const ArchitectureBenchmark: React.FC<ArchitectureBenchmarkProps> = ({
  nodes,
  edges,
  metrics = [],
  currentRound,
  mttdHistory = [],
  alerts = [],
  predictions = [],
  activeCondition = 'F',
  selectedPresetId,
  displayMode = 'tactical',
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle ESC key and prevent body scrolling when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Comprehensive Live Architectural Graph & Security Analysis
  const analysis = useMemo(() => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const nodeMap = new Map<string, SimNode>(nodes.map((n) => [n.id, n]));

    // 1. Degree map and isolated nodes
    const degreeMap = new Map<string, number>();
    nodes.forEach((n) => degreeMap.set(n.id, 0));
    edges.forEach((e) => {
      if (degreeMap.has(e.source)) degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
      if (degreeMap.has(e.target)) degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
    });

    const isolatedNodes = nodes.filter((n) => (degreeMap.get(n.id) || 0) === 0);

    // 2. Connected components (Graph partitioning check)
    const visited = new Set<string>();
    let componentCount = 0;
    nodes.forEach((n) => {
      if (!visited.has(n.id)) {
        componentCount++;
        const queue = [n.id];
        visited.add(n.id);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          edges.forEach((e) => {
            const nbr = e.source === curr ? e.target : e.target === curr ? e.source : null;
            if (nbr && nodeMap.has(nbr) && !visited.has(nbr)) {
              visited.add(nbr);
              queue.push(nbr);
            }
          });
        }
      }
    });

    // 3. Sharing Density & Average Connectivity
    const totalPossibleEdges = nodeCount > 1 ? (nodeCount * (nodeCount - 1)) / 2 : 0;
    const sharingDensityRatio = totalPossibleEdges > 0 ? edgeCount / totalPossibleEdges : 0;
    const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

    // 4. Decoy / Honeypot analysis
    const honeypots = nodes.filter((n) => n.isHoneypot);
    const honeypotRatio = nodeCount > 0 ? honeypots.length / nodeCount : 0;
    const connectedHoneypots = honeypots.filter((h) => (degreeMap.get(h.id) || 0) > 0);
    const honeypotsNearCritical = honeypots.filter((h) =>
      edges.some((e) => {
        const otherId = e.source === h.id ? e.target : e.target === h.id ? e.source : null;
        if (!otherId) return false;
        const otherNode = nodeMap.get(otherId);
        return otherNode && (otherNode.type === 'User' || otherNode.type === 'Server');
      })
    );

    // 5. Node categorization
    const userNodes = nodes.filter((n) => n.type === 'User');
    const serverNodes = nodes.filter((n) => n.type === 'Server');
    const adminNodes = nodes.filter((n) => n.type === 'Admin');
    const dmzNodes = nodes.filter((n) => n.type === 'DMZ');
    const socNodes = nodes.filter((n) => n.type === 'SOC');

    // 6. Cross-segment edge analysis
    const userToAdminEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return (src?.type === 'User' && tgt?.type === 'Admin') || (src?.type === 'Admin' && tgt?.type === 'User');
    });

    const userToUserEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src?.type === 'User' && tgt?.type === 'User';
    });

    const userToServerEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return (src?.type === 'User' && tgt?.type === 'Server') || (src?.type === 'Server' && tgt?.type === 'User');
    });

    const dmzLinks = edges.filter((e) =>
      dmzNodes.some((d) => d.id === e.source || d.id === e.target)
    );

    const socLinks = edges.filter((e) =>
      socNodes.some((s) => s.id === e.source || s.id === e.target)
    );

    // 7. Sensor Noise Floor (Average False Positive Rate)
    const avgFpr = nodeCount > 0 ? nodes.reduce((sum, n) => sum + (n.fpr || 0.01), 0) / nodeCount : 0.01;

    // 8. Live Dynamic MTTD (Detection Velocity) calculation
    // Combines baseline empirical MTTD with architectural graph factors
    const latestHist = mttdHistory.length > 0 ? mttdHistory[mttdHistory.length - 1] : null;
    let baseMttd = 36.8;
    if (activeCondition === 'A') baseMttd = latestHist?.ConditionA ?? 142.5;
    else if (activeCondition === 'B') baseMttd = latestHist?.ConditionB ?? 88.3;
    else if (activeCondition === 'C') baseMttd = latestHist?.ConditionC ?? 72.1;
    else if (activeCondition === 'D') baseMttd = latestHist?.ConditionD ?? 64.8;
    else if (activeCondition === 'E') baseMttd = latestHist?.ConditionE ?? 27.4;
    else baseMttd = latestHist?.ConditionF ?? 36.8;

    // Architectural adjustment factors
    let archMttdFactor = 1.0;
    if (sharingDensityRatio >= 0.3) archMttdFactor -= 0.18; // High sharing accelerates consensus
    else if (sharingDensityRatio < 0.15) archMttdFactor += 0.20; // Sparse graph slows sharing

    if (honeypotRatio >= 0.25) archMttdFactor -= 0.22; // Rich decoys trigger fast early trips
    else if (honeypotRatio > 0) archMttdFactor -= 0.10;
    else archMttdFactor += 0.25; // No honeypots causes blind exploration

    if (socNodes.length > 0 && socLinks.length >= Math.min(3, nodeCount - 1)) {
      archMttdFactor -= 0.12; // Centralized SOC hub coordinates alerts
    }

    if (isolatedNodes.length > 0) {
      archMttdFactor += isolatedNodes.length * 0.14; // Blind spots delay detection
    }

    if (userToAdminEdges.length > 0) {
      archMttdFactor += 0.20; // Attacker can compromise domain controller instantly
    }

    if (componentCount > 1) {
      archMttdFactor += (componentCount - 1) * 0.15; // Partitioned telemetry
    }

    const liveMttd = Math.max(7.5, Number((baseMttd * Math.max(0.3, archMttdFactor)).toFixed(1)));

    // 9. Live Prediction Accuracy calculation
    let baseAccuracy = 0.82;
    if (honeypotRatio >= 0.25) baseAccuracy += 0.08;
    else if (honeypotRatio === 0) baseAccuracy -= 0.08;

    if (sharingDensityRatio >= 0.25) baseAccuracy += 0.05;
    else if (sharingDensityRatio < 0.15) baseAccuracy -= 0.06;

    if (isolatedNodes.length > 0) baseAccuracy -= isolatedNodes.length * 0.05;
    if (componentCount > 1) baseAccuracy -= 0.08;
    if (avgFpr > 0.02) baseAccuracy -= 0.04;

    // Blend with real-time predictions if active
    if (predictions.length > 0) {
      const livePredSum = predictions.slice(0, 6).reduce((acc, p) => acc + (p.probability || 0.8), 0);
      const livePredAvg = livePredSum / Math.min(6, predictions.length);
      baseAccuracy = 0.6 * baseAccuracy + 0.4 * livePredAvg;
    }

    const liveAccuracy = Math.min(0.97, Math.max(0.42, baseAccuracy));

    // 10. Dynamic Scoring, Strengths, and Vulnerabilities
    let score = 100;
    const strengths: string[] = [];
    const flaws: string[] = [];

    // Evaluate Disconnected / Isolated Nodes
    if (isolatedNodes.length > 0) {
      score -= isolatedNodes.length * 15;
      isolatedNodes.forEach((n) => {
        flaws.push(
          `Disconnected Node [${n.name}]: Has 0 telemetry links and cannot receive threat intelligence or relay alerts.`
        );
      });
    }

    // Evaluate Admin Security & Pass-the-Hash exposure
    if (userToAdminEdges.length > 0) {
      score -= 22;
      flaws.push(
        `Direct User-to-Admin Exposure (${userToAdminEdges.length} link${
          userToAdminEdges.length > 1 ? 's' : ''
        }): Critical risk of Pass-the-Hash (T1550) & credential harvesting.`
      );
    } else if (adminNodes.length > 0 && userNodes.length > 0) {
      strengths.push(
        'Admin Controller Microsegmentation: Zero direct User-to-Admin paths; domain controller is shielded behind intermediate tiers.'
      );
    }

    // Evaluate Decoy / Honeypot Deception
    if (honeypots.length === 0) {
      score -= 20;
      flaws.push(
        'Zero Decoy Deception: 0% honeypot presence allows adversary UCB bandit to freely map genuine assets without penalty.'
      );
    } else {
      strengths.push(
        `Active Decoy Deception (${(honeypotRatio * 100).toFixed(0)}% Fleet Density): ${
          honeypots.length
        } inline trap(s) poison adversary reinforcement learning.`
      );

      const unlinkedHps = honeypots.filter((h) => (degreeMap.get(h.id) || 0) === 0);
      if (unlinkedHps.length > 0) {
        score -= unlinkedHps.length * 10;
        unlinkedHps.forEach((h) => {
          flaws.push(
            `Unlinked Decoy Trap [${h.name}]: Honeypot has no connected links and cannot intercept lateral adversary probes.`
          );
        });
      }

      if (honeypotsNearCritical.length > 0) {
        strengths.push(
          `Early-Warning Inline Traps: ${honeypotsNearCritical.length} decoy(s) inline with user/server pathways capture initial probes.`
        );
      }
    }

    // Evaluate Workstation Lateral Isolation (Zero-Trust)
    if (userToUserEdges.length > 0) {
      score -= 14;
      flaws.push(
        `Peer Workstation Interconnect (${userToUserEdges.length} link${
          userToUserEdges.length > 1 ? 's' : ''
        }): Direct user-to-user links allow lateral worm and ransomware propagation.`
      );
    } else if (userNodes.length >= 2) {
      strengths.push(
        'Zero-Trust Workstation Isolation: Peer-to-peer workstation traffic is blocked, containing automated worm spread.'
      );
    }

    // Evaluate DMZ Perimeter Protection
    if (dmzNodes.length > 0 && dmzLinks.length > 0) {
      strengths.push(
        'DMZ Perimeter Ingress Filtering: External access is mediated through dedicated gateway proxy assets.'
      );
      if (userToServerEdges.length > 2) {
        score -= 10;
        flaws.push(
          `Bypassed DMZ Perimeter (${userToServerEdges.length} links): User workstations directly access core server clusters without DMZ inspection.`
        );
      }
    } else if (nodeCount >= 5 && dmzNodes.length === 0) {
      score -= 12;
      flaws.push(
        'Flat Perimeter: Absence of a DMZ gateway leaves internal server assets directly exposed to perimeter scanning.'
      );
    }

    // Evaluate Centralized SOC Relay Hub
    if (socNodes.length > 0) {
      if (socLinks.length >= Math.min(3, nodeCount - 1)) {
        strengths.push(
          'Centralized SOC Relay Hub: High-capacity security hub coordinates authoritative Bayesian weight fusion.'
        );
      } else {
        score -= 8;
        flaws.push(
          `Under-Linked SOC Hub: Security Operations Center has only ${socLinks.length} link(s), throttling risk coordination.`
        );
      }
    } else if (nodeCount >= 6) {
      flaws.push(
        'Decentralized Telemetry: No dedicated SOC Relay Hub; fleet relies solely on pairwise gossip propagation.'
      );
    }

    // Evaluate Graph Partitioning & Mesh Redundancy
    if (componentCount > 1) {
      score -= (componentCount - 1) * 16;
      flaws.push(
        `Fragmented Network (${componentCount} isolated subnets): Subnet partitioning halts cross-fleet Bayesian synchronization.`
      );
    } else if (nodeCount >= 4) {
      strengths.push(
        `Contiguous Telemetry Fabric: All ${nodeCount} nodes participate in unified, unbroken threat intelligence sharing.`
      );
    }

    if (sharingDensityRatio >= 0.3) {
      strengths.push(
        `High Mesh Redundancy (${(sharingDensityRatio * 100).toFixed(0)}% Mesh): Redundant inter-node paths resist single link failures.`
      );
    } else if (edgeCount < nodeCount - 1 && componentCount === 1) {
      score -= 10;
      flaws.push(
        `Sub-Optimal Link Provisioning (${edgeCount} links for ${nodeCount} nodes): Insufficient connectivity introduces relay bottlenecks.`
      );
    }

    // Evaluate Detection Velocity & Sensor Fidelity
    if (liveMttd <= 35) {
      strengths.push(`Fast Detection Velocity (MTTD: ${liveMttd}s): Attacks are identified before lateral consolidation.`);
    } else if (liveMttd > 55) {
      score -= 15;
      flaws.push(`Sluggish Detection Velocity (MTTD: ${liveMttd}s): Delayed triage gives attackers time to establish persistence.`);
    }

    if (avgFpr <= 0.012 && nodeCount >= 3) {
      strengths.push(
        `High Sensor Fidelity: Low fleet average False Positive Rate (${(avgFpr * 100).toFixed(2)}%) minimizes analyst triage noise.`
      );
    } else if (avgFpr > 0.025) {
      score -= 8;
      flaws.push(
        `Elevated Fleet Noise Floor (FPR ${(avgFpr * 100).toFixed(2)}%): High sensor noise increases triage fatigue and false alarms.`
      );
    }

    // Ensure score bounds
    score = Math.max(12, Math.min(100, Math.round(score)));

    // Compute letter grade and status styling
    let grade = 'A+';
    let gradeColor = 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40';
    let viabilityText = 'HIGH PRODUCTION RESILIENCE';

    if (score < 50) {
      grade = 'F';
      gradeColor = 'text-rose-300 border-rose-500/40 bg-rose-950/40';
      viabilityText = 'CRITICAL FAILURE RISK';
    } else if (score < 65) {
      grade = 'D';
      gradeColor = 'text-orange-300 border-orange-500/40 bg-orange-950/40';
      viabilityText = 'HIGH EXPLOITATION VULNERABILITY';
    } else if (score < 80) {
      grade = 'C';
      gradeColor = 'text-amber-300 border-amber-500/40 bg-amber-950/40';
      viabilityText = 'MODERATE REAL-WORLD EXPOSURE';
    } else if (score < 90) {
      grade = 'B';
      gradeColor = 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40';
      viabilityText = 'SOLID DEFENSIVE POSTURE';
    } else if (score < 96) {
      grade = 'A';
      gradeColor = 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40';
      viabilityText = 'STRONG DEFENSIVE POSTURE';
    }

    return {
      nodeCount,
      edgeCount,
      sharingDensityRatio,
      avgDegree,
      honeypots,
      honeypotRatio,
      liveMttd,
      liveAccuracy,
      score,
      grade,
      gradeColor,
      viabilityText,
      strengths,
      flaws,
      isolatedNodes,
    };
  }, [nodes, edges, metrics, currentRound, mttdHistory, alerts, predictions, activeCondition]);

  const panelContent = (
    <div
      ref={containerRef}
      className={`rounded-2xl p-4 sm:p-6 flex flex-col gap-3 text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-y-auto shadow-2xl w-screen h-screen justify-between'
          : 'spacious-card shadow-2xl'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`${
                isFullscreen ? 'text-sm' : 'text-xs'
              } font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}
            >
              <Network className="w-4 h-4 text-cyan-400" />
              Topology & Resilience Scorecard
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-cyan-400 border border-cyan-500/30 font-semibold animate-pulse">
              LIVE AUDIT ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded border flex items-center gap-2 font-semibold ${analysis.gradeColor}`}>
            <span className="text-sm tracking-wide">GRADE {analysis.grade}</span>
            <span className="text-[10px] text-slate-300 font-normal">({analysis.score}/100)</span>
          </div>

          {/* Expand / Minimize Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
              isFullscreen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Scorecard to Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Scorecard to Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 ${isFullscreen ? 'my-2' : ''}`}>
        {/* Card 1: Sharing Density */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            Sharing Density
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {analysis.edgeCount} <span className="text-[10px] text-slate-500 font-normal">Links</span>
            </span>
            <span className="text-xs font-semibold text-cyan-400">
              {(analysis.sharingDensityRatio * 100).toFixed(0)}% Mesh
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Avg Connectivity</span>
            <span className="text-slate-300 font-mono">{analysis.avgDegree.toFixed(1)} links/node</span>
          </div>
        </div>

        {/* Card 2: Decoy Ratio */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            Decoy Deception Ratio
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {analysis.honeypots.length} <span className="text-[10px] text-slate-500 font-normal">Decoys</span>
            </span>
            <span
              className={`text-xs font-semibold ${
                analysis.honeypotRatio >= 0.2 ? 'text-teal-400' : analysis.honeypotRatio > 0 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {(analysis.honeypotRatio * 100).toFixed(0)}% Fleet
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Decoy Traps</span>
            <span className="text-slate-300 font-mono">
              {analysis.honeypots.length > 0 ? `${analysis.honeypots.length} Active inline` : '0 (Exposed)'}
            </span>
          </div>
        </div>

        {/* Card 3: Detection Velocity (MTTD) */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Detection Velocity
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {analysis.liveMttd.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">s</span>
            </span>
            <span
              className={`text-xs font-semibold ${
                analysis.liveMttd <= 35 ? 'text-emerald-400' : analysis.liveMttd <= 55 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {analysis.liveMttd <= 35 ? 'Optimal' : analysis.liveMttd <= 55 ? 'Nominal' : 'Delayed'}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Live Latency</span>
            <span className="text-slate-300 font-mono">
              {analysis.liveMttd < 40 ? 'High Speed' : 'Vulnerable Delay'}
            </span>
          </div>
        </div>

        {/* Card 4: Prediction Accuracy */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Prediction Accuracy
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {(analysis.liveAccuracy * 100).toFixed(0)}%
            </span>
            <span
              className={`text-xs font-semibold ${
                analysis.liveAccuracy >= 0.88 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {analysis.liveAccuracy >= 0.88 ? 'High Fidelity' : 'Degraded'}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Stage Forecast</span>
            <span className="text-slate-300 font-mono">
              {predictions.length > 0 ? `${predictions.length} predictions` : 'Bayesian Model'}
            </span>
          </div>
        </div>
      </div>

      {/* Strengths & Vulnerabilities Diagnostic Strip */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isFullscreen ? 'flex-1 my-2' : ''}`}>
        {/* Strengths */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2 flex flex-col">
          <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Defensive Strengths ({analysis.strengths.length})
            </span>
            <span className="text-[10px] text-emerald-500/80 font-normal">Auto-Updated Live</span>
          </div>
          {analysis.strengths.length === 0 ? (
            <p className="text-slate-500 text-[11px] italic py-2">
              No key defensive strengths detected in current configuration. Add decoys or segment nodes to improve posture.
            </p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 max-h-56">
              {analysis.strengths.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-semibold mt-0.5">›</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vulnerabilities */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2 flex flex-col">
          <div className="text-xs font-semibold text-rose-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              Structural Vulnerabilities ({analysis.flaws.length})
            </span>
            <span className="text-[10px] text-rose-500/80 font-normal">Auto-Updated Live</span>
          </div>
          {analysis.flaws.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero critical structural vulnerabilities detected in current architecture.</span>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 max-h-56">
              {analysis.flaws.map((f, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-rose-400 font-semibold mt-0.5">›</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] font-mono text-slate-400 gap-1.5">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
          <span className="text-slate-200 font-semibold">Topology Scorecard:</span>
          <span className="text-slate-400">
            {analysis.nodeCount} nodes, {analysis.edgeCount} links, Round {currentRound}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {analysis.flaws.length === 0 ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Security Invariants Verified
            </span>
          ) : (
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {analysis.flaws.length} Structural Invariant Violation
              {analysis.flaws.length > 1 ? 's' : ''} Identified
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return panelContent;
};

export default ArchitectureBenchmark;
