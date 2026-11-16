import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ShieldAlert,
  Copy,
  Check,
  Upload,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { cleanWallet, defaultWallet } from '@/fixtures/cleanWallet';
import { highRiskWallet } from '@/fixtures/highRiskWallet';
import type {
  RiskResult,
  UsageResponse,
  ReportCreateResponse,
  BatchFlatRow,
  BatchErrorRow,
  AuditVerifyResponse,
  ExplainResponse,
  VerifyReportResponse,
  ApprovalResponse,
  ApprovalDecision,
  ApiErrorResponse,
} from '@/types/api';
import { BRAND } from '@/constants/brand';
import { Footer } from '@/components/Footer';
import { DemoGraph } from '@/components/DemoGraph';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const API_KEY = (import.meta.env.VITE_API_KEY as string | undefined)?.trim() ?? '';

const CHAIN = 'ethereum' as const;
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const CLEAN_TEST_ADDRESS = '0x1111111111111111111111111111111111111111';
const HIGH_RISK_TEST_ADDRESS = '0x2222222222222222222222222222222222222222';
const SAMPLE_CSV = `address\n${CLEAN_TEST_ADDRESS}\n${HIGH_RISK_TEST_ADDRESS}\n0x3333333333333333333333333333333333333333\n`;

async function apiFetch(url: string, options: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 70) return '#E2554F';
  if (score >= 30) return '#F2A93B';
  return '#1D9C86';
}

function bandBarColor(band: string): string {
  const key = band.toLowerCase();
  if (key === 'severe' || key === 'high') return '#E2554F';
  if (key === 'medium') return '#F2A93B';
  return '#1D9C86';
}

function bandTextColor(band: string): string {
  const key = band.toLowerCase();
  if (key === 'severe' || key === 'high') return '#B8332E';
  if (key === 'medium') return '#8C5808';
  return '#147564';
}

function bandLabel(band: string): string {
  const key = band.toLowerCase();
  return { low: 'Low', medium: 'Medium', high: 'High', severe: 'Severe' }[key] ?? band;
}

function isBatchErrorRow(row: BatchFlatRow): row is BatchErrorRow {
  return 'error' in row && row.error !== undefined;
}

async function parseErrorMessage(res: Response, checksUsed: number, quota: number | null): Promise<string> {
  let apiText = `Request failed with status ${res.status}`;
  try {
    const body = (await res.json()) as Partial<ApiErrorResponse>;
    if (body.message) {
      apiText = body.error ? `${body.error}: ${body.message}` : body.message;
    }
  } catch {
    // Non-JSON response
  }

  if (res.status === 400) return `Invalid address or request — ${apiText}`;
  if (res.status === 401) return `API key missing or wrong — ${apiText}`;
  if (res.status === 422) return `Validation error — ${apiText}`;
  if (res.status === 429) return `Quota reached (${checksUsed}${quota !== null ? ` / ${quota}` : ''}) — ${apiText}`;
  return apiText;
}

function fixtureForAddress(addr: string): RiskResult {
  const lower = addr.toLowerCase();
  if (lower === CLEAN_TEST_ADDRESS) {
    return { ...cleanWallet, address: addr, chain: CHAIN, data_mode: 'fixture' };
  }
  if (lower === HIGH_RISK_TEST_ADDRESS) {
    return { ...highRiskWallet, address: addr, chain: CHAIN, data_mode: 'fixture' };
  }
  return { ...defaultWallet, address: addr, chain: CHAIN, data_mode: 'fixture' };
}

function parseCsvAddresses(csvText: string): string[] {
  return csvText
    .split(/\r?\n/)
    .map(line => line.split(',')[0]?.trim() ?? '')
    .filter(cell => cell.length > 0 && cell.toLowerCase() !== 'address');
}

function csvCell(val: string): string {
  const safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
  return `"${safe.replace(/"/g, '""')}"`;
}

// ── Risk Gauge ────────────────────────────────────────────────────────────────
function DemoGauge({ score, band }: { score: number; band: string }) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(score);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setDisplayed(score);
      return;
    }
    setDisplayed(0);
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      if (p >= 1) {
        setDisplayed(score);
        return;
      }
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.trunc(eased * score));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, reduced]);

  const radius = 70;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = scoreColor(score);
  const angle = Math.PI * (score / 100) - Math.PI;
  const needleX = 90 + radius * Math.cos(angle);
  const needleY = 90 + radius * Math.sin(angle);

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`Risk score ${score} out of 100, ${band}`}>
      <svg width="180" height="100" viewBox="0 0 180 100" aria-hidden="true">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="rgba(23,20,79,0.12)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: reduced ? 'none' : 'stroke 0.3s ease' }}
        />
        <line x1={90} y1={90} x2={needleX} y2={needleY} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <text x="20" y="85" fontSize="8" fill="#147564" fontFamily="DM Mono, monospace">0</text>
        <text x="88" y="22" fontSize="8" fill="#8C5808" fontFamily="DM Mono, monospace" textAnchor="middle">50</text>
        <text x="158" y="85" fontSize="8" fill="#B8332E" fontFamily="DM Mono, monospace" textAnchor="end">100</text>
      </svg>
      <div className="tabular-nums text-5xl font-black" style={{ color, fontFamily: 'Syne Variable, Syne, sans-serif' }}>
        {displayed}
      </div>
      <div className="text-xs tracking-widest uppercase" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
        risk score · {bandLabel(band)}
      </div>
    </div>
  );
}

// ── Reason list with visible integer weight sum ───────────────────────────────
function ReasonList({ reasons, score }: { reasons: RiskResult['reasons']; score: number }) {
  const rawSum = reasons.reduce((acc, r) => acc + Math.trunc(r.weight), 0);
  const terms = reasons.map(r => Math.trunc(r.weight));

  return (
    <div className="overflow-x-auto max-w-full">
      <ul className="space-y-3" aria-label="Risk reasons">
        {reasons.map(r => {
          const pts = Math.trunc(r.weight);
          const color = pts >= 30 ? '#B8332E' : pts > 0 ? '#8C5808' : '#147564';
          const barColor = pts >= 30 ? '#E2554F' : pts > 0 ? '#F2A93B' : '#1D9C86';
          return (
            <li
              key={r.code}
              className="rounded-lg p-4"
              style={{ background: 'rgba(23,20,79,0.04)', border: '1px solid rgba(23,20,79,0.08)' }}
            >
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <span className="text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                    {r.code}
                  </span>
                  <div className="font-semibold text-sm mt-0.5" style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}>
                    {r.title}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold tabular-nums" style={{ color }}>
                  {pts > 0 ? `+${pts}` : pts}
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#5B6178' }}>{r.detail}</p>
              <div className="mt-2 h-1 rounded-full" style={{ background: 'rgba(23,20,79,0.08)' }}>
                <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.abs(pts))}%`, background: barColor }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className="mt-4 pt-3 flex items-center justify-between text-xs font-mono"
        style={{
          borderTop: '1px solid rgba(23,20,79,0.1)',
          color: '#17144F',
          fontFamily: 'DM Mono, monospace',
        }}
      >
        <span>Weight sum</span>
        <span className="tabular-nums font-semibold">
          {terms.length > 0 ? `${terms.join(' + ')} = ${rawSum}` : '0'}
          {rawSum > 100 ? ` (capped at ${score})` : ` → score ${score}`}
        </span>
      </div>
    </div>
  );
}

// ── Main Demo Page ─────────────────────────────────────────────────────────────
export function Demo() {
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single wallet screening
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wakingUpBanner, setWakingUpBanner] = useState(false);
  const [isNetworkFallback, setIsNetworkFallback] = useState(false);

  // Usage & Config
  const [checksUsed, setChecksUsed] = useState<number>(0);
  const [quota, setQuota] = useState<number | null>(null);

  // Retry ref
  const lastRetryRef = useRef<(() => void) | null>(null);

  // What-if / Explainability
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Report & Attestation
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportSha256, setReportSha256] = useState<string | null>(null);
  const [copiedAttestCmd, setCopiedAttestCmd] = useState(false);

  // Verify report
  const [verifyResult, setVerifyResult] = useState<VerifyReportResponse | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyIsTamper, setVerifyIsTamper] = useState(false);

  // Analyst review / approval
  const [approval, setApproval] = useState<ApprovalResponse | null>(null);
  const [analystName, setAnalystName] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Feedback
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Batch CSV
  const [batchResults, setBatchResults] = useState<BatchFlatRow[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  // Audit verify
  const [auditResult, setAuditResult] = useState<AuditVerifyResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const singleTabRef = useRef<HTMLButtonElement>(null);
  const batchTabRef = useRef<HTMLButtonElement>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await apiFetch(`${BASE}/v1/usage`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as UsageResponse;
      if (typeof data.checks_used === 'number') {
        setChecksUsed(data.checks_used);
      }
      if (typeof data.quota === 'number' && data.quota > 0) {
        setQuota(data.quota);
      }
    } catch {
      // Backend unreachable; retain local counter
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiFetch(`${BASE}/v1/config`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });
      if (!res.ok) return;
      const cfg = (await res.json()) as { quota?: number };
      if (typeof cfg.quota === 'number' && cfg.quota > 0) {
        setQuota(cfg.quota);
      }
    } catch {
      // Optional config endpoint unreachable
    }
  }, []);

  useEffect(() => {
    // Cold start silent warm-up (no key, errors ignored)
    fetch(`${BASE}/health`).catch(() => {});
    fetch(`${BASE}/v1/health`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && typeof data.quota === 'number' && data.quota > 0) {
          setQuota(data.quota);
        }
      })
      .catch(() => {});
    fetchConfig();
    fetchUsage();
  }, [fetchConfig, fetchUsage]);

  async function ensureReportForAddress(currentResult: RiskResult): Promise<{ reportId: string; sha256: string } | null> {
    if (!currentResult || isNetworkFallback) return null;
    try {
      const res = await apiFetch(`${BASE}/v1/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ address: currentResult.address, chain: CHAIN }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as ReportCreateResponse;
      const cleanId = data.report_id?.trim();
      const sha = data.sha256?.trim();
      if (!cleanId) return null;
      setReportId(cleanId);
      setReportSha256(sha ?? null);
      loadApprovalStatus(cleanId);
      return { reportId: cleanId, sha256: sha ?? '' };
    } catch {
      return null;
    }
  }

  async function loadExplain(addr: string) {
    if (isNetworkFallback) return;
    setExplainLoading(true);
    setExplainError(null);
    try {
      const res = await apiFetch(`${BASE}/v1/explain/${CHAIN}/${addr}`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });
      if (!res.ok) {
        setExplainError(await parseErrorMessage(res, checksUsed, quota));
        setExplainData(null);
        setExplainLoading(false);
        return;
      }
      const data = (await res.json()) as ExplainResponse;
      setExplainData(data);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setExplainError(`Could not load counterfactuals (${reason}).`);
      setExplainData(null);
    } finally {
      setExplainLoading(false);
    }
  }

  async function loadApprovalStatus(cleanId: string) {
    if (!cleanId || !cleanId.trim() || isNetworkFallback) return;
    try {
      const res = await apiFetch(`${BASE}/v1/reports/${cleanId}/approval`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });
      if (!res.ok) {
        if (res.status === 404) {
          try {
            const errBody = (await res.json()) as { error?: string; message?: string };
            const msg = errBody.error || errBody.message || 'report_not_found';
            setApprovalError(msg);
            setApproval(null);
            return;
          } catch {
            setApprovalError('report_not_found');
            setApproval(null);
            return;
          }
        }
        setApprovalError(await parseErrorMessage(res, checksUsed, quota));
        setApproval(null);
        return;
      }
      const data = (await res.json()) as ApprovalResponse;
      setApproval(data);
      setApprovalError(null);
    } catch {
      setApproval({ decision: 'pending' });
    }
  }

  async function performScreen(trimmed: string) {
    setValidationError(null);
    setLoading(true);
    setError(null);
    setWakingUpBanner(false);
    setIsNetworkFallback(false);
    setExplainData(null);
    setExplainError(null);
    setReportError(null);
    setReportId(null);
    setReportSha256(null);
    setVerifyResult(null);
    setVerifyError(null);
    setApproval(null);
    setApprovalError(null);
    setFeedbackSent(null);
    setFeedbackError(null);
    setResult(null);

    lastRetryRef.current = () => performScreen(trimmed);

    try {
      const res = await apiFetch(`${BASE}/v1/risk/${CHAIN}/${trimmed}`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(res, checksUsed, quota);
        setError(msg);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as RiskResult;
      if (import.meta.env.DEV) {
        const weightSum = data.reasons.reduce((acc, r) => acc + Math.trunc(r.weight), 0);
        const expected = Math.min(100, weightSum);
        if (data.score !== expected) {
          console.warn(
            `[Praman] Score mismatch for ${data.address}: score=${data.score}, min(100, sum(weights))=${expected}`
          );
        }
      }
      setWakingUpBanner(false);
      setResult(data);
      setLoading(false);
      fetchUsage();
      loadExplain(trimmed);
      ensureReportForAddress(data);
      return;
    } catch {
      setWakingUpBanner(true);
    }

    const fixture = fixtureForAddress(trimmed);
    setIsNetworkFallback(true);
    setChecksUsed(prev => (quota !== null ? Math.min(quota, prev + 1) : prev + 1));
    setResult(fixture);
    setLoading(false);
  }

  function handleScreen(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();

    if (!ETH_ADDRESS_RE.test(trimmed)) {
      setValidationError('Enter a valid Ethereum address (0x followed by 40 hex characters).');
      return;
    }

    performScreen(trimmed);
  }

  async function handleDownloadReport() {
    if (!result) return;
    if (isNetworkFallback) {
      setReportError('PDF report generation requires a reachable backend API.');
      setReportSha256(null);
      setReportId(null);
      return;
    }

    setDownloadingReport(true);
    setReportError(null);

    try {
      let cleanId = reportId;
      let sha = reportSha256;

      if (!cleanId) {
        const createRes = await apiFetch(`${BASE}/v1/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({ address: result.address, chain: CHAIN }),
        });

        if (!createRes.ok) {
          setReportError(await parseErrorMessage(createRes, checksUsed, quota));
          setReportSha256(null);
          setDownloadingReport(false);
          return;
        }

        const createData = (await createRes.json()) as ReportCreateResponse;
        cleanId = createData.report_id.trim();
        sha = createData.sha256?.trim() ?? null;
        setReportId(cleanId);
        setReportSha256(sha);
      }

      const pdfRes = await apiFetch(`${BASE}/v1/reports/${cleanId}.pdf`, {
        headers: { 'X-API-Key': API_KEY },
      });

      if (!pdfRes.ok) {
        setReportError(await parseErrorMessage(pdfRes, checksUsed, quota));
        setDownloadingReport(false);
        return;
      }

      const apiSha256 = pdfRes.headers.get('X-Report-SHA256') ?? sha ?? null;
      const blob = await pdfRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `praman-report-${result.address.slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

      setReportSha256(apiSha256);
      loadApprovalStatus(cleanId);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setReportError(`Could not reach backend to generate PDF report (${reason}).`);
      setReportSha256(null);
    } finally {
      setDownloadingReport(false);
    }
  }

  async function handleVerifyReport(tamper: boolean) {
    if (!result || isNetworkFallback) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyIsTamper(tamper);

    let currentSha256 = reportSha256;
    if (!currentSha256) {
      const created = await ensureReportForAddress(result);
      currentSha256 = created?.sha256 ?? null;
    }

    if (!currentSha256) {
      setVerifyError('Create a report first to verify its integrity.');
      setVerifyLoading(false);
      return;
    }

    const scoreToSend = tamper ? (result.score === 100 ? 99 : result.score + 1) : result.score;

    try {
      const res = await apiFetch(`${BASE}/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          address: result.address,
          chain: result.chain,
          score: scoreToSend,
          band: result.band,
          reasons: result.reasons,
          generated_at: result.generated_at,
          sha256: currentSha256,
        }),
      });

      if (!res.ok) {
        setVerifyError(await parseErrorMessage(res, checksUsed, quota));
        setVerifyResult(null);
        setVerifyLoading(false);
        return;
      }

      const data = (await res.json()) as VerifyReportResponse;
      setVerifyResult(data);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setVerifyError(`Could not reach verify endpoint (${reason}).`);
      setVerifyResult(null);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleApprove(decision: 'approved' | 'rejected' | 'needs_review') {
    if (!result || isNetworkFallback) return;
    const trimmedName = analystName.trim();
    if (!trimmedName) {
      setApprovalError('Enter analyst name before recording a decision.');
      return;
    }

    setApprovalLoading(true);
    setApprovalError(null);

    let currentReportId = reportId;
    if (!currentReportId) {
      const created = await ensureReportForAddress(result);
      currentReportId = created?.reportId ?? null;
    }

    if (!currentReportId) {
      setApprovalError('Create a report first before recording a decision.');
      setApprovalLoading(false);
      return;
    }

    try {
      const res = await apiFetch(`${BASE}/v1/reports/${currentReportId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          analyst_name: trimmedName,
          decision,
          note: reviewNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        setApprovalError(await parseErrorMessage(res, checksUsed, quota));
        setApprovalLoading(false);
        return;
      }

      const data = (await res.json()) as ApprovalResponse;
      setApproval({
        decision: data.decision ?? decision,
        analyst_name: data.analyst_name ?? trimmedName,
        note: data.note ?? (reviewNote.trim() || undefined),
        decided_at: data.decided_at ?? data.timestamp ?? new Date().toISOString(),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setApprovalError(`Could not save approval (${reason}).`);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleFeedback(verdict: 'true_positive' | 'false_positive' | 'unsure') {
    if (!result || isNetworkFallback) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const res = await apiFetch(`${BASE}/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ address: result.address, verdict }),
      });

      if (!res.ok) {
        setFeedbackError(await parseErrorMessage(res, checksUsed, quota));
        setSubmittingFeedback(false);
        return;
      }

      setFeedbackSent(verdict);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setFeedbackError(`Could not submit feedback (${reason}).`);
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function runBatchCsv(csvText: string, file?: File) {
    setBatchLoading(true);
    setBatchError(null);
    setBatchNotice(null);

    const addresses = parseCsvAddresses(csvText);
    if (addresses.length === 0) {
      setBatchError('No wallet addresses found in CSV.');
      setBatchLoading(false);
      return;
    }

    lastRetryRef.current = () => runBatchCsv(csvText, file);

    try {
      const formData = new FormData();
      const csvFile = file ?? new File([csvText], 'wallets.csv', { type: 'text/csv' });
      formData.append('file', csvFile);

      const res = await apiFetch(`${BASE}/v1/batch`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          Accept: 'application/json',
        },
        body: formData,
      });

      if (!res.ok) {
        setBatchResults([]);
        setBatchError(await parseErrorMessage(res, checksUsed, quota));
        setBatchLoading(false);
        return;
      }

      const payload: unknown = await res.json();
      if (!Array.isArray(payload)) {
        setBatchResults([]);
        setBatchError('Unexpected response from server');
        setBatchLoading(false);
        return;
      }

      setWakingUpBanner(false);
      setBatchResults(payload as BatchFlatRow[]);
      setBatchLoading(false);
      fetchUsage();
      return;
    } catch {
      setWakingUpBanner(true);
      setBatchNotice('Demo data · Backend waking up or unreachable — showing local fixture batch results.');
    }

    const fallbackRows: BatchFlatRow[] = addresses.map(addr => {
      if (!ETH_ADDRESS_RE.test(addr)) {
        return {
          address: addr,
          error: {
            error: 'invalid_address',
            message: 'Invalid wallet address format. Expected 0x followed by 40 hex characters.',
          },
        };
      }
      const res = fixtureForAddress(addr);
      return {
        address: res.address,
        score: res.score,
        band: res.band,
        sanctions_hit: res.sanctions_hit,
        top_reason_code: res.reasons[0]?.code ?? 'NONE',
      };
    });

    setBatchResults(fallbackRows);
    setBatchLoading(false);
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      runBatchCsv(text, file);
    };
    reader.readAsText(file);
  }

  function downloadBatchCsv() {
    if (batchResults.length === 0) return;
    const header = ['address', 'score', 'band', 'sanctions_hit', 'top_reason'];
    const lines = [
      header.join(','),
      ...batchResults.map(row => {
        if (isBatchErrorRow(row)) {
          return [
            csvCell(row.address),
            '',
            csvCell('error'),
            '',
            csvCell(row.error.message || row.error.error),
          ].join(',');
        }
        return [
          csvCell(row.address),
          String(row.score),
          csvCell(row.band),
          String(row.sanctions_hit),
          csvCell(row.top_reason_code),
        ].join(',');
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'praman-batch-results.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function handleVerifyAudit() {
    setAuditLoading(true);
    setAuditError(null);

    try {
      const res = await apiFetch(`${BASE}/v1/audit/verify`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!res.ok) {
        setAuditError(await parseErrorMessage(res, checksUsed, quota));
        setAuditResult(null);
        setAuditLoading(false);
        return;
      }

      const data = (await res.json()) as { valid?: boolean; entries?: number; entry_count?: number };
      setAuditResult({
        valid: Boolean(data.valid),
        entries: data.entries ?? data.entry_count ?? 0,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setAuditError(`Could not reach audit endpoint (${reason}).`);
      setAuditResult(null);
    } finally {
      setAuditLoading(false);
    }
  }

  function loadTestAddress(addr: string) {
    setAddress(addr);
    setValidationError(null);
    setError(null);
  }

  function handleResetDemo() {
    setAddress('');
    setValidationError(null);
    setResult(null);
    setError(null);
    setWakingUpBanner(false);
    setIsNetworkFallback(false);
    setExplainData(null);
    setExplainError(null);
    setReportId(null);
    setReportSha256(null);
    setReportError(null);
    setCopiedAttestCmd(false);
    setVerifyResult(null);
    setVerifyError(null);
    setApproval(null);
    setAnalystName('');
    setReviewNote('');
    setApprovalError(null);
    setFeedbackSent(null);
    setFeedbackError(null);
    setBatchResults([]);
    setBatchError(null);
    setBatchNotice(null);
    setAuditResult(null);
    setAuditError(null);
  }

  function handleRetry() {
    setWakingUpBanner(false);
    if (lastRetryRef.current) {
      lastRetryRef.current();
    } else {
      const target = address.trim() || CLEAN_TEST_ADDRESS;
      performScreen(target);
    }
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const next =
        e.key === 'Home'
          ? 'single'
          : e.key === 'End'
            ? 'batch'
            : activeTab === 'single'
              ? 'batch'
              : 'single';
      setActiveTab(next);
      (next === 'single' ? singleTabRef.current : batchTabRef.current)?.focus();
    }
  }

  const usagePct = quota && quota > 0 ? Math.min(100, Math.round((checksUsed / quota) * 100)) : 0;
  const reportHash = reportSha256?.trim() ?? null;
  const attestCmd = reportHash && result
    ? `REPORT_HASH=${reportHash} BAND=${result.band.toLowerCase()} npx hardhat run scripts/demo-attest.js --network hardhat`
    : '';
  const currentDecision: ApprovalDecision = approval?.decision ?? 'pending';

  async function handleCopyAttestCmd() {
    if (!attestCmd) return;
    try {
      await navigator.clipboard.writeText(attestCmd);
      setCopiedAttestCmd(true);
      setTimeout(() => setCopiedAttestCmd(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <>
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6" style={{ background: '#EDF0F7' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-sm" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                — {BRAND.name} demo
              </span>
              <h1
                className="text-3xl sm:text-4xl font-black mt-2 mb-2"
                style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
              >
                Screen a wallet.
              </h1>
              <p className="text-sm sm:text-base" style={{ color: '#5B6178' }}>
                Verify scores, reason weights, fund-flow graphs, PDF reports, and batch CSV screening.
              </p>
            </div>

            {/* Verify audit log & Reset controls */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleVerifyAudit}
                  disabled={auditLoading}
                  className="px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-mono border inline-flex items-center gap-2 transition-colors duration-150"
                  style={{
                    borderColor: 'rgba(23,20,79,0.25)',
                    background: '#fff',
                    color: '#17144F',
                    cursor: auditLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Mono, monospace',
                  }}
                  aria-label="Verify audit log"
                >
                  {auditLoading ? (
                    <Loader2 size={14} className={reduced ? '' : 'animate-spin'} aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={14} aria-hidden="true" />
                  )}
                  Verify audit log
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-mono border inline-flex items-center gap-2 transition-colors duration-150"
                  style={{
                    borderColor: 'rgba(23,20,79,0.25)',
                    background: '#fff',
                    color: '#17144F',
                    cursor: 'pointer',
                    fontFamily: 'DM Mono, monospace',
                  }}
                  aria-label="Reset demo"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Reset
                </button>
              </div>

              {auditResult && (
                <div
                  className="text-xs px-2.5 py-1 rounded font-mono"
                  style={{
                    background: auditResult.valid ? 'rgba(29,156,134,0.12)' : 'rgba(226,85,79,0.12)',
                    color: auditResult.valid ? '#147564' : '#B8332E',
                    fontFamily: 'DM Mono, monospace',
                  }}
                  role="status"
                >
                  {auditResult.valid ? `Audit log valid, ${auditResult.entries} entries` : 'Audit log INVALID'}
                </div>
              )}

              {auditError && (
                <div
                  className="text-xs font-mono"
                  style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }}
                  role="alert"
                >
                  {auditError}
                </div>
              )}
            </div>
          </div>

          {/* Mode Tabs */}
          <div role="tablist" aria-label="Demo screening modes" className="flex gap-2 mb-6 border-b pb-3" style={{ borderColor: 'rgba(23,20,79,0.12)' }}>
            <button
              ref={singleTabRef}
              id="tab-single"
              type="button"
              role="tab"
              aria-selected={activeTab === 'single'}
              aria-controls="panel-single"
              tabIndex={activeTab === 'single' ? 0 : -1}
              onClick={() => setActiveTab('single')}
              onKeyDown={handleTabKeyDown}
              className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors duration-150"
              style={{
                background: activeTab === 'single' ? '#17144F' : 'transparent',
                color: activeTab === 'single' ? '#EDF0F7' : '#5B6178',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Syne Variable, Syne, sans-serif',
              }}
            >
              Wallet check
            </button>
            <button
              ref={batchTabRef}
              id="tab-batch"
              type="button"
              role="tab"
              aria-selected={activeTab === 'batch'}
              aria-controls="panel-batch"
              tabIndex={activeTab === 'batch' ? 0 : -1}
              onClick={() => setActiveTab('batch')}
              onKeyDown={handleTabKeyDown}
              className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors duration-150"
              style={{
                background: activeTab === 'batch' ? '#17144F' : 'transparent',
                color: activeTab === 'batch' ? '#EDF0F7' : '#5B6178',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Syne Variable, Syne, sans-serif',
              }}
            >
              Batch CSV
            </button>
          </div>

          {/* ── WALLET CHECK TAB ───────────────────────────────────────────── */}
          {activeTab === 'single' && (
            <div id="panel-single" role="tabpanel" aria-labelledby="tab-single">
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => loadTestAddress(CLEAN_TEST_ADDRESS)}
                  className="text-xs px-3 py-2 min-h-[44px] rounded border transition-colors duration-150"
                  style={{
                    borderColor: '#1D9C86',
                    color: '#147564',
                    background: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  Load clean address (0x1111…1111)
                </button>
                <button
                  type="button"
                  onClick={() => loadTestAddress(HIGH_RISK_TEST_ADDRESS)}
                  className="text-xs px-3 py-2 min-h-[44px] rounded border transition-colors duration-150"
                  style={{
                    borderColor: '#E2554F',
                    color: '#B8332E',
                    background: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  Load high-risk address (0x2222…2222 · FAKE)
                </button>
              </div>

              <form onSubmit={handleScreen} className="mb-8" noValidate>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div
                    className="rounded-lg px-4 py-3 min-h-[44px] text-sm border flex items-center"
                    style={{
                      background: 'rgba(23,20,79,0.05)',
                      borderColor: 'rgba(23,20,79,0.15)',
                      color: '#17144F',
                      fontFamily: 'DM Mono, monospace',
                      minWidth: '115px',
                    }}
                    aria-label="Blockchain network"
                  >
                    {CHAIN}
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={e => {
                      setAddress(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={HIGH_RISK_TEST_ADDRESS}
                    className="flex-1 min-h-[44px] rounded-lg px-4 py-3 text-sm border"
                    style={{
                      background: '#fff',
                      borderColor: validationError ? '#E2554F' : 'rgba(23,20,79,0.15)',
                      color: '#17144F',
                      fontFamily: 'DM Mono, monospace',
                    }}
                    aria-label="Ethereum wallet address"
                    aria-invalid={Boolean(validationError)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 min-h-[44px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors duration-150"
                    style={{
                      background: !loading ? '#17144F' : 'rgba(23,20,79,0.5)',
                      color: '#EDF0F7',
                      border: 'none',
                      cursor: !loading ? 'pointer' : 'not-allowed',
                      fontFamily: 'Syne Variable, Syne, sans-serif',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className={reduced ? '' : 'animate-spin'} aria-hidden="true" />
                        Screening…
                      </>
                    ) : (
                      'Screen wallet'
                    )}
                  </button>
                </div>

                {validationError && (
                  <p className="mt-2 text-xs font-mono" style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }} role="alert">
                    {validationError}
                  </p>
                )}
              </form>

              {error && (
                <div
                  className="mb-6 p-4 rounded-lg flex items-center gap-3"
                  style={{ background: 'rgba(226,85,79,0.1)', border: '1px solid rgba(226,85,79,0.35)', color: '#B8332E' }}
                  role="alert"
                >
                  <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {wakingUpBanner && (
                <div
                  className="mb-6 p-3.5 rounded-lg text-xs font-mono flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  style={{
                    background: 'rgba(242,169,59,0.16)',
                    border: '1px solid rgba(242,169,59,0.45)',
                    color: '#8C5808',
                    fontFamily: 'DM Mono, monospace',
                  }}
                  role="status"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} aria-hidden="true" className="shrink-0 text-[#F2A93B]" />
                    <span>The API is waking up (free hosting can take about a minute).</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-3 py-1.5 rounded min-h-[36px] font-semibold text-xs transition-colors shrink-0"
                    style={{
                      background: '#F2A93B',
                      color: '#17144F',
                      cursor: 'pointer',
                      fontFamily: 'DM Mono, monospace',
                    }}
                    aria-label="Retry"
                  >
                    Retry
                  </button>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Data mode & Sanctions badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded text-xs font-mono"
                      style={
                        result.data_mode === 'fixture'
                          ? {
                              background: 'rgba(242,169,59,0.18)',
                              border: '1px solid rgba(242,169,59,0.5)',
                              color: '#8C5808',
                              fontFamily: 'DM Mono, monospace',
                            }
                          : {
                              background: 'rgba(29,156,134,0.12)',
                              border: '1px solid rgba(29,156,134,0.35)',
                              color: '#147564',
                              fontFamily: 'DM Mono, monospace',
                            }
                      }
                      role="status"
                    >
                      {result.data_mode === 'fixture' ? 'Demo data' : 'Live data'}
                    </span>

                    {result.sanctions_hit ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold"
                        style={{
                          background: 'rgba(226,85,79,0.12)',
                          border: '1px solid rgba(226,85,79,0.4)',
                          color: '#B8332E',
                          fontFamily: 'DM Mono, monospace',
                        }}
                        role="alert"
                      >
                        <ShieldAlert size={13} aria-hidden="true" />
                        Sanctions hit
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono"
                        style={{
                          background: 'rgba(29,156,134,0.1)',
                          border: '1px solid rgba(29,156,134,0.3)',
                          color: '#147564',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        <CheckCircle size={13} aria-hidden="true" />
                        No sanctions hit
                      </span>
                    )}
                  </div>

                  {/* Three-column results */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Gauge + Report */}
                    <div
                      className="min-w-0 rounded-xl p-6 flex flex-col items-center justify-between"
                      style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                    >
                      <DemoGauge score={result.score} band={result.band} />
                      <div className="mt-4 text-center">
                        <div className="text-xs mb-1" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                          {result.chain.toLowerCase()} · {result.band}
                        </div>
                        <div className="text-xs break-all" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                          {result.address.slice(0, 10)}…{result.address.slice(-6)}
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                          {new Date(result.generated_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="w-full mt-6">
                        <button
                          type="button"
                          onClick={handleDownloadReport}
                          disabled={downloadingReport}
                          className="w-full py-2.5 min-h-[44px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150"
                          style={{
                            background: downloadingReport ? 'rgba(23,20,79,0.5)' : '#17144F',
                            color: '#EDF0F7',
                            border: 'none',
                            cursor: downloadingReport ? 'not-allowed' : 'pointer',
                            fontFamily: 'Syne Variable, Syne, sans-serif',
                          }}
                        >
                          {downloadingReport ? (
                            <>
                              <Loader2 size={14} className={reduced ? '' : 'animate-spin'} aria-hidden="true" />
                              Generating PDF…
                            </>
                          ) : (
                            <>
                              <Download size={14} aria-hidden="true" />
                              Download report
                            </>
                          )}
                        </button>

                        {reportError && (
                          <p className="mt-2 text-xs text-center" style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }} role="alert">
                            {reportError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reasons */}
                    <div
                      className="min-w-0 rounded-xl p-6"
                      style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                    >
                      <h2
                        className="text-base font-bold mb-4"
                        style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                      >
                        Proof — why this score
                      </h2>
                      <ReasonList reasons={result.reasons} score={result.score} />
                    </div>

                    {/* Fund-flow graph */}
                    <div
                      className="min-w-0 rounded-xl p-6"
                      style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                    >
                      <h2
                        className="text-base font-bold mb-4"
                        style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                      >
                        Fund-flow graph
                      </h2>
                      <DemoGraph nodes={result.graph.nodes} edges={result.graph.edges} />
                      <div className="flex gap-4 mt-3 justify-center">
                        {[
                          { label: 'Low', color: '#1D9C86' },
                          { label: 'Medium', color: '#F2A93B' },
                          { label: 'High/Severe', color: '#E2554F' },
                        ].map(l => (
                          <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                            {l.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3) What would change this score? (Explainability / Counterfactuals) */}
                  <div
                    className="min-w-0 rounded-xl p-6"
                    style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h2
                        className="text-base font-bold"
                        style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                      >
                        What would change this score?
                      </h2>
                      {result.data_mode === 'fixture' && (
                        <span
                          className="text-xs px-2.5 py-0.5 rounded font-mono"
                          style={{
                            background: 'rgba(242,169,59,0.16)',
                            color: '#8C5808',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          What-if (fake demo data)
                        </span>
                      )}
                    </div>

                    {isNetworkFallback ? (
                      <p className="text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                        Disabled in offline Demo data mode — start the backend API to run counterfactual analysis.
                      </p>
                    ) : explainLoading ? (
                      <div className="flex items-center gap-2 text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                        <Loader2 size={14} className={reduced ? '' : 'animate-spin'} aria-hidden="true" />
                        Loading counterfactuals…
                      </div>
                    ) : explainError ? (
                      <p className="text-xs font-mono" style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }} role="alert">
                        {explainError}
                      </p>
                    ) : explainData ? (
                      <div className="space-y-4">
                        {explainData.band_gap?.next_band && (
                          <div className="text-xs font-mono" style={{ color: '#17144F', fontFamily: 'DM Mono, monospace' }}>
                            {explainData.band_gap.points_needed} points to reach {explainData.band_gap.next_band}
                          </div>
                        )}
                        {explainData.counterfactuals.length === 0 ? (
                          <p className="text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                            No single-rule counterfactuals change this score.
                          </p>
                        ) : (
                          <ul className="space-y-3" aria-label="Counterfactual scenarios">
                            {explainData.counterfactuals.map(item => (
                              <li key={item.without_code} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-mono" style={{ fontFamily: 'DM Mono, monospace' }}>
                                  <span style={{ color: '#17144F' }}>
                                    Without {item.without_code}: {item.score_without} ({item.band_without})
                                  </span>
                                  <span style={{ color: bandTextColor(item.band_without) }} className="font-semibold">
                                    {item.score_without}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full" style={{ background: 'rgba(23,20,79,0.08)' }}>
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${Math.min(100, Math.max(2, item.score_without))}%`,
                                      background: bandBarColor(item.band_without),
                                    }}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* 4) Verify report & 5) Analyst review (shown after a report exists) */}
                  {reportId && (
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Verify report */}
                      <div
                        className="min-w-0 rounded-xl p-6"
                        style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                      >
                        <h2
                          className="text-base font-bold mb-2"
                          style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                        >
                          Verify report
                        </h2>
                        <p className="text-xs mb-4" style={{ color: '#5B6178' }}>
                          Verify the API-issued report hash on the server, or simulate a 1-point tamper check.
                        </p>

                        {isNetworkFallback ? (
                          <p className="text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                            Disabled in offline Demo data mode — start the backend API to verify reports.
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={verifyLoading || !reportSha256}
                                onClick={() => handleVerifyReport(false)}
                                className="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors duration-150"
                                style={{
                                  background: '#17144F',
                                  color: '#EDF0F7',
                                  border: 'none',
                                  cursor: verifyLoading || !reportSha256 ? 'not-allowed' : 'pointer',
                                  fontFamily: 'Syne Variable, Syne, sans-serif',
                                }}
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                disabled={verifyLoading || !reportSha256}
                                onClick={() => handleVerifyReport(true)}
                                className="px-4 py-2 min-h-[44px] rounded-lg text-xs font-mono border transition-colors duration-150"
                                style={{
                                  borderColor: '#E2554F',
                                  color: '#B8332E',
                                  background: '#fff',
                                  cursor: verifyLoading || !reportSha256 ? 'not-allowed' : 'pointer',
                                  fontFamily: 'DM Mono, monospace',
                                }}
                              >
                                Tamper test
                              </button>
                            </div>

                            {verifyResult && (
                              <div
                                className="mt-4 p-3 rounded-lg text-xs font-mono"
                                style={{
                                  background: verifyResult.valid ? 'rgba(29,156,134,0.1)' : 'rgba(226,85,79,0.1)',
                                  color: verifyResult.valid ? '#147564' : '#B8332E',
                                  fontFamily: 'DM Mono, monospace',
                                }}
                                role="status"
                              >
                                <div className="font-semibold">
                                  {verifyResult.valid ? 'Hash matches' : 'Hash does NOT match'}
                                  {verifyIsTamper ? ' (tamper test: score altered by 1)' : ''}
                                </div>
                                {verifyResult.computed_sha256 && (
                                  <div className="mt-1 break-all">computed: {verifyResult.computed_sha256}</div>
                                )}
                              </div>
                            )}

                            {verifyError && (
                              <p className="mt-3 text-xs font-mono" style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }} role="alert">
                                {verifyError}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Analyst review */}
                      <div
                        className="min-w-0 rounded-xl p-6"
                        style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <h2
                            className="text-base font-bold"
                            style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                          >
                            Analyst review
                          </h2>
                          <span
                            className="px-2.5 py-0.5 rounded text-xs font-mono"
                            style={{
                              background:
                                currentDecision === 'approved'
                                  ? 'rgba(29,156,134,0.12)'
                                  : currentDecision === 'rejected'
                                    ? 'rgba(226,85,79,0.12)'
                                    : 'rgba(242,169,59,0.18)',
                              color:
                                currentDecision === 'approved'
                                  ? '#147564'
                                  : currentDecision === 'rejected'
                                    ? '#B8332E'
                                    : '#8C5808',
                              fontFamily: 'DM Mono, monospace',
                            }}
                            role="status"
                          >
                            {currentDecision === 'pending' ? 'Pending review' : currentDecision}
                            {approval?.analyst_name ? ` · ${approval.analyst_name}` : ''}
                            {approval?.decided_at || approval?.timestamp
                              ? ` · ${new Date(approval.decided_at ?? approval.timestamp ?? '').toLocaleTimeString()}`
                              : ''}
                          </span>
                        </div>

                        <p className="text-xs mb-4" style={{ color: '#5B6178' }}>
                          Draft report. A human compliance officer decides.
                        </p>

                        {isNetworkFallback ? (
                          <p className="text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                            Disabled in offline Demo data mode — start the backend API to record analyst review.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={analystName}
                                onChange={e => setAnalystName(e.target.value)}
                                placeholder="Analyst name"
                                aria-label="Analyst name"
                                className="min-h-[44px] rounded-lg px-3 py-2 text-xs border"
                                style={{
                                  background: '#fff',
                                  borderColor: 'rgba(23,20,79,0.18)',
                                  color: '#17144F',
                                  fontFamily: 'DM Mono, monospace',
                                }}
                              />
                              <input
                                type="text"
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                placeholder="Optional note"
                                aria-label="Review note"
                                className="min-h-[44px] rounded-lg px-3 py-2 text-xs border"
                                style={{
                                  background: '#fff',
                                  borderColor: 'rgba(23,20,79,0.18)',
                                  color: '#17144F',
                                  fontFamily: 'DM Mono, monospace',
                                }}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(
                                [
                                  { id: 'approved', label: 'Approved' },
                                  { id: 'rejected', label: 'Rejected' },
                                  { id: 'needs_review', label: 'Needs review' },
                                ] as const
                              ).map(btn => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  disabled={approvalLoading}
                                  onClick={() => handleApprove(btn.id)}
                                  className="px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-mono border transition-colors duration-150"
                                  style={{
                                    background: currentDecision === btn.id ? '#17144F' : '#EDF0F7',
                                    color: currentDecision === btn.id ? '#EDF0F7' : '#17144F',
                                    borderColor: currentDecision === btn.id ? '#17144F' : 'rgba(23,20,79,0.18)',
                                    cursor: approvalLoading ? 'not-allowed' : 'pointer',
                                    fontFamily: 'DM Mono, monospace',
                                  }}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>

                            {approvalError && (
                              <p className="text-xs font-mono" style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }} role="alert">
                                {approvalError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Feedback + Attestation panels */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Feedback */}
                    <div
                      className="min-w-0 rounded-xl p-6"
                      style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                    >
                      <h2
                        className="text-base font-bold mb-2"
                        style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                      >
                        Analyst feedback
                      </h2>
                      <p className="text-xs mb-4" style={{ color: '#5B6178' }}>
                        Record whether this screening outcome matches your analyst review.
                      </p>
                      {isNetworkFallback ? (
                        <p className="text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                          Disabled in offline Demo data mode — start the backend API to submit feedback.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                { id: 'true_positive', label: 'True positive' },
                                { id: 'false_positive', label: 'False positive' },
                                { id: 'unsure', label: 'Unsure' },
                              ] as const
                            ).map(btn => {
                              const selected = feedbackSent === btn.id;
                              return (
                                <button
                                  key={btn.id}
                                  type="button"
                                  disabled={submittingFeedback}
                                  onClick={() => handleFeedback(btn.id)}
                                  className="px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-mono border transition-colors duration-150"
                                  style={{
                                    background: selected ? '#17144F' : '#EDF0F7',
                                    color: selected ? '#EDF0F7' : '#17144F',
                                    borderColor: selected ? '#17144F' : 'rgba(23,20,79,0.18)',
                                    cursor: submittingFeedback ? 'not-allowed' : 'pointer',
                                    fontFamily: 'DM Mono, monospace',
                                  }}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                          {feedbackSent && (
                            <p className="mt-3 text-xs font-mono" style={{ color: '#147564', fontFamily: 'DM Mono, monospace' }} role="status">
                              Feedback recorded ({feedbackSent.replace('_', ' ')})
                            </p>
                          )}
                          {feedbackError && (
                            <p className="mt-3 text-xs font-mono" style={{ color: '#B8332E', fontFamily: 'DM Mono, monospace' }} role="alert">
                              {feedbackError}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Attestation panel */}
                    <div
                      className="min-w-0 rounded-xl p-6"
                      style={{ background: '#17144F', color: '#EDF0F7' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2
                          className="text-base font-bold"
                          style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                        >
                          Local attestation
                        </h2>
                        <span
                          className="px-2.5 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: 'rgba(242,169,59,0.2)',
                            color: '#F2A93B',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          LOCAL DEMO - not legal proof
                        </span>
                      </div>

                      {reportHash ? (
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs mb-1" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
                              Report data hash
                            </div>
                            <code
                              className="block text-xs p-2 rounded break-all"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#F2A93B', fontFamily: 'DM Mono, monospace' }}
                            >
                              {reportHash}
                            </code>
                          </div>

                          <div>
                            <div className="text-xs mb-1" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
                              Local demo attestation command
                            </div>
                            <div className="flex items-center gap-2">
                              <code
                                className="flex-1 text-xs p-2 rounded break-all"
                                style={{ background: 'rgba(255,255,255,0.08)', color: '#F2A93B', fontFamily: 'DM Mono, monospace' }}
                              >
                                {attestCmd}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopyAttestCmd}
                                className="px-3 py-2 min-h-[44px] min-w-[44px] rounded border shrink-0 text-xs font-mono inline-flex items-center justify-center gap-1.5"
                                style={{
                                  borderColor: 'rgba(237,240,247,0.25)',
                                  background: 'transparent',
                                  color: '#EDF0F7',
                                  cursor: 'pointer',
                                  fontFamily: 'DM Mono, monospace',
                                }}
                                aria-label="Copy local attestation command"
                              >
                                {copiedAttestCmd ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                <span>{copiedAttestCmd ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
                          Create a report first
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BATCH CSV TAB ──────────────────────────────────────────────── */}
          {activeTab === 'batch' && (
            <div id="panel-batch" role="tabpanel" aria-labelledby="tab-batch" className="space-y-6">
              <div
                className="rounded-xl p-6"
                style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2
                      className="text-base font-bold mb-1"
                      style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                    >
                      Upload wallet CSV
                    </h2>
                    <p className="text-xs" style={{ color: '#5B6178' }}>
                      One Ethereum address per row (first column). Submits to POST /v1/batch.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label
                      className="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                      style={{
                        background: '#17144F',
                        color: '#EDF0F7',
                        fontFamily: 'Syne Variable, Syne, sans-serif',
                      }}
                    >
                      <Upload size={14} aria-hidden="true" />
                      Upload CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleCsvUpload}
                        className="sr-only"
                        aria-label="Upload CSV file of wallet addresses"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => runBatchCsv(SAMPLE_CSV)}
                      disabled={batchLoading}
                      className="px-4 py-2 min-h-[44px] rounded-lg text-xs font-mono border"
                      style={{
                        borderColor: 'rgba(23,20,79,0.25)',
                        background: '#EDF0F7',
                        color: '#17144F',
                        cursor: batchLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      Run sample CSV (3 addresses)
                    </button>
                  </div>
                </div>

                {batchLoading && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-mono" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                    <Loader2 size={14} className={reduced ? '' : 'animate-spin'} aria-hidden="true" />
                    Processing batch…
                  </div>
                )}

                {batchError && (
                  <div
                    className="mt-4 p-3 rounded-lg flex items-center gap-2 text-xs"
                    style={{ background: 'rgba(226,85,79,0.1)', color: '#B8332E' }}
                    role="alert"
                  >
                    <AlertTriangle size={14} aria-hidden="true" />
                    {batchError}
                  </div>
                )}

                {wakingUpBanner && (
                  <div
                    className="mt-4 p-3.5 rounded-lg text-xs font-mono flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    style={{
                      background: 'rgba(242,169,59,0.16)',
                      border: '1px solid rgba(242,169,59,0.45)',
                      color: '#8C5808',
                      fontFamily: 'DM Mono, monospace',
                    }}
                    role="status"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} aria-hidden="true" className="shrink-0 text-[#F2A93B]" />
                      <span>The API is waking up (free hosting can take about a minute).</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="px-3 py-1.5 rounded min-h-[36px] font-semibold text-xs transition-colors shrink-0"
                      style={{
                        background: '#F2A93B',
                        color: '#17144F',
                        cursor: 'pointer',
                        fontFamily: 'DM Mono, monospace',
                      }}
                      aria-label="Retry"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {batchNotice && (
                  <div
                    className="mt-4 p-3 rounded-lg text-xs font-mono"
                    style={{
                      background: 'rgba(242,169,59,0.16)',
                      border: '1px solid rgba(242,169,59,0.45)',
                      color: '#8C5808',
                      fontFamily: 'DM Mono, monospace',
                    }}
                    role="status"
                  >
                    {batchNotice}
                  </div>
                )}
              </div>

              {batchResults.length > 0 && (
                <div
                  className="rounded-xl p-6"
                  style={{ background: '#fff', border: '1px solid rgba(23,20,79,0.08)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <h2
                        className="text-base font-bold"
                        style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                      >
                        Batch results ({batchResults.length})
                      </h2>
                      <span
                        className="px-2.5 py-0.5 rounded text-xs font-mono"
                        style={
                          batchNotice
                            ? { background: 'rgba(242,169,59,0.18)', color: '#8C5808', fontFamily: 'DM Mono, monospace' }
                            : { background: 'rgba(29,156,134,0.12)', color: '#147564', fontFamily: 'DM Mono, monospace' }
                        }
                      >
                        {batchNotice ? 'Demo data' : 'API response'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={downloadBatchCsv}
                      className="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold inline-flex items-center gap-2"
                      style={{
                        background: '#F2A93B',
                        color: '#17144F',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Syne Variable, Syne, sans-serif',
                      }}
                    >
                      <Download size={14} aria-hidden="true" />
                      Download results as CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left border-collapse text-xs font-mono" style={{ fontFamily: 'DM Mono, monospace' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(23,20,79,0.12)', color: '#5B6178' }}>
                          <th className="py-2 pr-4">Address</th>
                          <th className="py-2 pr-4">Score</th>
                          <th className="py-2 pr-4">Band</th>
                          <th className="py-2 pr-4">Sanctions</th>
                          <th className="py-2">Top reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((row, i) => {
                          if (isBatchErrorRow(row)) {
                            return (
                              <tr key={`${row.address}-${i}`} style={{ borderBottom: '1px solid rgba(23,20,79,0.06)' }}>
                                <td className="py-2.5 pr-4 break-all" style={{ color: '#17144F' }}>{row.address}</td>
                                <td className="py-2.5 pr-4" style={{ color: '#5B6178' }}>—</td>
                                <td className="py-2.5 pr-4" style={{ color: '#B8332E' }}>error</td>
                                <td className="py-2.5 pr-4" style={{ color: '#5B6178' }}>—</td>
                                <td className="py-2.5" style={{ color: '#B8332E' }} role="alert">
                                  {row.error.message || row.error.error}
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={`${row.address}-${i}`} style={{ borderBottom: '1px solid rgba(23,20,79,0.06)', color: '#17144F' }}>
                              <td className="py-2.5 pr-4 break-all">{row.address}</td>
                              <td className="py-2.5 pr-4 font-bold tabular-nums">{row.score}</td>
                              <td className="py-2.5 pr-4">{row.band}</td>
                              <td className="py-2.5 pr-4">
                                <span
                                  className="inline-block px-2 py-0.5 rounded"
                                  style={{
                                    background: row.sanctions_hit ? 'rgba(226,85,79,0.12)' : 'rgba(29,156,134,0.12)',
                                    color: row.sanctions_hit ? '#B8332E' : '#147564',
                                  }}
                                >
                                  {row.sanctions_hit ? 'hit' : 'clear'}
                                </span>
                              </td>
                              <td className="py-2.5">{row.top_reason_code}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Usage meter */}
          <div
            className="mt-8 rounded-xl p-5"
            style={{ background: 'rgba(23,20,79,0.04)', border: '1px solid rgba(23,20,79,0.08)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-sm font-bold"
                style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
              >
                API quota usage
              </h2>
              <span className="text-xs font-mono tabular-nums" style={{ color: '#17144F', fontFamily: 'DM Mono, monospace' }}>
                {checksUsed} / {quota !== null ? quota : '—'}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(23,20,79,0.1)' }}
              role="progressbar"
              aria-label="API checks used"
              aria-valuenow={checksUsed}
              aria-valuemin={0}
              aria-valuemax={quota ?? checksUsed}
            >
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${usagePct}%`,
                  background: usagePct >= 80 ? '#E2554F' : '#1D9C86',
                }}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
