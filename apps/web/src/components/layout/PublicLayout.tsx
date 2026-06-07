import { Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';

export function PublicLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
