import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Zap, TrendingDown, ArrowDownRight, Maximize2, Minimize2, BarChart2 } from 'lucide-react';
import { ConditionId } from '../types';

interface MTTDChartProps {
  history: { round: number; [key: string]: number }[];
  activeCondition?: ConditionId;
}

export const MTTDChart: React.FC<MTTDChartProps> = ({ history, activeCondition = 'F' }) => {
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

  const latest = history[history.length - 1] || {
    ConditionA: 142.5,
    ConditionB: 88.3,
    ConditionC: 72.1,
    ConditionD: 64.8,
    ConditionE: 27.4,
    ConditionF: 36.8,
  };

  const activeKey = `Condition${activeCondition}`;
  const baselineA = latest.ConditionA || 142.5;
  const currentActive = typeof latest[activeKey] === 'number' ? latest[activeKey] : (latest.ConditionF || 36.8);
  const reductionPct = activeCondition === 'A'
    ? 0
    : Math.max(0, Math.min(95, ((baselineA - currentActive) / baselineA) * 100));

  const panelContent = (
    <div
      ref={containerRef}
      className={`bg-[#0b1120] border border-slate-800 rounded-lg p-4 flex flex-col justify-between text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'h-[440px]'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}>
              Mean Time to Detect (MTTD)
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-cyan-400 border border-slate-800">
                Full Timeline
              </span>
            )}
          </div>

          {/* Real-time Advantage & Fullscreen Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1 font-semibold text-[11px] ${
              activeCondition === 'A' ? 'text-slate-400' : 'text-emerald-400'
            }`}>
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                {activeCondition === 'A' ? 'Baseline Reference' : `${reductionPct.toFixed(1)}% Time Reduction`}
              </span>
            </div>
            <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px]">
              Active (Cond {activeCondition}): <strong className="text-cyan-400">{currentActive.toFixed(1)}s</strong> vs Baseline: <strong className="text-slate-400">{baselineA.toFixed(1)}s</strong>
            </span>

            {/* Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
                isFullscreen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand MTTD Graph to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand MTTD Graph to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={`w-full min-w-0 my-2 ${isFullscreen ? 'flex-1 min-h-[350px]' : 'h-[280px] min-h-[280px]'}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={history} margin={{ top: 10, right: 20, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="round"
              stroke="#64748b"
              tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              label={{ value: 'Simulation Round', position: 'insideBottomRight', offset: -4, fill: '#475569', fontSize: 9 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              label={{ value: 'MTTD (seconds)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0b1120',
                borderColor: '#334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '11px',
                fontFamily: 'ui-monospace, monospace',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: isFullscreen ? '11px' : '10px', fontFamily: 'ui-monospace, monospace', paddingTop: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="ConditionA"
              name={activeCondition === 'A' ? 'A: Baseline (No Sharing) [ACTIVE]' : 'A: Baseline (No Sharing)'}
              stroke="#94a3b8"
              strokeWidth={activeCondition === 'A' ? 2.5 : 1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ConditionB"
              name={activeCondition === 'B' ? 'B: Peer Collab [ACTIVE]' : 'B: Peer Collab'}
              stroke="#38bdf8"
              strokeWidth={activeCondition === 'B' ? 2.5 : 1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ConditionC"
              name={activeCondition === 'C' ? 'C: Honeypot [ACTIVE]' : 'C: Honeypot'}
              stroke="#2dd4bf"
              strokeWidth={activeCondition === 'C' ? 2.5 : 1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ConditionD"
              name={activeCondition === 'D' ? 'D: Markov Predictor [ACTIVE]' : 'D: Markov Predictor'}
              stroke="#c084fc"
              strokeWidth={activeCondition === 'D' ? 2.5 : 1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ConditionE"
              name={activeCondition === 'E' ? 'E: All vs Naive [ACTIVE]' : 'E: All vs Naive'}
              stroke="#fbbf24"
              strokeWidth={activeCondition === 'E' ? 2.5 : 1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ConditionF"
              name={activeCondition === 'F' ? 'F: Full vs Bandit [ACTIVE]' : 'F: Full vs Bandit'}
              stroke="#f43f5e"
              strokeWidth={activeCondition === 'F' ? 2.5 : 1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Live Buffer ({history.length} Rounds) | Active Profile: Cond {activeCondition}
        </span>
        <span className="text-slate-500">Integrated MTTD Engine</span>
      </div>
    </div>
  );

  return panelContent;
};

export default MTTDChart;
