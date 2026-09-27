import React, { useState, useEffect } from 'react';
import { UcbSurfaceStats } from '../types';
import { MITRE_SURFACE_MAP } from '../data/mitre';
import { Cpu, Zap, Crosshair, BarChart2, Maximize2, Minimize2, Activity, Info } from 'lucide-react';

interface BanditHeatmapProps {
  ucbStats: UcbSurfaceStats[];
  displayMode?: 'tactical' | 'executive';
}

export const BanditHeatmap: React.FC<BanditHeatmapProps> = ({ ucbStats, displayMode = 'tactical' }) => {
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

  const sorted = [...ucbStats].sort((a, b) => b.ucbScore - a.ucbScore);
  const maxScore = Math.max(...sorted.map((s) => s.ucbScore), 1.0);
  const topTarget = sorted[0];

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
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}>
              Attacker Technique Analysis (UCB1)
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-cyan-400 border border-slate-800">
                Multi-Armed Bandit Matrix
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
              15 Vectors
            </span>

            {/* Fullscreen Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
                isFullscreen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Bandit Matrix to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Bandit Matrix to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-start mt-2 text-[11px] text-slate-400">
          <span className="text-slate-300">
            Top Vector: <strong className="text-cyan-400">{topTarget?.mitreCode}</strong> ({topTarget ? (MITRE_SURFACE_MAP[topTarget.surface]?.techniqueName || topTarget.surface.replace(/_/g, ' ')) : ''})
          </span>
        </div>
      </div>

      {/* Grid of Surface Bars */}
      <div className={`flex-1 grid gap-2.5 my-2.5 overflow-y-auto pr-1 min-h-0 ${isFullscreen ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {sorted.map((stat, idx) => {
          const fillWidth = Math.min(100, Math.max(8, (stat.ucbScore / maxScore) * 100));
          const isTopThree = idx < 3;
          const mitreInfo = MITRE_SURFACE_MAP[stat.surface];

          return (
            <div
              key={stat.surface}
              className={`p-3 rounded border flex flex-col justify-between gap-2 transition-colors ${
                isTopThree
                  ? 'bg-slate-950 border-slate-700'
                  : 'bg-slate-950 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex flex-col truncate max-w-[210px]">
                  <span className="text-slate-200 font-medium flex items-center gap-1.5 truncate">
                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                      isTopThree ? 'bg-slate-800 text-cyan-400 border border-slate-700' : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {stat.mitreCode}
                    </span>
                    <span className="truncate font-semibold">{mitreInfo?.techniqueName || stat.surface.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="text-[9.5px] text-slate-400 ml-0.5">
                    {mitreInfo?.stage} • Vector: {stat.surface.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-cyan-400 font-bold text-xs block">
                    {stat.ucbScore.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">Score</span>
                </div>
              </div>

              {/* Progress Needle Bar */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isTopThree ? 'bg-cyan-400' : 'bg-slate-600'
                  }`}
                  style={{ width: `${fillWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                <span>Probes: <strong className="text-slate-300 font-medium">{stat.attempts}</strong></span>
                <span>Success Rate: <strong className="text-slate-300 font-medium">{(stat.avgSuccess * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Exploration Parameter c=1.414
        </span>
        <span className="text-slate-500">15 Attack Surfaces</span>
      </div>
    </div>
  );

  return panelContent;
};

export default BanditHeatmap;
