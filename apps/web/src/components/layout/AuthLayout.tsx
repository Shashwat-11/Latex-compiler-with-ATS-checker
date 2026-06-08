import { Outlet, Navigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth.js';
import { Sidebar } from './Sidebar.js';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login?reason=session_expired" replace />;

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden transition-colors duration-[var(--transition-base)]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
