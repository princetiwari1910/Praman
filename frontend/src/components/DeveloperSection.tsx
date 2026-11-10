import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const REQUEST = `GET /v1/risk/ethereum/0x742d35Cc...Fd8e9
Authorization: Bearer <api_key>
Accept: application/json`;

const RESPONSE = `{
  "address": "0x742d35Cc6634C0532925a3b8D4C9C4F3b4Fd8e9",
  "chain": "ethereum",
  "score": 73,
  "band": "HIGH",
  "sanctions_hit": false,
  "reasons": [
    {
      "code": "MIXER_CONTACT",
      "title": "Mixer interaction detected",
      "weight": 0.34,
      "detail": "Direct transfer to Tornado Cash contract 14 days ago."
    },
    {
      "code": "HIGH_VELOCITY",
      "title": "Unusual transaction velocity",
      "weight": 0.28,
      "detail": "147 transactions in 72 hours, 6x above baseline."
    }
  ],
  "graph": {
    "nodes": [{"id": "0x742d", "label": "Target", "risk": 73}],
    "edges": [{"source": "0x742d", "target": "0xTornado", "value": 2.4}]
  },
  "generated_at": "2024-11-10T05:03:07Z",
  "data_mode": "live"
}`;

function useTypewriter(text: string, speed = 18, active = false, immediate = false) {
  const [displayed, setDisplayed] = useState(immediate ? text : '');
  const idxRef = useRef(0);
  const rafRef = useRef<ReturnType<typeof setTimeout>>(0);

  useEffect(() => {
    if (!active) return;
    if (immediate) {
      setDisplayed(text);
      return;
    }
    idxRef.current = 0;
    setDisplayed('');

    function tick() {
      idxRef.current++;
      setDisplayed(text.slice(0, idxRef.current));
      if (idxRef.current < text.length) {
        rafRef.current = setTimeout(tick, speed);
      }
    }
    rafRef.current = setTimeout(tick, speed);
    return () => clearTimeout(rafRef.current);
  }, [text, speed, active, immediate]);

  return displayed;
}

function tokenize(line: string) {
  // Simple JSON syntax colouring
  return line
    .replace(/"([^"]+)":/g, '<span style="color:#1D9C86">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span style="color:#F2A93B">"$1"</span>')
    .replace(/: ([\d.]+)/g, ': <span style="color:#E2554F">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color:#E2554F">$1</span>');
}

export function DeveloperSection() {
  const [started, setStarted] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const typed = useTypewriter(RESPONSE, 12, started, reduced);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24"
      style={{ background: '#EDF0F7' }}
      aria-labelledby="dev-heading"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: copy */}
          <div>
            <span className="text-sm" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
              — developer-first
            </span>
            <h2
              id="dev-heading"
              className="text-4xl lg:text-5xl font-black mt-2 mb-6 leading-tight"
              style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
            >
              One endpoint. Full context.
            </h2>
            <p className="text-lg mb-8 leading-relaxed" style={{ color: '#5B6178' }}>
              A single GET request returns the score, the band, every reason code with its weight,
              and the wallet graph. Your team can build screening into any workflow in an afternoon.
            </p>
            <ul className="space-y-3">
              {[
                'REST + JSON — works with any stack',
                'Reason codes map to your compliance vocabulary',
                'Graph edges expose multi-hop exposure paths',
                'Webhooks available for batch screening jobs',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: '#5B6178' }}>
                  <span style={{ color: '#1D9C86', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: code block */}
          <div>
            {/* Request */}
            <div
              className="rounded-lg mb-3 p-4"
              style={{ background: '#17144F' }}
              role="region"
              aria-label="API request example"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: '#1D9C86', color: '#EDF0F7', fontFamily: 'DM Mono, monospace' }}
                >
                  GET
                </span>
                <span style={{ color: 'rgba(237,240,247,0.5)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                  /v1/risk/&#123;chain&#125;/&#123;address&#125;
                </span>
              </div>
              <pre
                className="code-block overflow-x-auto"
                style={{ color: 'rgba(237,240,247,0.8)', margin: 0 }}
              >
                <code>{REQUEST}</code>
              </pre>
            </div>

            {/* Response */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#0F0D3A' }}
              role="region"
              aria-label="API response example"
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: '#1D9C86', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
                  200 OK
                </span>
                <span style={{ color: 'rgba(237,240,247,0.4)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
                  application/json
                </span>
              </div>
              <pre
                className="code-block overflow-x-auto"
                style={{ color: 'rgba(237,240,247,0.85)', margin: 0, maxHeight: '380px', overflowY: 'auto' }}
              >
                <code
                  dangerouslySetInnerHTML={{
                    __html: typed.split('\n').map(tokenize).join('\n'),
                  }}
                />
                <span
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    background: '#F2A93B',
                    marginLeft: '1px',
                    verticalAlign: 'text-bottom',
                    animation: 'blink 1s step-end infinite',
                  }}
                  aria-hidden="true"
                />
              </pre>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
