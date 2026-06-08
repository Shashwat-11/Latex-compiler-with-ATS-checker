import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './components/ThemeProvider.js';
import { PublicLayout } from './components/layout/PublicLayout.js';
import { AuthLayout } from './components/layout/AuthLayout.js';
import { DebugPanel } from './components/shared/DebugPanel.js';
import { Skeleton } from './components/shared/Skeleton.js';

const LandingPage = lazy(() => import('./routes/landing.js').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./routes/login.js').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./routes/register.js').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./routes/dashboard.js').then(m => ({ default: m.DashboardPage })));
const ProjectPage = lazy(() => import('./routes/project.$id.js').then(m => ({ default: m.ProjectPage })));
const SettingsPage = lazy(() => import('./routes/settings.js').then(m => ({ default: m.SettingsPage })));
const ResumeNewPage = lazy(() => import('./routes/resume-new.js').then(m => ({ default: m.ResumeNewPage })));
const NotFoundPage = lazy(() => import('./routes/not-found.js').then(m => ({ default: m.NotFoundPage })));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
    <Skeleton className="h-8 w-64" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <DebugPanel />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="/project/:id" element={<Suspense fallback={<PageLoader />}><ProjectPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          <Route path="/resume/new" element={<Suspense fallback={<PageLoader />}><ResumeNewPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
}
