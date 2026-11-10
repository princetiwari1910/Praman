const SIGNALS = [
  'Sanctions list match',
  'Counterparty exposure',
  'Wallet age',
  'Mixer contact',
  'Transaction velocity',
  'Chain hop detection',
  'Exchange exposure',
  'High-risk jurisdiction',
  'Known darknet interaction',
  'Peel chain pattern',
  'Layering behaviour',
  'Bridge abuse',
];

function MarqueeRow({ reverse }: { reverse?: boolean }) {
  // Duplicate for seamless loop
  const items = [...SIGNALS, ...SIGNALS];

  return (
    <div className="overflow-hidden py-2" aria-hidden="true">
      <div
        className={reverse ? 'marquee-track-right' : 'marquee-track-left'}
        style={{ display: 'flex', gap: '0', whiteSpace: 'nowrap', width: 'max-content' }}
      >
        {items.map((signal, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '24px' }}>
            <span
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '13px',
                color: 'rgba(237,240,247,0.78)',
                padding: '0 24px',
                letterSpacing: '0.03em',
              }}
            >
              {signal}
            </span>
            <span style={{ color: '#D8DCE9', fontSize: '10px' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SignalsMarquee() {
  return (
    <section
      className="py-20"
      style={{ background: '#17144F', borderTop: '1px solid rgba(237,240,247,0.08)', borderBottom: '1px solid rgba(237,240,247,0.08)' }}
      aria-label="Risk signals Praman checks"
    >
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <span className="text-sm" style={{ color: 'rgba(237,240,247,0.7)', fontFamily: 'DM Mono, monospace' }}>
          — signals we check
        </span>
        <h2
          className="text-3xl font-black mt-2"
          style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
        >
          Signals across the entire exposure graph.
        </h2>
      </div>

      <div className="relative">
        {/* Left/right fade masks */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{ width: '80px', background: 'linear-gradient(to right, #17144F, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{ width: '80px', background: 'linear-gradient(to left, #17144F, transparent)' }}
        />

        <MarqueeRow />
        <MarqueeRow reverse />
      </div>
    </section>
  );
}
