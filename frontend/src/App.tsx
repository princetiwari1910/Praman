import { lazy, Suspense } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { NotFound } from '@/pages/NotFound';
import { Navbar } from '@/components/Navbar';
import { useLenis } from '@/hooks/useLenis';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const Demo = lazy(() => import('@/pages/Demo').then(m => ({ default: m.Demo })));

function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function DemoFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center pt-24 px-6 text-sm"
      style={{ background: '#EDF0F7', color: '#17144F', fontFamily: 'DM Mono, monospace' }}
      role="status"
    >
      Loading demo...
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route
            path="/demo"
            element={
              <Suspense fallback={<DemoFallback />}>
                <Demo />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
}

export function App() {
  useLenis();
  const progressRef = useScrollProgress();

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="scroll-progress"
        ref={progressRef}
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      <Navbar />
      <AppRoutes />
    </MotionConfig>
  );
}
