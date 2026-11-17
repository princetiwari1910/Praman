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
  data_note?: string;
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

export interface BatchValidRow {
  address: string;
  score: number;
  band: string;
  sanctions_hit: boolean;
  top_reason_code: string;
}

export interface BatchErrorRow {
  address: string;
  error: {
    error: string;
    message: string;
  };
}

export type BatchFlatRow = BatchValidRow | BatchErrorRow;

export interface AuditVerifyResponse {
  valid: boolean;
  entries: number;
}

export interface CounterfactualItem {
  without_code: string;
  score_without: number;
  band_without: string;
}

export interface ExplainResponse {
  score: number;
  band: string;
  band_gap: {
    next_band: string | null;
    points_needed: number;
  };
  counterfactuals: CounterfactualItem[];
}

export interface VerifyReportResponse {
  valid: boolean;
  computed_sha256: string;
  known_report: boolean;
}

export type ApprovalDecision = 'approved' | 'rejected' | 'needs_review' | 'pending';

export interface ApprovalResponse {
  decision: ApprovalDecision;
  analyst_name?: string;
  note?: string;
  decided_at?: string;
  timestamp?: string;
}

export interface SavedInvestigation {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  score: number;
  band: string;
  sanctions_hit: boolean;
  data_mode: 'live' | 'fixture';
  reasons: RiskReason[];
  graph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  } | null;
  report_sha256?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}
