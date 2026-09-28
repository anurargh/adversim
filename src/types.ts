export type AttackSurface = 
  | 'network_scanning'
  | 'service_enumeration'
  | 'os_fingerprinting'
  | 'credential_access'
  | 'script_execution'
  | 'scheduled_task'
  | 'process_injection'
  | 'registry_persistence'
  | 'account_creation'
  | 'log_clearing'
  | 'lateral_movement'
  | 'pass_the_hash'
  | 'outbound_transfer'
  | 'data_compression'
  | 'encrypted_channel';

export interface MitreMapping {
  surface: AttackSurface;
  techniqueCode: string;
  techniqueName: string;
  label: string;
  stage: 'Reconnaissance' | 'Initial Access' | 'Execution' | 'Persistence' | 'Defense Evasion' | 'Lateral Movement' | 'Exfiltration';
}

export type AttackerProfileType = 
  | 'Aggressive'
  | 'Stealthy'
  | 'Credential-Focused'
  | 'Lateral-Mover'
  | 'APT-style'
  | 'Ransomware-style'
  | 'Insider-Threat'
  | 'Reconnaissance-Heavy'
  | 'Adaptive-Bandit (UCB)';

export type NodeType = 'User' | 'Server' | 'Admin' | 'DMZ' | 'Honeypot' | 'SOC';

export interface SimNode {
  id: string;
  name: string;
  type: NodeType;
  ip: string;
  fidelity?: 'Low' | 'Medium' | 'High';
  isHoneypot: boolean;
  // Bayesian Posterior Risk: P(Threat | Evidence) representing evidence-based threat concentration
  bayesianRisk: Record<AttackSurface, number>;
  // Defensive Resource Allocation: finite defensive sensor/inspection coverage, strictly summing to 1.0 (100%)
  defensiveAllocation: Record<AttackSurface, number>;
  // Legacy / convenience alias mapping to defensiveAllocation
  bayesianWeights: Record<AttackSurface, number>;
  status: 'normal' | 'under_attack' | 'compromised' | 'isolated';
  lastDetectedRound?: number;
  fpr: number; // False Positive Rate
  x?: number;
  y?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  bandwidth: string;
  activeTraffic?: boolean;
}

export interface AlertEvent {
  id: string;
  round: number;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  mitreCode: string;
  techniqueName: string;
  killChainStage: string;
  attackerProfile: AttackerProfileType;
  confidence: number;
  layer1Score: number;
  layer2Score: number;
  fusedScore: number;
  threatSeverity?: number;
  actionTaken: string;
  isHoneypotCapture: boolean;
  rejectedByConsistency?: boolean;
}

export interface StagePrediction {
  nodeId: string;
  nodeName?: string;
  currentStage: string;
  predictedNextStage: string;
  confidence: number; // 0 to 1
  recommendedPreHardening: AttackSurface[];
}

export interface UcbSurfaceStats {
  surface: AttackSurface;
  mitreCode: string;
  attempts: number;
  successes: number;
  avgSuccess: number;
  ucbScore: number;
  currentWeight: number;
}

export type ConditionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface AblationCondition {
  id: ConditionId;
  name: string;
  description: string;
  collaborativeActive: boolean;
  honeypotActive: boolean;
  predictorActive: boolean;
  attackerType: 'Naive' | 'Bandit' | 'Static';
}

export interface AblationMetric {
  conditionId: ConditionId;
  conditionName: string;
  mttd: number; // Mean Time To Detection in seconds/rounds
  fpr: number; // False Positive Rate %
  weightConvergenceSpeed: number; // rounds to converge
  detectionRegret: number;
  collaborativeAdvantage: number; // % improvement
  honeypotEngagementRate: number; // %
  predictionAccuracy: number; // %
  consistencyRejectionRate: number; // %
  banditRegret: number;
}

export interface SimulationState {
  isRunning: boolean;
  currentRound: number;
  speedMs: number;
  activeCondition: ConditionId;
  nodes: SimNode[];
  edges: NetworkEdge[];
  alerts: AlertEvent[];
  predictions: StagePrediction[];
  ucbStats: UcbSurfaceStats[];
  metrics: AblationMetric[];
  mttdHistory: { round: number; [key: string]: number }[];
  logs: string[];
  attackStartRound: number | null;
  rollingMttdBuffer: number[];
  simMttdValues: { A: number; B: number; C: number; D: number; E: number };
  totalAlertCount: number;
}

export interface SavedTopology {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt?: string;
  nodes: SimNode[];
  edges: NetworkEdge[];
  metadata?: {
    authorName?: string;
    authorEmail?: string;
    nodeCount: number;
    edgeCount: number;
    honeypotCount: number;
    presetSource?: string;
  };
}
