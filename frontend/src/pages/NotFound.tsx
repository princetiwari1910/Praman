import { Link } from 'react-router-dom';
import { BRAND } from '@/constants/brand';

export function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center"
      style={{ background: '#17144F', color: '#EDF0F7' }}
    >
      <span
        className="text-sm mb-3"
        style={{ color: '#F2A93B', fontFamily: 'DM Mono, monospace' }}
      >
        404 · {BRAND.name}
      </span>
      <h1
        className="text-4xl sm:text-5xl font-black mb-4"
        style={{ color: '#EDF0F7', fontFamily: 'Syne Variable, Syne, sans-serif' }}
      >
        Page not found
      </h1>
      <p className="text-base mb-8 max-w-md" style={{ color: 'rgba(237,240,247,0.75)' }}>
        The page you requested does not exist.
      </p>
      <Link
        to="/"
        className="px-6 py-3 min-h-[44px] inline-flex items-center justify-center rounded-lg font-semibold text-sm"
        style={{
          background: '#F2A93B',
          color: '#17144F',
          fontFamily: 'Syne Variable, Syne, sans-serif',
        }}
      >
        Back to home
      </Link>
    </main>
  );
}
