import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '@/constants/brand';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── Types ─────────────────────────────────────────────────────────────────────
interface HeroNode {
  id: string;
  x: number;
  y: number;
  risk: number;
  label: string;
}

interface HeroEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
}

const CHIPS = [
  { code: 'MIXER_CONTACT', label: 'Mixer contact', color: '#E2554F' },
  { code: 'HIGH_VELOCITY', label: 'High velocity', color: '#F2A93B' },
  { code: 'SANCTIONS_NEAR', label: 'Sanctions near-hit', color: '#E2554F' },
  { code: 'COUNTERPARTY', label: 'Counterparty risk', color: '#F2A93B' },
];

function getRiskColor(risk: number): string {
  if (risk >= 70) return '#E2554F';
  if (risk >= 30) return '#F2A93B';
  return '#1D9C86';
}

// ── Proof Seal ────────────────────────────────────────────────────────────────
function ProofSeal({ visible, reduced }: { visible: boolean; reduced: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        opacity: visible ? 1 : 0,
        animation: visible && !reduced ? 'stamp-in 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
      }}
      className="absolute -top-4 right-0 sm:-top-6 sm:-right-6 w-20 h-20 sm:w-24 sm:h-24 select-none pointer-events-none"
    >
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="48" r="44" stroke="#F2A93B" strokeWidth="3" fill="rgba(242,169,59,0.08)" />
        <circle cx="48" cy="48" r="37" stroke="#F2A93B" strokeWidth="1.5" strokeDasharray="3 3" />
        <path
          d="M32 48l10 10 20-20"
          stroke="#F2A93B"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          id="seal-text-path"
          d="M 48,48 m -32,0 a 32,32 0 1,1 64,0 a 32,32 0 1,1 -64,0"
          fill="none"
        />
        <text fontFamily="DM Mono, monospace" fontSize="8" fill="#F2A93B" letterSpacing="3">
          <textPath href="#seal-text-path" startOffset="5%">
            PRAMAN · PROOF · REASONS ·
          </textPath>
        </text>
      </svg>
    </div>
  );
}

// ── Risk Gauge ────────────────────────────────────────────────────────────────
function RiskGauge({ score, visible, reduced }: { score: number; visible: boolean; reduced: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      setDisplayed(score);
      return;
    }
    const start = performance.now();
    const duration = 1800;
    const target = score;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, score, reduced]);

  const radius = 70;
  const cx = 90;
  const cy = 90;
  const circumference = Math.PI * radius;
  const fraction = displayed / 100;
  const offset = circumference * (1 - fraction);
  const color = getRiskColor(displayed);

  const angle = Math.PI * fraction - Math.PI;
  const needleX = cx + radius * Math.cos(angle);
  const needleY = cy + radius * Math.sin(angle);

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`Risk score: ${displayed} out of 100`}>
      <svg width="180" height="100" viewBox="0 0 180 100" aria-hidden="true">
        {/* Track */}
        <path
          d={`M 20 90 A 70 70 0 0 1 160 90`}
          fill="none"
          stroke="rgba(23,20,79,0.12)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill arc */}
        <path
          d={`M 20 90 A 70 70 0 0 1 160 90`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke 0.3s ease' }}
        />
        {/* Needle */}
        {visible && (
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
        {/* Zone labels */}
        <text x="20" y="85" fontSize="8" fill="#1D9C86" fontFamily="DM Mono, monospace">0</text>
        <text x="88" y="22" fontSize="8" fill="#F2A93B" fontFamily="DM Mono, monospace" textAnchor="middle">50</text>
        <text x="158" y="85" fontSize="8" fill="#E2554F" fontFamily="DM Mono, monospace" textAnchor="end">100</text>
      </svg>
      <div
        className="tabular-nums font-display text-5xl font-black leading-none"
        style={{ color, fontFamily: 'Syne Variable, Syne, sans-serif' }}
      >
        {displayed}
      </div>
      <div className="text-xs font-mono tracking-widest uppercase" style={{ color: 'rgba(237,240,247,0.72)', fontFamily: 'DM Mono, monospace' }}>
        Illustration · sample risk score
      </div>
    </div>
  );
}

// ── Main Hero ─────────────────────────────────────────────────────────────────
export function Hero() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  // Animation state
  const [nodesVisible, setNodesVisible] = useState(false);
  const [edgesVisible, setEdgesVisible] = useState(false);
  const [gaugeVisible, setGaugeVisible] = useState(false);
  const [chipsVisible, setChipsVisible] = useState<boolean[]>([false, false, false, false]);
  const [sealVisible, setSealVisible] = useState(false);

  // Magnetic CTA
  const ctaRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced) return;
    const btn = ctaRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  }, [reduced]);

  const handleMouseLeave = useCallback(() => {
    if (!ctaRef.current) return;
    ctaRef.current.style.transform = 'translate(0px, 0px)';
  }, []);

  // Orchestrated sequence
  useEffect(() => {
    if (reduced) {
      setNodesVisible(true);
      setEdgesVisible(true);
      setGaugeVisible(true);
      setChipsVisible([true, true, true, true]);
      setSealVisible(true);
      return;
    }

    const t1 = setTimeout(() => setNodesVisible(true), 300);
    const t2 = setTimeout(() => setEdgesVisible(true), 900);
    const t3 = setTimeout(() => setGaugeVisible(true), 1400);
    const t4 = setTimeout(() => setChipsVisible([true, false, false, false]), 2000);
    const t5 = setTimeout(() => setChipsVisible([true, true, false, false]), 2300);
    const t6 = setTimeout(() => setChipsVisible([true, true, true, false]), 2600);
    const t7 = setTimeout(() => setChipsVisible([true, true, true, true]), 2900);
    const t8 = setTimeout(() => setSealVisible(true), 3400);

    return () => [t1, t2, t3, t4, t5, t6, t7, t8].forEach(clearTimeout);
  }, [reduced]);

  // Graph nodes (static layout)
  const nodes: HeroNode[] = [
    { id: 'target', x: 180, y: 120, risk: 73, label: 'Target' },
    { id: 'exchange', x: 60, y: 60, risk: 8, label: 'Exchange' },
    { id: 'mixer', x: 300, y: 60, risk: 92, label: 'Mixer' },
    { id: 'unknown1', x: 310, y: 170, risk: 65, label: 'Unknown' },
    { id: 'bridge', x: 50, y: 180, risk: 32, label: 'Bridge' },
    { id: 'darknet', x: 220, y: 220, risk: 95, label: 'Darknet' },
    { id: 'cex', x: 100, y: 220, risk: 10, label: 'CEX' },
  ];

  const edges: HeroEdge[] = [
    { x1: 60, y1: 60, x2: 180, y2: 120, length: Math.hypot(120, 60) },
    { x1: 300, y1: 60, x2: 180, y2: 120, length: Math.hypot(120, 60) },
    { x1: 180, y1: 120, x2: 310, y2: 170, length: Math.hypot(130, 50) },
    { x1: 180, y1: 120, x2: 220, y2: 220, length: Math.hypot(40, 100) },
    { x1: 50, y1: 180, x2: 180, y2: 120, length: Math.hypot(130, 60) },
    { x1: 100, y1: 220, x2: 180, y2: 120, length: Math.hypot(80, 100) },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#17144F' }}>
      {/* Background grid dots — parallax layer 1 */}
      <div
        className="absolute inset-0 pointer-events-none"
        id="hero-bg-grid"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(237,240,247,0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Floating blob — parallax layer 2 */}
      <div
        id="hero-bg-blob"
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,156,134,0.08) 0%, transparent 70%)',
          top: '-100px',
          right: '-100px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 lg:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <span
              className="inline-block text-sm mb-6"
              style={{ color: '#1D9C86', fontFamily: 'DM Mono, monospace' }}
            >
              — risk intelligence
            </span>
            <h1
              className="text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] mb-6"
              style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
            >
              Every risk score comes with proof.
            </h1>
            <p className="text-lg mb-10 max-w-lg leading-relaxed" style={{ color: 'rgba(237,240,247,0.7)' }}>
              {BRAND.name} screens crypto wallets and returns a score with the evidence behind it —
              built for compliance teams that need answers, not just numbers.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                ref={ctaRef}
                onClick={() => navigate('/demo')}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="px-8 py-4 rounded-lg font-semibold text-base transition-colors duration-150"
                style={{
                  background: '#F2A93B',
                  color: '#17144F',
                  fontFamily: 'Syne Variable, Syne, sans-serif',
                  transition: 'background 0.15s ease, transform 0.15s ease',
                  willChange: 'transform',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f0b34e'; }}
              >
                {BRAND.demoCtaLabel}
              </button>
              <a
                href={`mailto:${BRAND.partnerEmail}`}
                className="px-8 py-4 rounded-lg font-semibold text-base border transition-colors duration-150"
                style={{
                  borderColor: 'rgba(237,240,247,0.3)',
                  color: '#EDF0F7',
                  fontFamily: 'Syne Variable, Syne, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(237,240,247,0.3)'; }}
              >
                {BRAND.partnerCtaLabel}
              </a>
            </div>

            {/* Reason chips */}
            <div className="flex flex-wrap gap-2 mt-10" role="list" aria-label="Risk signals detected">
              {CHIPS.map((chip, i) => (
                <div
                  key={chip.code}
                  role="listitem"
                  style={{
                    opacity: chipsVisible[i] ? 1 : 0,
                    animation: chipsVisible[i] && !reduced ? 'chip-stamp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${chip.color}`,
                    color: chip.color,
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    padding: '4px 10px',
                    borderRadius: '4px',
                  }}
                >
                  {chip.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: graph + gauge + seal */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Wallet graph */}
            <div
              className="relative w-full max-w-[360px]"
              role="img"
              aria-label="Wallet transaction graph showing risk connections"
            >
              <svg
                width="360"
                height="260"
                viewBox="0 0 360 260"
                aria-hidden="true"
                className="w-full h-auto overflow-visible"
              >
                {/* Edges */}
                {edges.map((edge, i) => (
                  <line
                    key={i}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke="rgba(237,240,247,0.2)"
                    strokeWidth="1.5"
                    strokeDasharray={edge.length}
                    strokeDashoffset={edgesVisible ? 0 : edge.length}
                    style={{
                      transition: reduced ? 'opacity 0.3s' : `stroke-dashoffset 0.6s ease ${i * 0.1}s`,
                      opacity: edgesVisible ? 1 : 0,
                    }}
                  />
                ))}

                {/* Nodes */}
                {nodes.map((node, i) => (
                  <g key={node.id}>
                    {/* Outer ring */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="22"
                      fill={`${getRiskColor(node.risk)}18`}
                      stroke={getRiskColor(node.risk)}
                      strokeWidth="1.5"
                      style={{
                        opacity: nodesVisible ? 1 : 0,
                        transform: `scale(${nodesVisible ? 1 : 0.4})`,
                        transformOrigin: `${node.x}px ${node.y}px`,
                        transition: reduced
                          ? 'opacity 0.3s'
                          : `opacity 0.4s ease ${i * 0.08}s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s`,
                      }}
                    />
                    {/* Inner dot */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="8"
                      fill={getRiskColor(node.risk)}
                      style={{
                        opacity: nodesVisible ? 1 : 0,
                        transition: reduced ? 'opacity 0.3s' : `opacity 0.3s ease ${i * 0.08 + 0.1}s`,
                      }}
                    />
                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y + 36}
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(237,240,247,0.6)"
                      fontFamily="DM Mono, monospace"
                      style={{
                        opacity: nodesVisible ? 1 : 0,
                        transition: reduced ? 'opacity 0.3s' : `opacity 0.4s ease ${i * 0.08 + 0.2}s`,
                      }}
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Proof seal */}
              <ProofSeal visible={sealVisible} reduced={reduced} />
            </div>

            {/* Risk gauge */}
            <RiskGauge score={73} visible={gaugeVisible} reduced={reduced} />
          </div>
        </div>
      </div>
    </section>
  );
}
