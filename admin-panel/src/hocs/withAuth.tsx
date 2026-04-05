import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Protects routes using the same auth source as the rest of the app:
 * Zustand + persist (`auth-storage`). Waits for persist rehydration before deciding.
 */
export const withAuth = <P extends object>(Component: ComponentType<P>) => {
  function AuthenticatedRoute(props: P) {
    const navigate = useNavigate();
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const [hydrated, setHydrated] = useState(() =>
      useAuthStore.persist.hasHydrated()
    );

    useEffect(() => {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      if (useAuthStore.persist.hasHydrated()) {
        setHydrated(true);
      }
      return unsub;
    }, []);

    useEffect(() => {
      if (!hydrated) return;
      if (!token || !user) {
        navigate('/login', { replace: true });
      }
    }, [hydrated, token, user, navigate]);

    if (!hydrated) {
      return null;
    }

    if (!token || !user) {
      return null;
    }

    return <Component {...props} />;
  }

  return AuthenticatedRoute;
};
