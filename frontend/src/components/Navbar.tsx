import { useState } from 'react';
import { Menu, X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRAND } from '@/constants/brand';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname === '/demo';
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

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
          className="text-xl font-black min-h-[44px] px-1 inline-flex items-center"
          style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Tathya home"
        >
          {BRAND.name}
          <span style={{ color: '#F2A93B', marginLeft: '2px' }}>.</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {!isDemo && (
            <>
              <a href="#how-it-works" className="text-sm min-h-[44px] inline-flex items-center transition-colors duration-150" style={{ color: 'rgba(237,240,247,0.8)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.8)'; }}>
                How it works
              </a>
              <a href="#developer" className="text-sm min-h-[44px] inline-flex items-center transition-colors duration-150" style={{ color: 'rgba(237,240,247,0.8)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.8)'; }}>
                Developer
              </a>
              <a href="#faq" className="text-sm min-h-[44px] inline-flex items-center transition-colors duration-150" style={{ color: 'rgba(237,240,247,0.8)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#EDF0F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(237,240,247,0.8)'; }}>
                FAQ
              </a>
            </>
          )}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs transition-colors border"
                style={{
                  background: 'rgba(237, 240, 247, 0.06)',
                  borderColor: 'rgba(237, 240, 247, 0.15)',
                  color: '#EDF0F7',
                }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: '#F2A93B', color: '#17144F' }}
                  >
                    {(user.full_name || user.email)[0].toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate font-medium">
                  {user.full_name || user.email.split('@')[0]}
                </span>
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl border py-1.5 z-50 text-xs"
                  style={{
                    background: '#17144F',
                    borderColor: 'rgba(237, 240, 247, 0.12)',
                    color: '#EDF0F7',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-[10px] text-slate-400">Signed in as</p>
                    <p className="font-semibold truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-white/5 text-red-300 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="text-sm min-h-[44px] px-3 inline-flex items-center gap-1.5 font-medium transition-colors"
              style={{ color: '#EDF0F7' }}
            >
              <LogIn size={15} className="text-amber-400" />
              <span>Sign in</span>
            </button>
          )}

          <button
            onClick={() => navigate(isDemo ? '/' : '/demo')}
            className="px-5 py-2 min-h-[44px] rounded text-sm font-semibold transition-all duration-150 inline-flex items-center"
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
          className="md:hidden p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
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
          className="md:hidden px-6 py-4 space-y-2"
          style={{ background: '#17144F', borderTop: '1px solid rgba(237,240,247,0.08)' }}
        >
          <a href="#how-it-works" className="min-h-[44px] flex items-center text-sm" style={{ color: 'rgba(237,240,247,0.85)' }} onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#developer" className="min-h-[44px] flex items-center text-sm" style={{ color: 'rgba(237,240,247,0.85)' }} onClick={() => setMenuOpen(false)}>Developer</a>
          <a href="#faq" className="min-h-[44px] flex items-center text-sm" style={{ color: 'rgba(237,240,247,0.85)' }} onClick={() => setMenuOpen(false)}>FAQ</a>
          
          <div className="pt-2 border-t border-white/10">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-300 flex items-center gap-2 py-1">
                  <UserIcon size={14} className="text-amber-400" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 border border-red-400/30 text-red-300"
                >
                  <LogOut size={13} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  openAuthModal('login');
                  setMenuOpen(false);
                }}
                className="w-full min-h-[44px] py-2.5 rounded text-xs font-semibold flex items-center justify-center gap-2 border border-white/20 text-white mb-2"
              >
                <LogIn size={14} className="text-amber-400" />
                <span>Sign in</span>
              </button>
            )}
          </div>

          <button
            onClick={() => { navigate('/demo'); setMenuOpen(false); }}
            className="w-full min-h-[44px] py-3 rounded text-sm font-semibold"
            style={{ background: '#F2A93B', color: '#17144F', border: 'none', cursor: 'pointer', fontFamily: 'Syne Variable, Syne, sans-serif' }}
          >
            Try the live demo
          </button>
        </div>
      )}
    </header>
  );
}
