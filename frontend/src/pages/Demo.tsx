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
} from 'lucide-react';
import { cleanWallet, defaultWallet } from '@/fixtures/cleanWallet';
import { highRiskWallet } from '@/fixtures/highRiskWallet';
import type {
  RiskResult,
  UsageResponse,
  ReportCreateResponse,
  BatchRowResult,
  AuditVerifyResponse,
  ApiErrorResponse,
} from '@/types/api';
import { BRAND } from '@/constants/brand';
import { Footer } from '@/components/Footer';
import { DemoGraph } from '@/components/DemoGraph';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
const API_V1_BASE = RAW_API_BASE
  ? `${RAW_API_BASE.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
  : '';
const API_KEY = (import.meta.env.VITE_API_KEY as string | undefined)?.trim() ?? '';

const CHAIN = 'ethereum' as const;
const QUOTA = 100;
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const CLEAN_TEST_ADDRESS = '0x1111111111111111111111111111111111111111';
const HIGH_RISK_TEST_ADDRESS = '0x2222222222222222222222222222222222222222';
const SAMPLE_CSV = `address\n${CLEAN_TEST_ADDRESS}\n${HIGH_RISK_TEST_ADDRESS}\n0x3333333333333333333333333333333333333333\n`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 70) return '#E2554F';
  if (score >= 30) return '#F2A93B';
  return '#1D9C86';
}

function bandLabel(band: string): string {
  const key = band.toLowerCase();
  return { low: 'Low', medium: 'Medium', high: 'High', severe: 'Severe' }[key] ?? band;
}

function bandToInt(band: string): number {
  const key = band.toLowerCase();
  if (key === 'severe') return 4;
  if (key === 'high') return 3;
  if (key === 'medium') return 2;
  return 1;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Partial<ApiErrorResponse>;
    if (body.message) {
      return body.error ? `${body.error}: ${body.message}` : body.message;
    }
  } catch {
    // Non-JSON response
  }
  return `Request failed with status ${res.status}`;
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
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`Risk score ${score} out of 100`}>
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
    <div>
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
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);

  // Usage
  const [checksUsed, setChecksUsed] = useState<number>(0);

  // Report & Attestation
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSha256, setReportSha256] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Feedback
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Batch CSV
  const [batchResults, setBatchResults] = useState<BatchRowResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  // Audit verify
  const [auditResult, setAuditResult] = useState<AuditVerifyResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!API_V1_BASE) return;
    try {
      const res = await fetch(`${API_V1_BASE}/usage`, {
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
    } catch {
      // Backend unreachable; retain local counter
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  async function handleScreen(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();

    if (!ETH_ADDRESS_RE.test(trimmed)) {
      setValidationError('Enter a valid Ethereum address (0x followed by 40 hex characters).');
      return;
    }

    setValidationError(null);
    setLoading(true);
    setError(null);
    setNetworkNotice(null);
    setReportError(null);
    setReportSha256(null);
    setFeedbackSent(null);
    setFeedbackError(null);
    setResult(null);

    if (API_V1_BASE) {
      try {
        const res = await fetch(`${API_V1_BASE}/risk/${CHAIN}/${trimmed}`, {
          headers: {
            Accept: 'application/json',
            'X-API-Key': API_KEY,
          },
        });

        if (!res.ok) {
          const msg = await parseErrorMessage(res);
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
        setResult(data);
        setLoading(false);
        fetchUsage();
        return;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Network failure';
        setNetworkNotice(`Backend unreachable (${reason}) — falling back to local fixture data.`);
      }
    } else {
      setNetworkNotice('API base URL is not configured — showing local fixture data.');
    }

    const fixture = fixtureForAddress(trimmed);
    setChecksUsed(prev => Math.min(QUOTA, prev + 1));
    setResult(fixture);
    setLoading(false);
  }

  async function handleDownloadReport() {
    if (!result) return;
    if (!API_V1_BASE) {
      setReportError('Backend API URL is not configured.');
      setReportSha256(null);
      return;
    }

    setDownloadingReport(true);
    setReportError(null);
    setReportSha256(null);

    try {
      const createRes = await fetch(`${API_V1_BASE}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ address: result.address, chain: CHAIN }),
      });

      if (!createRes.ok) {
        setReportError(await parseErrorMessage(createRes));
        setReportSha256(null);
        setDownloadingReport(false);
        return;
      }

      const { report_id, sha256 } = (await createRes.json()) as ReportCreateResponse;
      const cleanId = report_id.replace(/^reports\//, '').replace(/\/pdf$/, '').replace(/\.pdf$/, '');

      const pdfRes = await fetch(`${API_V1_BASE}/reports/${cleanId}.pdf`, {
        headers: { 'X-API-Key': API_KEY },
      });

      if (!pdfRes.ok) {
        setReportError(await parseErrorMessage(pdfRes));
        setReportSha256(null);
        setDownloadingReport(false);
        return;
      }

      const apiSha256 = pdfRes.headers.get('X-Report-SHA256') ?? sha256 ?? null;
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
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setReportError(`Could not reach backend to generate PDF report (${reason}).`);
      setReportSha256(null);
    } finally {
      setDownloadingReport(false);
    }
  }

  async function handleFeedback(verdict: 'true_positive' | 'false_positive' | 'unsure') {
    if (!result) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);

    if (!API_V1_BASE) {
      setFeedbackSent(verdict);
      setSubmittingFeedback(false);
      return;
    }

    try {
      const res = await fetch(`${API_V1_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ address: result.address, verdict }),
      });

      if (!res.ok) {
        setFeedbackError(await parseErrorMessage(res));
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

    if (API_V1_BASE) {
      try {
        const formData = new FormData();
        const csvFile = file ?? new File([csvText], 'wallets.csv', { type: 'text/csv' });
        formData.append('file', csvFile);

        const res = await fetch(`${API_V1_BASE}/batch`, {
          method: 'POST',
          headers: {
            'X-API-Key': API_KEY,
            Accept: 'application/json',
          },
          body: formData,
        });

        if (res.ok) {
          const payload = (await res.json()) as { results?: BatchRowResult[] } | BatchRowResult[];
          const rows = Array.isArray(payload) ? payload : payload.results ?? [];
          setBatchResults(rows);
          setBatchLoading(false);
          fetchUsage();
          return;
        }

        // Backend responded with an HTTP error (400/401/404/422/429) — display error and do NOT fall back to fixtures
        setBatchResults([]);
        setBatchError(await parseErrorMessage(res));
        setBatchLoading(false);
        return;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Network failure';
        setBatchNotice(`Demo data · Backend unreachable (${reason}) — showing local fixture batch results.`);
      }
    } else {
      setBatchNotice('Demo data · API base URL is not configured — showing local fixture batch results.');
    }

    const fallbackRows: BatchRowResult[] = addresses.map(addr => {
      if (!ETH_ADDRESS_RE.test(addr)) {
        return {
          address: addr,
          chain: CHAIN,
          score: null,
          band: 'error',
          sanctions_hit: false,
          top_reason: 'invalid_address',
          data_mode: 'fixture',
          error: 'Invalid address format',
        };
      }
      const res = fixtureForAddress(addr);
      return {
        address: res.address,
        chain: res.chain,
        score: res.score,
        band: res.band,
        sanctions_hit: res.sanctions_hit,
        top_reason: res.reasons[0]?.code ?? 'NONE',
        data_mode: 'fixture',
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
    const header = ['address', 'chain', 'score', 'band', 'sanctions_hit', 'top_reason', 'data_mode', 'error'];
    const lines = [
      header.join(','),
      ...batchResults.map(r =>
        [
          csvCell(r.address),
          csvCell(r.chain),
          r.score !== null ? String(r.score) : '',
          csvCell(r.band),
          String(r.sanctions_hit),
          csvCell(r.top_reason),
          csvCell(r.data_mode),
          csvCell(r.error ?? ''),
        ].join(',')
      ),
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
    if (!API_V1_BASE) {
      setAuditError('Backend API URL is not configured.');
      return;
    }

    setAuditLoading(true);
    setAuditError(null);

    try {
      const res = await fetch(`${API_V1_BASE}/audit/verify`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!res.ok) {
        setAuditError(await parseErrorMessage(res));
        setAuditLoading(false);
        return;
      }

      const data = (await res.json()) as { valid?: boolean; entry_count?: number; entries?: number; count?: number };
      setAuditResult({
        valid: Boolean(data.valid),
        entry_count: data.entry_count ?? data.count ?? data.entries ?? 0,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network failure';
      setAuditError(`Could not reach audit endpoint (${reason}).`);
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleCopyHash() {
    if (!reportSha256) return;
    try {
      await navigator.clipboard.writeText(`0x${reportSha256}`);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  function loadTestAddress(addr: string) {
    setAddress(addr);
    setValidationError(null);
    setError(null);
  }

  const usagePct = Math.min(100, Math.round((checksUsed / QUOTA) * 100));
  const batchHasFixture = batchResults.some(r => r.data_mode === 'fixture');

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

            {/* Verify audit log control */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <button
                type="button"
                onClick={handleVerifyAudit}
                disabled={auditLoading}
                className="px-3.5 py-2 rounded-lg text-xs font-mono border inline-flex items-center gap-2 transition-colors duration-150"
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
                  {auditResult.valid ? 'Valid' : 'Invalid'} · {auditResult.entry_count} entries
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
              type="button"
              role="tab"
              aria-selected={activeTab === 'single'}
              onClick={() => setActiveTab('single')}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
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
              type="button"
              role="tab"
              aria-selected={activeTab === 'batch'}
              onClick={() => setActiveTab('batch')}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
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
            <div role="tabpanel" aria-label="Wallet check">
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => loadTestAddress(CLEAN_TEST_ADDRESS)}
                  className="text-xs px-3 py-1.5 rounded border transition-colors duration-150"
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
                  className="text-xs px-3 py-1.5 rounded border transition-colors duration-150"
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
                    className="rounded-lg px-4 py-3 text-sm border flex items-center"
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
                    className="flex-1 rounded-lg px-4 py-3 text-sm border"
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
                    className="px-8 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors duration-150"
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

              {networkNotice && (
                <div
                  className="mb-6 p-3 rounded-lg text-xs font-mono"
                  style={{
                    background: 'rgba(242,169,59,0.16)',
                    border: '1px solid rgba(242,169,59,0.45)',
                    color: '#8C5808',
                    fontFamily: 'DM Mono, monospace',
                  }}
                  role="status"
                >
                  Demo data · {networkNotice}
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
                      className="rounded-xl p-6 flex flex-col items-center justify-between"
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
                          className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150"
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
                      className="rounded-xl p-6"
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
                      className="rounded-xl p-6"
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

                  {/* Feedback + Attestation panels */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Feedback */}
                    <div
                      className="rounded-xl p-6"
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
                              className="px-3.5 py-2 rounded-lg text-xs font-mono border transition-colors duration-150"
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
                    </div>

                    {/* Attestation panel */}
                    <div
                      className="rounded-xl p-6"
                      style={{ background: '#17144F', color: '#EDF0F7' }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h2
                          className="text-base font-bold"
                          style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                        >
                          On-chain attestation
                        </h2>
                        <span
                          className="px-2.5 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: 'rgba(242,169,59,0.2)',
                            color: '#F2A93B',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          Testnet demo
                        </span>
                      </div>

                      {reportSha256 ? (
                        <div className="mb-4">
                          <div className="text-xs mb-1" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
                            Report SHA-256 (from API)
                          </div>
                          <div className="flex items-center gap-2">
                            <code
                              className="flex-1 text-xs p-2 rounded break-all"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#F2A93B', fontFamily: 'DM Mono, monospace' }}
                            >
                              0x{reportSha256}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyHash}
                              className="p-2 rounded border shrink-0"
                              style={{
                                borderColor: 'rgba(237,240,247,0.25)',
                                background: 'transparent',
                                color: '#EDF0F7',
                                cursor: 'pointer',
                              }}
                              aria-label="Copy report SHA-256 hash"
                            >
                              {copiedHash ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs mb-4" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
                          Download the PDF report to retrieve the API-issued SHA-256 hash.
                        </p>
                      )}

                      <div className="text-xs mb-1.5" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
                        Local Hardhat attestation commands (contracts/)
                      </div>
                      <pre
                        className="text-xs p-3 rounded overflow-x-auto leading-relaxed"
                        style={{ background: '#0F0D3A', color: 'rgba(237,240,247,0.88)', fontFamily: 'DM Mono, monospace', margin: 0 }}
                      >
                        <code>{`cd contracts
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/attest.js --network localhost ${reportSha256 ? `0x${reportSha256}` : '<hex_report_SHA_256>'} ${bandToInt(result.band)}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BATCH CSV TAB ──────────────────────────────────────────────── */}
          {activeTab === 'batch' && (
            <div role="tabpanel" aria-label="Batch CSV screening" className="space-y-6">
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
                      className="px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
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
                      className="px-4 py-2 rounded-lg text-xs font-mono border"
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
                          batchHasFixture
                            ? { background: 'rgba(242,169,59,0.18)', color: '#8C5808', fontFamily: 'DM Mono, monospace' }
                            : { background: 'rgba(29,156,134,0.12)', color: '#147564', fontFamily: 'DM Mono, monospace' }
                        }
                      >
                        {batchHasFixture ? 'Demo data' : 'Live data'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={downloadBatchCsv}
                      className="px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2"
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

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono" style={{ fontFamily: 'DM Mono, monospace' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(23,20,79,0.12)', color: '#5B6178' }}>
                          <th className="py-2 pr-4">Address</th>
                          <th className="py-2 pr-4">Score</th>
                          <th className="py-2 pr-4">Band</th>
                          <th className="py-2 pr-4">Sanctions</th>
                          <th className="py-2 pr-4">Top reason</th>
                          <th className="py-2">Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((row, i) => (
                          <tr key={`${row.address}-${i}`} style={{ borderBottom: '1px solid rgba(23,20,79,0.06)', color: '#17144F' }}>
                            <td className="py-2.5 pr-4 break-all">{row.address}</td>
                            <td className="py-2.5 pr-4 font-bold tabular-nums">{row.score ?? '—'}</td>
                            <td className="py-2.5 pr-4">{row.band}</td>
                            <td className="py-2.5 pr-4">{String(row.sanctions_hit)}</td>
                            <td className="py-2.5 pr-4">{row.error ?? row.top_reason}</td>
                            <td className="py-2.5">{row.data_mode === 'fixture' ? 'Demo data' : 'Live data'}</td>
                          </tr>
                        ))}
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
                {checksUsed} / {QUOTA}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(23,20,79,0.1)' }}
              role="progressbar"
              aria-label="API checks used"
              aria-valuenow={checksUsed}
              aria-valuemin={0}
              aria-valuemax={QUOTA}
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
