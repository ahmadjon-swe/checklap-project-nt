'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';

// Where each role belongs. Mirrors the redirect logic in the login page so a
// user who lands on the wrong area is sent to their own dashboard.
const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  moderator: '/admin/dashboard',
  support: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

/**
 * Client-side guard for protected areas. The backend enforces real data access
 * via JWT guards; this only gates the UI shell so unauthenticated users (or the
 * wrong role) never see it. Waits for store hydration before deciding to avoid
 * a redirect flash on legitimately logged-in users.
 */
export function RouteGuard({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace(ROLE_HOME[user.role] ?? '/login');
    }
  }, [hasHydrated, user, roles, router]);

  // Until we know auth state — or while a redirect is pending — render nothing
  // so the protected shell never flashes.
  if (!hasHydrated || !user || !roles.includes(user.role)) return null;

  return <>{children}</>;
}
