import React, { useState } from 'react';
import { SimNode, NetworkEdge, SavedTopology } from '../types';
import { UserProfile } from '../lib/authService';
import { topologyService } from '../lib/topologyService';
import {
  X,
  Save,
  Download,
  FileCode,
  Image as ImageIcon,
  FileText,
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers
} from 'lucide-react';

interface SaveTopologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: SimNode[];
  edges: NetworkEdge[];
  currentUser: UserProfile | null;
  svgElement: SVGSVGElement | null;
  onSaved?: (topology: SavedTopology) => void;
  onOpenAuthModal?: () => void;
}

export const SaveTopologyModal: React.FC<SaveTopologyModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  currentUser,
  svgElement,
  onSaved,
  onOpenAuthModal
}) => {
  const [name, setName] = useState(`Defense Mesh ${new Date().toLocaleDateString()}`);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const honeypotsCount = nodes.filter(n => n.isHoneypot).length;
  const serversCount = nodes.filter(n => n.type === 'Server').length;

  const buildTopologyObject = (): SavedTopology => {
    return {
      id: `top_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUser?.id,
      name: name.trim() || 'Untitled Topology',
      description: description.trim() || undefined,
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      metadata: {
        authorName: currentUser?.name || 'SOC Operator',
        authorEmail: currentUser?.email || '',
        nodeCount: nodes.length,
        edgeCount: edges.length,
        honeypotCount: honeypotsCount,
        presetSource: 'custom'
      }
    };
  };

  const handleSaveToAccount = async () => {
    if (!name.trim()) {
      setStatusMessage('Please enter a name for the topology.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const topology = buildTopologyObject();

    try {
      if (currentUser?.id) {
        const res = await topologyService.saveTopologyToCloud(currentUser.id, topology);
        if (res.error) {
          setStatusMessage(res.error);
        } else {
          setStatusMessage('Topology saved to your account in Cloud Database!');
        }
      } else {
        topologyService.saveTopologyLocally(topology);
        setStatusMessage('Saved locally in browser vault. Log in to sync to your account across devices.');
      }

      setSaveSuccess(true);
      if (onSaved) onSaved(topology);

      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage(err?.message || 'Error saving topology.');
    }
  };

  const handleExportJson = () => {
    const topology = buildTopologyObject();
    topologyService.exportTopologyAsJson(topology);
    setStatusMessage('JSON architecture specification downloaded.');
  };

  const handleExportImage = async () => {
    if (!svgElement) {
      setStatusMessage('Topology canvas not found.');
      return;
    }
    try {
      setStatusMessage('Rendering high-resolution PNG image...');
      await topologyService.exportTopologyAsImage(svgElement, name);
      setStatusMessage('PNG screenshot downloaded.');
    } catch (err: any) {
      setStatusMessage('Failed to export image: ' + err.message);
    }
  };

  const handleExportPdf = async () => {
    try {
      setStatusMessage('Compiling military-grade PDF architecture report...');
      const topology = buildTopologyObject();
      await topologyService.exportTopologyAsPdf(svgElement, topology, currentUser?.name);
      setStatusMessage('PDF specification report generated and downloaded.');
    } catch (err: any) {
      setStatusMessage('Failed to export PDF: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1120] border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">Save & Export Topology</h3>
              <p className="text-[11px] text-slate-400">
                Save to your account, or download as file, image, or PDF report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Topology Stats Banner */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px]">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px]">TOTAL NODES</span>
              <span className="text-cyan-400 font-bold">{nodes.length} Active</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px]">COMM LINKS</span>
              <span className="text-cyan-400 font-bold">{edges.length} Mesh</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px]">HONEYPOTS</span>
              <span className="text-emerald-400 font-bold">{honeypotsCount} Decoys</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-300 mb-1">
                Architecture Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="e.g. Zero-Trust DMZ with Deception Mesh"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-300 mb-1">
                Description / Engineering Notes (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Micro-segmented subnets with honeypot tripwires..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Account Status Box */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-slate-200 text-[11px]">
                      Account: {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Topologies stay linked to your account across sessions
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-slate-200 text-[11px]">
                      Guest Mode: Saved Locally
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Log in to access your saved designs on any device
                    </div>
                  </div>
                </>
              )}
            </div>

            {!currentUser && onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-2.5 py-1 text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg font-medium transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Export Actions Section */}
          <div>
            <span className="block text-[11px] font-semibold uppercase text-slate-400 mb-2">
              Download Directly To Your Device
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* File (.json) */}
              <button
                type="button"
                onClick={handleExportJson}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-slate-200 group"
              >
                <FileCode className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-[11px]">Download File</span>
                <span className="text-[9px] text-slate-400 font-mono">.adversim.json</span>
              </button>

              {/* Image (.png) */}
              <button
                type="button"
                onClick={handleExportImage}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-slate-200 group"
              >
                <ImageIcon className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-[11px]">Export Image</span>
                <span className="text-[9px] text-slate-400 font-mono">High-Res PNG</span>
              </button>

              {/* PDF (.pdf) */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/60 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-slate-200 group"
              >
                <FileText className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-[11px]">Generate PDF</span>
                <span className="text-[9px] text-slate-400 font-mono">2-Page Spec</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSaveToAccount}
            disabled={isSaving}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : currentUser ? 'Save To My Account' : 'Save To Local Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};
