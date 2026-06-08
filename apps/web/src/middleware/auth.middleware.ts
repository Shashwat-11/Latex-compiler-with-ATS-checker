import { useAuthStore } from '../../stores/auth.store';

const PUBLIC_ROUTES = ['/login', '/register', '/'];

export function authGuard(to: string) {
  const { user, isLoading, isAuthenticated } = useAuthStore.getState();

  if (isLoading) return;

  // Only redirect if we're sure the user is unauthenticated
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(to)) {
    window.location.href = '/login';
    return;
  }

  if (isAuthenticated && PUBLIC_ROUTES.includes(to)) {
    window.location.href = '/dashboard';
    return;
  }
}
