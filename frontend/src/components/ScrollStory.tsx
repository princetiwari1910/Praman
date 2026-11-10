import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  {
    id: 'collect',
    step: '01',
    title: 'Collect signals',
    body: 'Praman pulls on-chain data: transaction history, counterparty exposure, mixer contacts, exchange labels, and jurisdiction flags.',
  },
  {
    id: 'score',
    step: '02',
    title: 'Score the wallet',
    body: "A weighted model combines signals into a single 0–100 risk score. Each signal's contribution is recorded so the score is never a black box.",
  },
  {
    id: 'explain',
    step: '03',
    title: 'Explain with proof',
    body: 'Every score ships with reason codes, weights, and plain-language detail — ready for analyst review without extra research.',
  },
  {
    id: 'attest',
    step: '04',
    title: 'Attest on-chain',
    body: 'Case summaries can be anchored to an immutable attestation layer, giving your audit trail a verifiable timestamp.',
  },
];

export function ScrollStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isDesktop || reduced) {
      setActiveStage(3);
      return;
    }

    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=240%',
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          onUpdate: self => {
            const idx = Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length));
            setActiveStage(idx);
          },
        },
      });

      STAGES.forEach((_, i) => {
        const el = stageRefs.current[i];
        if (!el) return;
        if (i === 0) {
          tl.set(el, { opacity: 1, x: 0 }, 0);
        } else {
          tl.to(el, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, i);
        }
        if (i < STAGES.length - 1) {
          tl.to(el, { opacity: 0.35, duration: 0.4 }, i + 0.7);
        }
      });
    });

    return () => mm.revert();
  }, [isDesktop, reduced]);

  const showStaticAll = !isDesktop || reduced;

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-0"
      style={{ background: '#EDF0F7' }}
      aria-label="How Praman works"
    >
      <div className="md:min-h-screen flex items-center max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 w-full items-center">
          {/* Stages list */}
          <div className="space-y-8">
            <div className="mb-6">
              <span className="text-sm" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
                — how it works
              </span>
              <h2
                className="text-4xl lg:text-5xl font-black mt-2 leading-tight"
                style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
              >
                Four steps, one audit-ready result.
              </h2>
            </div>

            {STAGES.map((stage, i) => {
              const initialOpacity = showStaticAll ? 1 : i === 0 ? 1 : 0.35;
              const initialTransform = showStaticAll ? 'translateX(0)' : i === 0 ? 'translateX(0)' : 'translateX(12px)';
              return (
                <div
                  key={stage.id}
                  ref={el => { stageRefs.current[i] = el; }}
                  className="flex gap-5 items-start"
                  style={{ opacity: initialOpacity, transform: initialTransform }}
                >
                  <div
                    className="shrink-0 w-10 h-10 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      background: activeStage === i || showStaticAll ? '#17144F' : 'rgba(23,20,79,0.2)',
                      color: '#F2A93B',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {stage.step}
                  </div>
                  <div>
                    <h3
                      className="text-xl font-bold mb-1"
                      style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
                    >
                      {stage.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#5B6178' }}>
                      {stage.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graph that transforms across the 4 stages */}
          <div
            className="flex flex-col items-center justify-center"
            role="img"
            aria-label={`Wallet risk graph at stage ${STAGES[activeStage]?.title ?? 'overview'}`}
          >
            <svg
              width="340"
              height="300"
              viewBox="0 0 340 300"
              aria-hidden="true"
              className="max-w-full h-auto"
            >
              {/* Edges */}
              {[
                [60, 60, 170, 150], [280, 60, 170, 150],
                [170, 150, 290, 180], [170, 150, 170, 260],
                [60, 220, 170, 150],
              ].map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={activeStage >= 1 ? 'rgba(23,20,79,0.22)' : 'rgba(23,20,79,0.12)'}
                  strokeWidth={activeStage >= 1 ? '2' : '1.5'}
                  strokeDasharray={activeStage === 0 ? '4 4' : 'none'}
                />
              ))}

              {/* Nodes */}
              {[
                { cx: 170, cy: 150, risk: 73, label: 'Target' },
                { cx: 60, cy: 60, risk: 8, label: 'CEX' },
                { cx: 280, cy: 60, risk: 92, label: 'Mixer' },
                { cx: 290, cy: 180, risk: 55, label: 'Unknown' },
                { cx: 170, cy: 260, risk: 88, label: 'Darknet' },
                { cx: 60, cy: 220, risk: 15, label: 'Exchange' },
              ].map((node, i) => {
                const color = activeStage === 0
                  ? '#5B6178'
                  : node.risk >= 70 ? '#E2554F' : node.risk >= 30 ? '#F2A93B' : '#1D9C86';
                return (
                  <g key={i}>
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.label === 'Target' ? 24 : 20}
                      fill={`${color}18`}
                      stroke={color}
                      strokeWidth="1.5"
                    />
                    <circle cx={node.cx} cy={node.cy} r="8" fill={color} />
                    <text
                      x={node.cx}
                      y={node.cy + 34}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#5B6178"
                      fontFamily="DM Mono, monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* Stage 2+: Score badge on center target */}
              {activeStage >= 1 && (
                <g>
                  <rect x="148" y="106" width="44" height="18" rx="4" fill="#17144F" />
                  <text x="170" y="118" textAnchor="middle" fontSize="10" fill="#F2A93B" fontFamily="DM Mono, monospace" fontWeight="bold">
                    73 / 100
                  </text>
                </g>
              )}

              {/* Stage 3+: Reason proof tags */}
              {activeStage >= 2 && (
                <g>
                  <rect x="228" y="18" width="96" height="18" rx="4" fill="#E2554F" />
                  <text x="276" y="30" textAnchor="middle" fontSize="8" fill="#EDF0F7" fontFamily="DM Mono, monospace">
                    MIXER_CONTACT
                  </text>
                  <rect x="122" y="206" width="96" height="18" rx="4" fill="#E2554F" />
                  <text x="170" y="218" textAnchor="middle" fontSize="8" fill="#EDF0F7" fontFamily="DM Mono, monospace">
                    HIGH_VELOCITY
                  </text>
                </g>
              )}

              {/* Stage 4: Attestation ring + check */}
              {activeStage >= 3 && (
                <g>
                  <circle
                    cx={170}
                    cy={150}
                    r={32}
                    fill="none"
                    stroke="#F2A93B"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <circle cx={196} cy={126} r="10" fill="#F2A93B" />
                  <path
                    d="M191 126l3 3 6-6"
                    fill="none"
                    stroke="#17144F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
            </svg>
            <div
              className="mt-3 text-xs"
              style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}
            >
              stage {STAGES[activeStage]?.step} · {STAGES[activeStage]?.title.toLowerCase()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
