import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import type { LoginCredentials } from '@/types';

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    setAuth,
    logout: logoutStore,
    isAuthenticated,
    user
  } = useAuthStore();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const response = await api.login(credentials);
        setAuth(response.user, response.access_token);
        navigate('/dashboard');
        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          (error as { message?: string })?.message ||
          'Login failed. Please check your credentials.';
        return {
          success: false,
          error: errorMessage
        };
      }
    },
    [navigate, setAuth]
  );

  const logout = useCallback(() => {
    logoutStore();
    navigate('/login');
  }, [navigate, logoutStore]);

  return {
    login,
    logout,
    isAuthenticated,
    user
  };
};
