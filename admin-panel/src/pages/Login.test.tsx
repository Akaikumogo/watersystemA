import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';
import * as useAuthHook from '@/hooks/useAuth';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock useAuthStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    initialize: vi.fn(),
  })),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Login', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useAuthHook.useAuth as any).mockReturnValue({
      login: mockLogin,
    });
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderLogin();
    const submitButton = screen.getByRole('button', { name: /login/i });
    await userEvent.click(submitButton);

    // React Hook Form will show validation errors
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it('should call login function with form data', async () => {
    mockLogin.mockResolvedValue({ success: true });
    
    renderLogin();
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });
  });

  it('should display error message on login failure', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    
    renderLogin();
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'wrongpassword');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});

