const COLUMNS = [
  {
    label: 'Enterprise tools',
    items: [
      'Designed for banks with dedicated compliance teams',
      'Months of integration work before first screening',
      'Opaque scores with no explanation layer',
      'Priced for institutions, not growing companies',
      'Requires a formal RFP and legal review to trial',
    ],
    highlight: false,
    side: 'left',
  },
  {
    label: 'Praman',
    items: [
      'Built for lean compliance and engineering teams',
      'REST API live in an afternoon',
      'Every score ships with reason codes and weights',
      'Design partner pricing that scales with your volume',
      'Self-service trial, no sales call required',
    ],
    highlight: true,
    side: 'center',
  },
  {
    label: 'DIY approach',
    items: [
      'Requires deep blockchain data expertise in-house',
      'Maintaining your own entity database is expensive',
      'No standardised reason codes for audit trails',
      'Opportunity cost: your engineers could build product instead',
      'Hard to keep pace with new mixer and bridge patterns',
    ],
    highlight: false,
    side: 'right',
  },
];

export function ComparisonSection() {
  return (
    <section
      className="py-24"
      style={{ background: '#17144F' }}
      aria-labelledby="comparison-heading"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-14">
          <span className="text-sm" style={{ color: 'rgba(237,240,247,0.7)', fontFamily: 'DM Mono, monospace' }}>
            — where we fit
          </span>
          <h2
            id="comparison-heading"
            className="text-4xl lg:text-5xl font-black mt-2 leading-tight"
            style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
          >
            Built for teams that enterprise tools overlook.
          </h2>
          <p className="mt-4 text-lg max-w-2xl" style={{ color: 'rgba(237,240,247,0.8)' }}>
            Most wallet screening tools were built for Tier-1 banks. Praman is built for the teams
            actually doing the work at crypto-native companies and fintechs.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {COLUMNS.map(col => (
            <div
              key={col.label}
              style={{
                borderLeft: col.highlight
                  ? '3px solid #F2A93B'
                  : '3px solid rgba(237,240,247,0.1)',
                background: col.highlight
                  ? 'rgba(242,169,59,0.06)'
                  : 'rgba(237,240,247,0.03)',
                borderRadius: '0 8px 8px 0',
                padding: '28px',
              }}
            >
              <div
                className="text-sm font-bold mb-6 pb-4"
                style={{
                  color: col.highlight ? '#F2A93B' : 'rgba(237,240,247,0.72)',
                  fontFamily: 'DM Mono, monospace',
                  borderBottom: col.highlight
                    ? '1px solid rgba(242,169,59,0.25)'
                    : '1px solid rgba(237,240,247,0.12)',
                  letterSpacing: '0.08em',
                }}
              >
                {col.label.toUpperCase()}
              </div>
              <ul className="space-y-4">
                {col.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span
                      style={{
                        color: col.highlight ? '#1D9C86' : 'rgba(237,240,247,0.55)',
                        marginTop: '3px',
                        fontSize: '10px',
                        flexShrink: 0,
                      }}
                    >
                      {col.highlight ? '✓' : '·'}
                    </span>
                    <span style={{ color: col.highlight ? '#EDF0F7' : 'rgba(237,240,247,0.78)' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
