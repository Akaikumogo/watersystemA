import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Droplet } from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
}

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isAuthenticated, initialize } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>();

  // Check authentication and redirect if already logged in
  useEffect(() => {
    initialize();

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    const result = await login(data);

    if (!result.success) {
      setError(result.error || t('auth.loginError'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-4"
            >
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
                <Droplet className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth.title')}
            </h1>
            <p className="text-gray-600 text-sm">{t('auth.subtitle')}</p>
          </div>

          <div className="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <Input
              label={t('common.username')}
              type="text"
              placeholder={t('auth.usernamePlaceholder')}
              error={errors.username?.message}
              {...register('username', {
                required: t('common.username') + ' ' + t('common.error')
              })}
              autoComplete="username"
              aria-required="true"
            />

            <Input
              label={t('common.password')}
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              error={errors.password?.message}
              {...register('password', {
                required: t('common.password') + ' ' + t('common.error')
              })}
              autoComplete="current-password"
              aria-required="true"
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              aria-label={t('auth.loginButton')}
            >
              {t('auth.loginButton')}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
