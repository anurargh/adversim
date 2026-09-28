import React, { useState, useEffect, useRef } from 'react';
import { SavedTopology } from '../types';
import { UserProfile } from '../lib/authService';
import { topologyService } from '../lib/topologyService';
import {
  X,
  Layers,
  Download,
  FileCode,
  FileText,
  Trash2,
  Play,
  Upload,
  Search,
  Cloud,
  HardDrive,
  Clock,
  Target,
  Share2,
  RefreshCw,
  Plus
} from 'lucide-react';

interface SavedDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoadTopology: (topology: SavedTopology) => void;
  onOpenSaveModal: () => void;
  onOpenAuthModal?: () => void;
}

export const SavedDesignsModal: React.FC<SavedDesignsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoadTopology,
  onOpenSaveModal,
  onOpenAuthModal
}) => {
  const [topologies, setTopologies] = useState<SavedTopology[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTopologies = async () => {
    setLoading(true);
    try {
      if (currentUser?.id) {
        const list = await topologyService.fetchUserTopologies(currentUser.id);
        setTopologies(list);
      } else {
        const list = topologyService.getLocalTopologies();
        setTopologies(list);
      }
    } catch (err) {
      console.warn('Could not load topologies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTopologies();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSelectTopology = (top: SavedTopology) => {
    onLoadTopology(top);
    onClose();
  };

  const handleDelete = async (topologyId: string) => {
    if (!window.confirm('Are you sure you want to delete this topology design?')) return;
    setDeletingId(topologyId);
    try {
      await topologyService.deleteTopology(currentUser?.id, topologyId);
      setTopologies(prev => prev.filter(t => t.id !== topologyId));
      setNotification('Topology removed.');
    } catch {
      setNotification('Failed to remove topology.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await topologyService.parseTopologyFile(file);
    if (res.success && res.topology) {
      // Save it automatically
      if (currentUser?.id) {
        await topologyService.saveTopologyToCloud(currentUser.id, res.topology);
      } else {
        topologyService.saveTopologyLocally(res.topology);
      }
      setNotification(`Imported "${res.topology.name}" successfully!`);
      loadTopologies();
      onLoadTopology(res.topology);
      onClose();
    } else {
      setNotification(res.error || 'Failed to parse file.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredTopologies = topologies.filter(t => {
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1120] border border-cyan-500/30 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                Saved Topology Architectures
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  {topologies.length} DESIGNS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Load full network topologies instantly or share with colleagues
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

        {/* Action & Filter Strip */}
        <div className="p-3 sm:px-5 sm:py-3.5 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by architecture name or notes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Open and load a topology file from your local computer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import File</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenSaveModal();
              }}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300">
                  Cloud Persistent Vault • Signed in as <strong className="text-cyan-300">{currentUser.name}</strong>
                </span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">
                  Local Browser Storage • Log in to sync your designs to your cloud account across devices
                </span>
              </>
            )}
          </div>

          {!currentUser && onOpenAuthModal && (
            <button
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Notification Feedback */}
        {notification && (
          <div className="mx-5 my-2 p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-cyan-400 hover:text-cyan-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Topologies List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">Synchronizing architectures...</span>
            </div>
          ) : filteredTopologies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center gap-3">
              <Layers className="w-12 h-12 text-slate-700" />
              <div>
                <p className="font-semibold text-slate-300 text-sm">No saved architectures found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No topologies matched your search filter.'
                    : 'Save your current network topology design or import a .json file to load it anytime without manual construction.'}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenSaveModal();
                  }}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Save Current Architecture
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" /> Import From File
                </button>
              </div>
            </div>
          ) : (
            filteredTopologies.map((top) => {
              const decoys = top.nodes.filter(n => n.isHoneypot).length;
              return (
                <div
                  key={top.id}
                  className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md group"
                >
                  {/* Left Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-sm group-hover:text-cyan-300 transition-colors">
                        {top.name}
                      </h4>
                      {top.userId ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                          <Cloud className="w-2.5 h-2.5" /> Cloud Synced
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <HardDrive className="w-2.5 h-2.5" /> Local
                        </span>
                      )}
                    </div>

                    {top.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">{top.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Share2 className="w-3 h-3" /> {top.nodes.length} Nodes
                      </span>
                      <span>•</span>
                      <span className="text-slate-300 font-semibold">{top.edges.length} Links</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Target className="w-3 h-3" /> {decoys} Decoys
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" /> {new Date(top.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    {/* Primary Load Button */}
                    <button
                      onClick={() => handleSelectTopology(top)}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                      title="Load this topology into the live interactive cyber-range"
                    >
                      <Play className="w-3 h-3 fill-slate-950" />
                      <span>Load Architecture</span>
                    </button>

                    {/* Download File */}
                    <button
                      onClick={() => topologyService.exportTopologyAsJson(top)}
                      className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 rounded-lg text-xs transition-colors"
                      title="Download as .json file to share with colleagues"
                    >
                      <FileCode className="w-4 h-4" />
                    </button>

                    {/* Download PDF */}
                    <button
                      onClick={() => topologyService.exportTopologyAsPdf(null, top, currentUser?.name)}
                      className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-rose-300 border border-slate-700/80 rounded-lg text-xs transition-colors"
                      title="Download PDF Specification Report"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(top.id)}
                      disabled={deletingId === top.id}
                      className="p-1.5 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/50 rounded-lg text-xs transition-colors"
                      title="Delete design"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Designs shared as files can be opened by any trusted operator via Import File.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
