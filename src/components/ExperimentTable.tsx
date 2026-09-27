import React, { useState, useEffect } from 'react';
import { AblationMetric, ConditionId } from '../types';
import { FlaskConical, CheckCircle2, Sliders, ChevronRight, Zap, Maximize2, Minimize2, Info } from 'lucide-react';

interface ExperimentTableProps {
  metrics: AblationMetric[];
  activeCondition: ConditionId;
  displayMode?: 'tactical' | 'executive';
  onSelectCondition: (condId: ConditionId) => void;
}

export const ExperimentTable: React.FC<ExperimentTableProps> = ({
  metrics,
  activeCondition,
  displayMode = 'tactical',
  onSelectCondition,
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

  const panelContent = (
    <div
      ref={containerRef}
      className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'spacious-card h-[460px] shadow-2xl'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}>
              Ablation Benchmark Matrix
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-cyan-400 border border-slate-800">
                Detailed Metrics
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
              Click row to select condition
            </span>

            {/* Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
                isFullscreen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Ablation Matrix to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Ablation Matrix to Full Screen'}
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

      {/* Table Area */}
      <div className="my-2 overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-xs text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800 text-[10px] sticky top-0 z-10">
              <th className="py-2 px-3">Condition Profile</th>
              <th className="py-2 px-2">MTTD (s)</th>
              <th className="py-2 px-2">FPR (%)</th>
              <th className="py-2 px-2">Weight Conv.</th>
              <th className="py-2 px-2">Det. Regret</th>
              <th className="py-2 px-2">Collab. Adv</th>
              <th className="py-2 px-2">Honeypot Eng.</th>
              <th className="py-2 px-2">Pred. Acc.</th>
              <th className="py-2 px-2">Filter Rej.</th>
              <th className="py-2 px-2">Bandit Regret</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {metrics.map((row) => {
              const isActive = activeCondition === row.conditionId;

              return (
                <tr
                  key={row.conditionId}
                  onClick={() => onSelectCondition(row.conditionId)}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-slate-800/80 text-cyan-200 font-semibold'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <td className="py-2.5 px-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                    <span className={isActive ? 'text-cyan-300 font-medium' : 'text-slate-200'}>
                      {row.conditionName}
                    </span>
                    {isActive && (
                      <span className="text-[9px] px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 font-semibold text-rose-300">
                    {typeof row.mttd === 'number' ? row.mttd.toFixed(1) : row.mttd}s
                  </td>
                  <td className="py-2.5 px-2 text-amber-300">{row.fpr}%</td>
                  <td className="py-2.5 px-2 text-slate-400">{row.weightConvergenceSpeed} r</td>
                  <td className="py-2.5 px-2 text-slate-300">{row.detectionRegret}</td>
                  <td className="py-2.5 px-2 font-semibold text-cyan-300">{row.collaborativeAdvantage}%</td>
                  <td className="py-2.5 px-2 text-teal-300">{row.honeypotEngagementRate}%</td>
                  <td className="py-2.5 px-2 text-purple-300">{row.predictionAccuracy}%</td>
                  <td className="py-2.5 px-2 text-amber-300">{row.consistencyRejectionRate}%</td>
                  <td className="py-2.5 px-2 text-slate-400">{row.banditRegret}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Active: <strong className="text-slate-200 font-medium">Condition {activeCondition}</strong>
        </span>
        <span className="text-slate-500">6 Experimental Configurations</span>
      </div>
    </div>
  );

  return panelContent;
};

export default ExperimentTable;
