import { BRAND } from '@/constants/brand';
import { useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Developer', href: '#developer' },
  { label: 'FAQ', href: '#faq' },
];

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer
      style={{ background: '#0F0D3A', borderTop: '1px solid rgba(237,240,247,0.08)' }}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div
              className="text-2xl font-black mb-3"
              style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
            >
              {BRAND.name}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(237,240,247,0.75)' }}>
              {BRAND.tagline}
            </p>
          </div>

          {/* Nav */}
          <div>
            <div
              className="text-xs mb-4"
              style={{ color: 'rgba(237,240,247,0.65)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}
            >
              NAVIGATION
            </div>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2">
                {NAV_LINKS.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors duration-150"
                      style={{ color: 'rgba(237,240,247,0.8)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.8)'; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => navigate('/demo')}
                    className="text-sm transition-colors duration-150"
                    style={{ color: '#F2A93B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Try the live demo
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <div
              className="text-xs mb-4"
              style={{ color: 'rgba(237,240,247,0.65)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}
            >
              CONTACT
            </div>
            <a
              href={`mailto:${BRAND.partnerEmail}`}
              className="text-sm transition-colors duration-150"
              style={{ color: 'rgba(237,240,247,0.85)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.85)'; }}
            >
              {BRAND.partnerEmail}
            </a>
            <p className="text-xs mt-6 leading-relaxed" style={{ color: 'rgba(237,240,247,0.65)' }}>
              Bengaluru, India · Remote-first
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="pt-8 text-xs leading-relaxed"
          style={{
            color: 'rgba(237,240,247,0.75)',
            borderTop: '1px solid rgba(237,240,247,0.12)',
          }}
          role="note"
        >
          <strong style={{ color: '#EDF0F7' }}>Disclaimer: </strong>
          Screening signals support human review; not legal advice. Praman is not affiliated with
          any government body or regulator. Risk scores are informational only.
        </div>

        <div
          className="mt-6 text-xs"
          style={{ color: 'rgba(237,240,247,0.6)' }}
        >
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
