import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertEvent } from '../types';
import {
  ShieldAlert,
  Terminal,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Filter,
  Target,
  Zap,
  Maximize2,
  Minimize2,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface AlertFeedProps {
  alerts: AlertEvent[];
  displayMode?: 'tactical' | 'executive';
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts, displayMode = 'tactical' }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'HONEYPOT' | 'REJECTED' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle ESC key when in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterMode === 'HONEYPOT' && !alert.isHoneypotCapture) return false;
    if (filterMode === 'REJECTED' && !alert.rejectedByConsistency) return false;
    const isCrit = (alert.threatSeverity ?? alert.fusedScore) >= 0.70;
    if (filterMode === 'CRITICAL' && !isCrit) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alert.nodeName.toLowerCase().includes(q) ||
        alert.mitreCode.toLowerCase().includes(q) ||
        alert.killChainStage.toLowerCase().includes(q) ||
        alert.attackerProfile.toLowerCase().includes(q) ||
        alert.actionTaken.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const honeypotCount = alerts.filter((a) => a.isHoneypotCapture).length;
  const rejectedCount = alerts.filter((a) => a.rejectedByConsistency).length;
  const criticalCount = alerts.filter((a) => (a.threatSeverity ?? a.fusedScore) >= 0.70).length;

  const panelContent = (
    <div
      ref={containerRef}
      className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'spacious-card h-[490px] shadow-2xl'
      }`}
    >
      {/* Panel Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}>
              Threat Alerts
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-cyan-400 border border-slate-800">
                Expanded View
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
              {alerts.length} Events
            </span>

            {/* Fullscreen Expand / Minimize Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
                isFullscreen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Alerts to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Alerts to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5">
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono flex-1">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`py-1 px-1 rounded text-center transition-colors font-medium truncate ${
                filterMode === 'ALL'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({alerts.length})
            </button>

            <button
              onClick={() => setFilterMode('HONEYPOT')}
              className={`py-1 px-1 rounded text-center transition-colors font-medium truncate ${
                filterMode === 'HONEYPOT'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Decoys ({honeypotCount})
            </button>

            <button
              onClick={() => setFilterMode('REJECTED')}
              className={`py-1 px-1 rounded text-center transition-colors font-medium truncate ${
                filterMode === 'REJECTED'
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Filtered ({rejectedCount})
            </button>

            <button
              onClick={() => setFilterMode('CRITICAL')}
              className={`py-1 px-1 rounded text-center transition-colors font-medium truncate ${
                filterMode === 'CRITICAL'
                  ? 'bg-slate-800 text-rose-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical ({criticalCount})
            </button>
          </div>

          {isFullscreen && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by node, MITRE code, stage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rolling Alert Stream */}
      <div className={`flex-1 overflow-y-auto space-y-2 pr-1 mt-2.5 min-h-0 ${isFullscreen ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0' : ''}`}>
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 font-mono text-xs col-span-full py-12">
            <Radio className="w-5 h-5 text-slate-600" />
            <span>No alerts matching selected filter</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            let borderStyle = 'border-slate-800 bg-slate-950 text-slate-300';
            let tagColor = 'bg-slate-900 text-cyan-400 border-slate-800';
            let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />;

            const effectiveSeverity = alert.threatSeverity ?? alert.fusedScore;
            const isCriticalThreat = effectiveSeverity >= 0.70;

            if (alert.rejectedByConsistency) {
              borderStyle = 'border-amber-500/30 bg-amber-950/20 text-amber-200';
              tagColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            } else if (alert.isHoneypotCapture) {
              borderStyle = 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200';
              tagColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              statusIcon = <Zap className="w-3.5 h-3.5 text-emerald-400" />;
            } else if (isCriticalThreat) {
              borderStyle = 'border-rose-500/40 bg-rose-950/20 text-rose-100';
              tagColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              statusIcon = <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
            }

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded border text-xs font-mono transition-colors ${borderStyle}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                      R{alert.round}
                    </span>
                    <span className="text-slate-400 text-[10px]">{alert.timestamp}</span>
                  </div>

                  <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] border ${tagColor}`}>
                    {alert.mitreCode}
                  </span>
                </div>

                {/* Node Target & MITRE Technique Progression */}
                <div className="flex items-baseline justify-between my-1">
                  <span className="font-semibold text-slate-100 text-[11px] truncate max-w-[170px]">
                    {alert.nodeName}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {alert.killChainStage}
                  </span>
                </div>

                {/* Score Barometer & Profile Vector */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/80">
                  <span className="truncate max-w-[130px]">
                    Adv: <strong className="text-slate-300 font-normal">{alert.attackerProfile.replace(/\s*\([^)]*\)/g, '')}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span title="Anomaly Detector Fused Output">
                      Fused: <strong className="text-slate-200">{(alert.fusedScore * 100).toFixed(0)}%</strong>
                    </span>
                    <span title="Evidence-based Threat Severity">
                      Severity: <strong className={isCriticalThreat ? 'text-rose-400' : effectiveSeverity >= 0.50 ? 'text-amber-400' : 'text-cyan-400'}>
                        {(effectiveSeverity * 100).toFixed(0)}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Action Taken */}
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-slate-300">
                  {statusIcon}
                  <span className="truncate">{alert.actionTaken}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Active Monitor
        </span>
        <span className="text-slate-500">{alerts.length} Total</span>
      </div>
    </div>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(panelContent, document.body);
  }

  return panelContent;
};

export default AlertFeed;
