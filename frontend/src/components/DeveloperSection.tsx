import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Lang = 'curl' | 'python' | 'javascript';

const SNIPPETS: Record<Lang, { label: string; code: string }> = {
  curl: {
    label: 'curl',
    code: `curl -s -H "X-API-Key: YOUR_API_KEY" \\
  http://127.0.0.1:8000/v1/risk/ethereum/0x2222222222222222222222222222222222222222`,
  },
  python: {
    label: 'Python (requests)',
    code: `import requests

resp = requests.get(
    "http://127.0.0.1:8000/v1/risk/ethereum/0x2222222222222222222222222222222222222222",
    headers={"X-API-Key": "YOUR_API_KEY"},
)
print(resp.json())`,
  },
  javascript: {
    label: 'JavaScript (fetch)',
    code: `const res = await fetch(
  "http://127.0.0.1:8000/v1/risk/ethereum/0x2222222222222222222222222222222222222222",
  { headers: { "X-API-Key": "YOUR_API_KEY" } }
);
const data = await res.json();`,
  },
};

const RESPONSE = `{
  "address": "0x2222222222222222222222222222222222222222",
  "chain": "ethereum",
  "score": 87,
  "band": "severe",
  "sanctions_hit": true,
  "reasons": [
    {
      "code": "SANCTIONS_MATCH",
      "title": "Sanctions Match",
      "weight": 60,
      "detail": "Address found on sanctions list"
    },
    {
      "code": "MIXER_EXPOSURE",
      "title": "Mixer Exposure",
      "weight": 27,
      "detail": "Mixer share: 35%"
    }
  ],
  "graph": {
    "nodes": [{"id": "addr_2", "label": "0x2222...2222", "risk": "high"}],
    "edges": [{"source": "addr_2", "target": "addr_3", "value": 10.0}]
  },
  "generated_at": "2026-11-11T11:45:00+00:00",
  "data_mode": "fixture"
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
  return line
    .replace(/"([^"]+)":/g, '<span style="color:#1D9C86">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span style="color:#F2A93B">"$1"</span>')
    .replace(/: ([\d.]+)/g, ': <span style="color:#E2554F">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color:#E2554F">$1</span>');
}

export function DeveloperSection() {
  const [started, setStarted] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [copiedLang, setCopiedLang] = useState<Lang | null>(null);
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const typed = useTypewriter(RESPONSE, 12, started, reduced);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  async function copySnippet(lang: Lang) {
    try {
      await navigator.clipboard.writeText(SNIPPETS[lang].code);
      setCopiedLang(lang);
      setTimeout(() => setCopiedLang(null), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

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
          <div className="min-w-0">
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
              and the wallet graph. Your team can build screening into any workflow cleanly.
            </p>
            <ul className="space-y-3">
              {[
                'REST + JSON — works with any stack',
                'Reason codes map to your compliance vocabulary',
                'Graph edges expose counterparty paths',
                'Batch CSV, verification, and analyst review endpoints included',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: '#5B6178' }}>
                  <span style={{ color: '#1D9C86', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: code block */}
          <div className="min-w-0">
            {/* Request with curl / Python / JS copy buttons */}
            <div
              className="rounded-lg mb-3 p-4"
              style={{ background: '#17144F' }}
              role="region"
              aria-label="API request examples"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: '#1D9C86', color: '#EDF0F7', fontFamily: 'DM Mono, monospace' }}
                  >
                    GET
                  </span>
                  <span style={{ color: 'rgba(237,240,247,0.75)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                    /v1/risk/ethereum/&#123;address&#125;
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Request language">
                  {(['curl', 'python', 'javascript'] as const).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLang(lang)}
                      className="px-2.5 py-1 min-h-[36px] rounded text-xs font-mono transition-colors duration-150"
                      style={{
                        background: activeLang === lang ? '#F2A93B' : 'rgba(237,240,247,0.1)',
                        color: activeLang === lang ? '#17144F' : '#EDF0F7',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {lang === 'javascript' ? 'JS' : lang === 'python' ? 'Python' : 'curl'}
                    </button>
                  ))}
                </div>
              </div>

              <pre
                className="code-block overflow-x-auto mb-3"
                style={{ color: 'rgba(237,240,247,0.88)', margin: 0 }}
              >
                <code>{SNIPPETS[activeLang].code}</code>
              </pre>

              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid rgba(237,240,247,0.12)' }}>
                {(['curl', 'python', 'javascript'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => copySnippet(lang)}
                    className="px-3 py-2 min-h-[44px] rounded text-xs font-mono inline-flex items-center gap-1.5 border transition-colors duration-150"
                    style={{
                      borderColor: 'rgba(237,240,247,0.25)',
                      background: copiedLang === lang ? 'rgba(29,156,134,0.2)' : 'transparent',
                      color: '#EDF0F7',
                      cursor: 'pointer',
                      fontFamily: 'DM Mono, monospace',
                    }}
                    aria-label={`Copy ${SNIPPETS[lang].label} snippet`}
                  >
                    {copiedLang === lang ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    <span>{copiedLang === lang ? `Copied ${lang}` : `Copy ${SNIPPETS[lang].label}`}</span>
                  </button>
                ))}
              </div>
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
                <span style={{ color: 'rgba(237,240,247,0.6)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
                  application/json
                </span>
              </div>
              <pre
                className="code-block overflow-x-auto"
                style={{ color: 'rgba(237,240,247,0.88)', margin: 0, maxHeight: '380px', overflowY: 'auto' }}
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
                    animation: reduced ? 'none' : 'blink 1s step-end infinite',
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
