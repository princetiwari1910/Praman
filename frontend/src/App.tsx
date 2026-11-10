import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Demo } from '@/pages/Demo';
import { Navbar } from '@/components/Navbar';
import { useLenis } from '@/hooks/useLenis';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0.15 : 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        {location.pathname === '/demo' ? <Demo /> : <Landing />}
      </PageTransition>
    </AnimatePresence>
  );
}

export function App() {
  useLenis();
  const progressRef = useScrollProgress();

  return (
    <>
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
    </>
  );
}
