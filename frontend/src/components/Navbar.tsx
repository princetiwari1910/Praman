import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRAND } from '@/constants/brand';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname === '/demo';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ background: 'rgba(23,20,79,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(237,240,247,0.08)' }}
    >
      <nav
        className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="text-xl font-black"
          style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Praman home"
        >
          {BRAND.name}
          <span style={{ color: '#F2A93B', marginLeft: '2px' }}>.</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {!isDemo && (
            <>
              <a href="#how-it-works" className="text-sm transition-colors duration-150" style={{ color: 'rgba(237,240,247,0.7)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.7)'; }}>
                How it works
              </a>
              <a href="#developer" className="text-sm transition-colors duration-150" style={{ color: 'rgba(237,240,247,0.7)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.7)'; }}>
                Developer
              </a>
              <a href="#faq" className="text-sm transition-colors duration-150" style={{ color: 'rgba(237,240,247,0.7)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.7)'; }}>
                FAQ
              </a>
            </>
          )}
          <button
            onClick={() => navigate(isDemo ? '/' : '/demo')}
            className="px-5 py-2 rounded text-sm font-semibold transition-all duration-150"
            style={{
              background: '#F2A93B',
              color: '#17144F',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Syne Variable, Syne, sans-serif',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f0b34e'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F2A93B'; }}
          >
            {isDemo ? '← Back' : 'Live demo'}
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(o => !o)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{ color: '#EDF0F7', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 py-4 space-y-4"
          style={{ background: '#17144F', borderTop: '1px solid rgba(237,240,247,0.08)' }}
        >
          <a href="#how-it-works" className="block text-sm py-2" style={{ color: 'rgba(237,240,247,0.8)' }} onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#developer" className="block text-sm py-2" style={{ color: 'rgba(237,240,247,0.8)' }} onClick={() => setMenuOpen(false)}>Developer</a>
          <a href="#faq" className="block text-sm py-2" style={{ color: 'rgba(237,240,247,0.8)' }} onClick={() => setMenuOpen(false)}>FAQ</a>
          <button
            onClick={() => { navigate('/demo'); setMenuOpen(false); }}
            className="w-full py-3 rounded text-sm font-semibold"
            style={{ background: '#F2A93B', color: '#17144F', border: 'none', cursor: 'pointer', fontFamily: 'Syne Variable, Syne, sans-serif' }}
          >
            Try the live demo
          </button>
        </div>
      )}
    </header>
  );
}
