export interface RiskReason {
  code: string;
  title: string;
  weight: number;
  detail: string;
}

export interface GraphNode {
  id: string;
  label: string;
  risk: number | string;
}

export interface GraphEdge {
  source: string;
  target: string;
  value: number;
}

export interface RiskResult {
  address: string;
  chain: string;
  score: number;
  band: string;
  sanctions_hit: boolean;
  reasons: RiskReason[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  generated_at: string;
  data_mode: 'live' | 'fixture';
}

export interface UsageResponse {
  checks_used: number;
  quota: number;
  plan: string;
}

export interface ReportCreateResponse {
  report_id: string;
  sha256?: string;
}

export interface BatchRowResult {
  address: string;
  chain: string;
  score: number | null;
  band: string;
  sanctions_hit: boolean;
  top_reason: string;
  data_mode: 'live' | 'fixture';
  error?: string;
}

export interface AuditVerifyResponse {
  valid: boolean;
  entry_count: number;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}
