import React, { useState, useEffect } from 'react';
import { StagePrediction } from '../types';
import { MITRE_SURFACE_MAP } from '../data/mitre';
import { Target, ArrowRight, ShieldCheck, Zap, Radio, GitBranch, Cpu, Maximize2, Minimize2, Activity, Layers } from 'lucide-react';

interface PredictionPanelProps {
  predictions: StagePrediction[];
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ predictions }) => {
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
      className={`bg-[#0b1120] border border-slate-800 rounded-lg p-4 flex flex-col justify-between text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'h-[420px]'
      }`}
    >
      {/* Panel Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}>
              Markov Attack Stage Prediction
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-cyan-400 border border-slate-800">
                Transition Matrix View
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
              Active Models: {predictions.length}
            </span>

            {/* Fullscreen Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
                isFullscreen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Markov Engine to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Markov Engine to Full Screen'}
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

      {/* Prediction Cards Stream */}
      <div className={`flex-1 overflow-y-auto space-y-2.5 my-2 pr-1 min-h-0 ${isFullscreen ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''}`}>
        {predictions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 col-span-full py-12">
            <Cpu className="w-5 h-5 text-slate-600" />
            <span>Gathering sequence transition data from node intercepts...</span>
          </div>
        ) : (
          predictions.map((pred, idx) => {
            return (
              <div
                key={idx}
                className="p-3 rounded border border-slate-800 bg-slate-950 text-slate-300 transition-colors"
              >
                {/* Node Target & Confidence Meter */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5 text-[11px] truncate max-w-[280px]">
                    <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Target: {pred.nodeName || pred.nodeId}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-400">Likelihood:</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-cyan-400 text-[10px] font-semibold">
                      {(pred.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Transition Pipeline Vector */}
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800/80 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase">Observed Stage</span>
                    <span className="font-semibold text-slate-200">{pred.currentStage}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <span>─────▶</span>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-400 uppercase">Predicted Next</span>
                    <span className="font-semibold text-rose-400">{pred.predictedNextStage}</span>
                  </div>
                </div>

                {/* Pre-Hardening Recommendation Chips */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5 text-[10px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Proactive Pre-Hardening:
                    </span>
                    <span className="text-cyan-400 font-medium text-[9.5px]">Bayesian weights actively boosted</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pred.recommendedPreHardening.map((surf) => {
                      const m = MITRE_SURFACE_MAP[surf];
                      return (
                        <span
                          key={surf}
                          className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 text-[9.5px] font-medium flex items-center gap-1"
                          title={`${m?.techniqueCode}: ${m?.techniqueName}`}
                        >
                          <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span className="text-slate-300 font-semibold">{m?.techniqueCode || ''}</span>
                          <span>{m?.label || surf.replace(/_/g, ' ')}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Pre-Hardening Active
        </span>
        <span className="text-slate-500">Markov Chain</span>
      </div>
    </div>
  );

  return panelContent;
};

export default PredictionPanel;
