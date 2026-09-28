import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { SavedTopology, SimNode, NetworkEdge } from '../types';
import { jsPDF } from 'jspdf';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error caught: ', JSON.stringify(errInfo));
  return errInfo;
}

// User-scoped storage keys to completely prevent cross-account data leakage
function getUserStorageKey(userId?: string): string {
  if (userId && userId.trim() !== '' && userId !== 'guest') {
    return `adversim_user_topologies_${userId.trim()}`;
  }
  return 'adversim_guest_topologies';
}

export const topologyService = {
  // Clean up any legacy unpartitioned storage keys from earlier builds
  cleanupLegacyStorage(): void {
    try {
      localStorage.removeItem('adversim_saved_topologies_v1');
      localStorage.removeItem('adversim_saved_topologies_v2');
    } catch {}
  },

  // 1. CLOUD STORAGE (Firestore)
  async saveTopologyToCloud(userId: string, topology: SavedTopology): Promise<{ success: boolean; error?: string }> {
    const docPath = `users/${userId}/topologies/${topology.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'topologies', topology.id);
      
      const cleanData: any = {
        id: topology.id,
        userId: userId,
        name: topology.name.slice(0, 120),
        description: (topology.description || '').slice(0, 500),
        version: topology.version || '1.0',
        createdAt: topology.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: topology.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          ip: n.ip,
          isHoneypot: !!n.isHoneypot,
          fidelity: n.fidelity || 'High',
          status: n.status || 'normal',
          fpr: n.fpr ?? 0.05,
          x: n.x ?? 300,
          y: n.y ?? 200,
          bayesianRisk: n.bayesianRisk || {},
          defensiveAllocation: n.defensiveAllocation || {},
          bayesianWeights: n.bayesianWeights || {}
        })),
        edges: topology.edges.map(e => ({
          source: typeof e.source === 'object' ? (e.source as any).id : e.source,
          target: typeof e.target === 'object' ? (e.target as any).id : e.target,
          bandwidth: e.bandwidth || '10 Gbps'
        })),
        metadata: {
          authorName: topology.metadata?.authorName || 'SOC Operator',
          authorEmail: topology.metadata?.authorEmail || '',
          nodeCount: topology.nodes.length,
          edgeCount: topology.edges.length,
          honeypotCount: topology.nodes.filter(n => n.isHoneypot).length,
          presetSource: topology.metadata?.presetSource || 'custom'
        }
      };

      await setDoc(docRef, cleanData, { merge: true });
      
      // Mirror to local cache for this specific user ONLY
      this.saveTopologyLocally({ ...topology, userId }, userId);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      // Fallback: save to this user's local cache
      this.saveTopologyLocally({ ...topology, userId }, userId);
      return { success: true, error: 'Saved to local browser cache (cloud sync offline).' };
    }
  },

  async fetchUserTopologies(userId: string): Promise<SavedTopology[]> {
    const colPath = `users/${userId}/topologies`;
    try {
      const colRef = collection(db, 'users', userId, 'topologies');
      const q = query(colRef);
      const snapshot = await getDocs(q);
      
      const cloudTopologies: SavedTopology[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as SavedTopology;
        if (data && (!data.userId || data.userId === userId)) {
          cloudTopologies.push({ ...data, userId });
        }
      });

      // Merge ONLY with local storage belonging to this specific user ID
      const local = this.getLocalTopologies(userId);
      const map = new Map<string, SavedTopology>();
      cloudTopologies.forEach(t => map.set(t.id, t));
      local.forEach(t => {
        if (!map.has(t.id)) map.set(t.id, t);
      });

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Refresh this user's local cache
      this.persistLocalList(combined, userId);
      return combined;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
      return this.getLocalTopologies(userId);
    }
  },

  async deleteTopology(userId: string | undefined, topologyId: string): Promise<boolean> {
    this.deleteTopologyLocally(topologyId, userId);
    if (!userId) return true;

    const docPath = `users/${userId}/topologies/${topologyId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'topologies', topologyId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
      return true;
    }
  },

  // 2. USER-ISOLATED LOCAL STORAGE CACHE
  getLocalTopologies(userId?: string): SavedTopology[] {
    try {
      const key = getUserStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const list: SavedTopology[] = JSON.parse(raw);
      if (!Array.isArray(list)) return [];

      if (userId) {
        // Strictly return only topologies belonging to this user
        return list.filter(t => t.userId === userId);
      } else {
        // Guest mode: return guest topologies
        return list.filter(t => !t.userId || t.userId === 'guest');
      }
    } catch {
      return [];
    }
  },

  saveTopologyLocally(topology: SavedTopology, targetUserId?: string): void {
    try {
      const effectiveUserId = targetUserId || topology.userId;
      const key = getUserStorageKey(effectiveUserId);
      const list = this.getLocalTopologies(effectiveUserId);
      
      const toSave = {
        ...topology,
        userId: effectiveUserId || 'guest'
      };

      const existingIdx = list.findIndex(t => t.id === toSave.id);
      if (existingIdx >= 0) {
        list[existingIdx] = toSave;
      } else {
        list.unshift(toSave);
      }
      this.persistLocalList(list, effectiveUserId);
    } catch {}
  },

  deleteTopologyLocally(topologyId: string, userId?: string): void {
    try {
      const key = getUserStorageKey(userId);
      const list = this.getLocalTopologies(userId).filter(t => t.id !== topologyId);
      this.persistLocalList(list, userId);
    } catch {}
  },

  persistLocalList(list: SavedTopology[], userId?: string): void {
    try {
      const key = getUserStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  },

  clearGuestTopologies(): void {
    try {
      localStorage.removeItem('adversim_guest_topologies');
      this.cleanupLegacyStorage();
    } catch {}
  },

  // 3. EXPORT AS JSON FILE
  exportTopologyAsJson(topology: SavedTopology): void {
    const exportPayload = {
      app: 'adversim',
      format: 'adversim-network-topology',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      topology: {
        id: topology.id,
        name: topology.name,
        description: topology.description || '',
        version: topology.version || '1.0',
        metadata: {
          authorName: topology.metadata?.authorName || 'SOC Operator',
          nodeCount: topology.nodes.length,
          edgeCount: topology.edges.length,
          honeypotCount: topology.nodes.filter(n => n.isHoneypot).length,
        },
        nodes: topology.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          ip: n.ip,
          isHoneypot: n.isHoneypot,
          fidelity: n.fidelity || 'High',
          status: n.status || 'normal',
          fpr: n.fpr,
          x: n.x,
          y: n.y,
          bayesianRisk: n.bayesianRisk,
          defensiveAllocation: n.defensiveAllocation,
          bayesianWeights: n.bayesianWeights,
        })),
        edges: topology.edges.map(e => ({
          source: typeof e.source === 'object' ? (e.source as any).id : e.source,
          target: typeof e.target === 'object' ? (e.target as any).id : e.target,
          bandwidth: e.bandwidth || '10 Gbps',
        }))
      }
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const slug = (topology.name || 'topology').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'network'}-topology.adversim.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 4. OPEN & PARSE FILE FROM LOCAL DEVICE
  async parseTopologyFile(file: File): Promise<{ success: boolean; topology?: SavedTopology; error?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);

          const rawTop = parsed.topology || parsed;

          if (!rawTop.nodes || !Array.isArray(rawTop.nodes) || rawTop.nodes.length === 0) {
            resolve({ success: false, error: 'Invalid file: Missing or empty "nodes" definition.' });
            return;
          }

          if (!rawTop.edges || !Array.isArray(rawTop.edges)) {
            rawTop.edges = [];
          }

          const normalizedNodes: SimNode[] = rawTop.nodes.map((n: any, idx: number) => ({
            id: String(n.id || `node-${idx + 1}`),
            name: String(n.name || `Node-${idx + 1}`),
            type: (['User', 'Server', 'Admin', 'DMZ', 'Honeypot', 'SOC'].includes(n.type) ? n.type : 'Server') as any,
            ip: String(n.ip || `10.0.0.${idx + 10}`),
            isHoneypot: Boolean(n.isHoneypot),
            fidelity: n.fidelity || 'High',
            status: 'normal',
            fpr: typeof n.fpr === 'number' ? n.fpr : 0.05,
            x: typeof n.x === 'number' ? n.x : 100 + (idx % 4) * 140,
            y: typeof n.y === 'number' ? n.y : 100 + Math.floor(idx / 4) * 100,
            bayesianRisk: n.bayesianRisk || {},
            defensiveAllocation: n.defensiveAllocation || n.bayesianWeights || {},
            bayesianWeights: n.bayesianWeights || n.defensiveAllocation || {}
          }));

          const nodeIds = new Set(normalizedNodes.map(n => n.id));
          const normalizedEdges: NetworkEdge[] = rawTop.edges
            .map((e: any) => ({
              source: typeof e.source === 'object' ? String(e.source.id) : String(e.source),
              target: typeof e.target === 'object' ? String(e.target.id) : String(e.target),
              bandwidth: String(e.bandwidth || '10 Gbps')
            }))
            .filter((e: NetworkEdge) => nodeIds.has(e.source) && nodeIds.has(e.target));

          const cleanTopology: SavedTopology = {
            id: rawTop.id || `top_${Date.now().toString(36)}`,
            name: rawTop.name || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Imported Topology',
            description: rawTop.description || `Imported from file "${file.name}" on ${new Date().toLocaleDateString()}`,
            version: rawTop.version || '1.0',
            createdAt: rawTop.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nodes: normalizedNodes,
            edges: normalizedEdges,
            metadata: {
              authorName: rawTop.metadata?.authorName || 'Imported Architecture',
              nodeCount: normalizedNodes.length,
              edgeCount: normalizedEdges.length,
              honeypotCount: normalizedNodes.filter(n => n.isHoneypot).length,
              presetSource: 'imported-file'
            }
          };

          resolve({ success: true, topology: cleanTopology });
        } catch (err: any) {
          resolve({ success: false, error: 'Could not parse JSON file: ' + (err.message || 'Syntax error') });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file from disk.' });
      };

      reader.readAsText(file);
    });
  },

  // 5. RENDER SVG TO HIGH-RES PNG DATA URL WITH PRECISE AUTOMATIC CENTERING
  async renderSvgToDataUrl(svgElement: SVGSVGElement): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

        // Reset user interactive pan/zoom transform so output is clean and canonical
        const viewportGroup = svgClone.querySelector('.canvas-viewport-group') as SVGGElement | null;
        if (viewportGroup) {
          viewportGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
        }

        // Collect positions of all nodes and radar elements to calculate exact tight bounding box
        const nodeEls = Array.from(svgClone.querySelectorAll('.node-interactive-group'));
        const xs: number[] = [];
        const ys: number[] = [];

        nodeEls.forEach(el => {
          const transform = el.getAttribute('transform') || '';
          const match = /translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(transform);
          if (match) {
            xs.push(parseFloat(match[1]));
            ys.push(parseFloat(match[2]));
          }
        });

        // Also check if radar circles exist
        let radarCx: number | null = null;
        let radarCy: number | null = null;
        let radarR: number = 0;
        const circles = Array.from(svgClone.querySelectorAll('circle'));
        circles.forEach(c => {
          const r = parseFloat(c.getAttribute('r') || '0');
          if (r > 60) {
            radarCx = parseFloat(c.getAttribute('cx') || '0');
            radarCy = parseFloat(c.getAttribute('cy') || '0');
            radarR = Math.max(radarR, r);
          }
        });

        // Determine bounding box
        let minX = 0;
        let maxX = 800;
        let minY = 0;
        let maxY = 500;

        if (xs.length > 0 && ys.length > 0) {
          const minNodeX = Math.min(...xs);
          const maxNodeX = Math.max(...xs);
          const minNodeY = Math.min(...ys);
          const maxNodeY = Math.max(...ys);

          if (radarCx !== null && radarCy !== null && radarR > 0) {
            // Frame both nodes and central radar disk gracefully
            minX = Math.min(minNodeX - 65, radarCx - radarR * 0.95);
            maxX = Math.max(maxNodeX + 65, radarCx + radarR * 0.95);
            minY = Math.min(minNodeY - 65, radarCy - radarR * 0.95);
            maxY = Math.max(maxNodeY + 65, radarCy + radarR * 0.95);
          } else {
            minX = minNodeX - 80;
            maxX = maxNodeX + 80;
            minY = minNodeY - 80;
            maxY = maxNodeY + 80;
          }
        } else {
          const rect = svgElement.getBoundingClientRect();
          minX = 0;
          minY = 0;
          maxX = rect.width || 800;
          maxY = rect.height || 500;
        }

        const boxWidth = Math.max(200, maxX - minX);
        const boxHeight = Math.max(150, maxY - minY);

        // Apply tight, centered viewBox to the cloned SVG
        svgClone.setAttribute('viewBox', `${minX} ${minY} ${boxWidth} ${boxHeight}`);
        svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgClone.removeAttribute('width');
        svgClone.removeAttribute('height');
        svgClone.style.backgroundColor = 'transparent';

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const blobURL = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          // Output high-resolution 16:9 canvas
          const canvasWidth = 1920;
          const canvasHeight = 1080;

          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          // 1. Dark Cyber Canvas Base
          ctx.fillStyle = '#07090e';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // 2. Subtle Grid Pattern
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
          ctx.lineWidth = 1;
          const gridSize = 48;
          for (let x = 0; x < canvasWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
          }
          for (let y = 0; y < canvasHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
          }

          // 3. Watermark / Brand Header
          ctx.font = 'bold 22px "Courier New", monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('ADVERSIM CYBER-RANGE • DEFENSIVE TOPOLOGY BLUEPRINT', 44, 46);

          ctx.font = '14px "Courier New", monospace';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`CAPTURED: ${new Date().toISOString()} • ZERO-TRUST ARCHITECTURE SPECIFICATION`, 44, 74);

          // Top cyan accent line
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(0, 0, canvasWidth, 5);

          // 4. Centered Topology Render
          // Reserve 95px on top for header, 45px on bottom, 55px on left and right
          const drawMarginX = 60;
          const drawMarginTop = 100;
          const drawMarginBottom = 45;
          const drawWidth = canvasWidth - (drawMarginX * 2);
          const drawHeight = canvasHeight - drawMarginTop - drawMarginBottom;

          // Because viewBox on svg has preserveAspectRatio='xMidYMid meet',
          // drawImage scales and perfectly centers the content in this box!
          ctx.drawImage(img, drawMarginX, drawMarginTop, drawWidth, drawHeight);

          // 5. Border around viewport
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(drawMarginX, drawMarginTop, drawWidth, drawHeight);

          const pngUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(blobURL);
          resolve(pngUrl);
        };

        img.onerror = () => {
          URL.revokeObjectURL(blobURL);
          reject(new Error('Failed to render SVG image'));
        };

        img.src = blobURL;
      } catch (err) {
        reject(err);
      }
    });
  },

  // 6. EXPORT AS PNG IMAGE
  async exportTopologyAsImage(svgElement: SVGSVGElement, name: string): Promise<void> {
    const pngDataUrl = await this.renderSvgToDataUrl(svgElement);
    const slug = (name || 'topology').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = `${slug || 'network'}-topology.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // 7. EXPORT AS COMPREHENSIVE PDF REPORT (PERFECTLY CENTERED DIAGRAM)
  async exportTopologyAsPdf(
    svgElement: SVGSVGElement | null,
    topology: SavedTopology,
    authorName?: string
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Dark Background for Page 1
    doc.setFillColor(11, 17, 32); // #0b1120
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Cyber Accent Top Border
    doc.setFillColor(6, 182, 212); // #06b6d4 cyan
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Header Title Block
    doc.setFont('courier', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(56, 189, 248); // #38bdf8
    doc.text('ADVERSIM DEFENSIVE TOPOLOGY SPECIFICATION', margin, 18);

    doc.setFontSize(10);
    doc.setFont('courier', 'normal');
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text(`CONFIDENTIAL // AUTONOMOUS KINETIC CYBER-RANGE SUITE • MITRE ATT&CK MAPPING`, margin, 24);

    // Metadata Strip Box
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.setDrawColor(51, 65, 85); // #334155
    doc.rect(margin, 28, pageWidth - (margin * 2), 20, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`DESIGN: ${topology.name.toUpperCase()}`, margin + 5, 35);
    doc.text(`AUTHOR: ${(authorName || topology.metadata?.authorName || 'SOC Operator').toUpperCase()}`, margin + 5, 42);

    const dateStr = new Date(topology.createdAt || Date.now()).toLocaleString();
    doc.text(`TIMESTAMP: ${dateStr}`, margin + 95, 35);
    doc.text(`SPEC VERSION: ${topology.version || '1.0'}`, margin + 95, 42);

    const decoys = topology.nodes.filter(n => n.isHoneypot).length;
    doc.setTextColor(56, 189, 248);
    doc.text(`NODES: ${topology.nodes.length}`, pageWidth - margin - 65, 35);
    doc.text(`LINKS: ${topology.edges.length}`, pageWidth - margin - 42, 35);
    doc.setTextColor(52, 211, 153);
    doc.text(`DECOYS: ${decoys}`, pageWidth - margin - 22, 35);
    doc.setTextColor(203, 213, 225);
    doc.text(`SEC LEVEL: HIGH`, pageWidth - margin - 65, 42);

    // Embedded Topology Snapshot Canvas (Centered with tight margins)
    let imgAdded = false;
    if (svgElement) {
      try {
        const pngDataUrl = await this.renderSvgToDataUrl(svgElement);
        const mapX = margin;
        const mapY = 51;
        const mapW = pageWidth - (margin * 2);
        const mapH = 136;

        // Bounding border box
        doc.setFillColor(7, 9, 14);
        doc.setDrawColor(51, 65, 85);
        doc.rect(mapX, mapY, mapW, mapH, 'FD');

        doc.addImage(pngDataUrl, 'PNG', mapX + 0.5, mapY + 0.5, mapW - 1, mapH - 1);
        imgAdded = true;
      } catch (err) {
        console.warn('Could not embed PNG into PDF:', err);
      }
    }

    if (!imgAdded) {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, 51, pageWidth - (margin * 2), 136, 'F');
      doc.setTextColor(148, 163, 184);
      doc.text('Topology diagram rendered in vector ledger on Page 2.', margin + 10, 80);
    }

    // Page 1 Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PAGE 1 OF 2 • DEFENSIVE ARCHITECTURE BLUEPRINT • VALIDATED BY ZERO-TRUST INVARIANTS', margin, pageHeight - 6);

    // PAGE 2: INVENTORY & ROUTING MATRIX
    doc.addPage('a4', 'landscape');
    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(6, 182, 212);
    doc.rect(0, 0, pageWidth, 4, 'F');

    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(56, 189, 248);
    doc.text('FLEET INVENTORY & INTERCONNECTION MATRIX', margin, 16);

    doc.setFontSize(9);
    doc.setFont('courier', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Comprehensive specification table for "${topology.name}"`, margin, 22);

    // Node Table Header
    let tableY = 28;
    const colX = {
      name: margin,
      type: margin + 45,
      ip: margin + 75,
      status: margin + 115,
      role: margin + 150,
      decoys: margin + 195,
      coords: margin + 225
    };

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, tableY, pageWidth - (margin * 2), 7, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text('HOST / NODE NAME', colX.name + 2, tableY + 5);
    doc.text('TYPE', colX.type, tableY + 5);
    doc.text('IP ADDRESS', colX.ip, tableY + 5);
    doc.text('STATUS', colX.status, tableY + 5);
    doc.text('FIDELITY', colX.role, tableY + 5);
    doc.text('HONEYPOT', colX.decoys, tableY + 5);
    doc.text('COORDINATES', colX.coords, tableY + 5);

    tableY += 8;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);

    // Render Nodes
    topology.nodes.slice(0, 18).forEach((node, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, tableY - 1, pageWidth - (margin * 2), 6, 'F');
      }

      doc.setTextColor(node.isHoneypot ? 52 : 226, node.isHoneypot ? 211 : 232, node.isHoneypot ? 153 : 240);
      doc.text(node.name.slice(0, 24), colX.name + 2, tableY + 3.5);
      doc.text(node.type, colX.type, tableY + 3.5);
      doc.text(node.ip, colX.ip, tableY + 3.5);

      const statusColor = node.status === 'under_attack' ? [244, 63, 94] : [56, 189, 248];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(node.status.toUpperCase(), colX.status, tableY + 3.5);

      doc.setTextColor(203, 213, 225);
      doc.text(node.fidelity || 'High', colX.role, tableY + 3.5);
      doc.text(node.isHoneypot ? 'DECOY TRAP' : 'STANDARD', colX.decoys, tableY + 3.5);
      doc.text(`X:${Math.round(node.x || 0)} Y:${Math.round(node.y || 0)}`, colX.coords, tableY + 3.5);

      tableY += 6.5;
    });

    // Network Interconnects Section
    tableY += 4;
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248);
    doc.text(`ACTIVE COMMUNICATIONS MATRIX (${topology.edges.length} LINKS)`, margin, tableY);

    tableY += 5;
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, tableY, pageWidth - (margin * 2), 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text('ORIGIN NODE', margin + 5, tableY + 4.5);
    doc.text('TARGET NODE', margin + 70, tableY + 4.5);
    doc.text('BANDWIDTH', margin + 135, tableY + 4.5);
    doc.text('ENCRYPTION / PROTOCOL', margin + 195, tableY + 4.5);

    tableY += 7;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);

    // List top 10 links
    topology.edges.slice(0, 10).forEach((edge, idx) => {
      const srcName = topology.nodes.find(n => n.id === edge.source)?.name || edge.source;
      const tgtName = topology.nodes.find(n => n.id === edge.target)?.name || edge.target;

      if (idx % 2 === 0) {
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, tableY - 1, pageWidth - (margin * 2), 5.5, 'F');
      }

      doc.setTextColor(203, 213, 225);
      doc.text(String(srcName).slice(0, 30), margin + 5, tableY + 3);
      doc.text(String(tgtName).slice(0, 30), margin + 70, tableY + 3);
      doc.text(edge.bandwidth || '10 Gbps', margin + 135, tableY + 3);
      doc.setTextColor(56, 189, 248);
      doc.text('mTLS / IPSec Mesh', margin + 195, tableY + 3);

      tableY += 5.5;
    });

    // Page 2 Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PAGE 2 OF 2 • EXPORTED FROM ADVERSIM KINETIC CYBER-RANGE • READY FOR IMMEDIATE IMPORT', margin, pageHeight - 6);

    const slug = (topology.name || 'topology').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    doc.save(`${slug || 'network'}-architecture-spec.pdf`);
  }
};
