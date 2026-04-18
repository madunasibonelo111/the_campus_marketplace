// src/components/Auth/Login.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';
import { supabase } from '@/supabase/supabaseClient';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('Login Component', () => {
  const mockSwitchToRegister = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Login switchToRegister={mockSwitchToRegister} />
      </BrowserRouter>
    );
  };

  test('renders login form correctly', () => {
    renderComponent();
    // Use heading for title instead of generic text
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  test('email and password inputs are empty initially', () => {
    renderComponent();
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    expect(emailInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  test('updates email state on change', () => {
    renderComponent();
    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  test('updates password state on change', () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    expect(passwordInput.value).toBe('password123');
  });

  test('shows alert when email is empty', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Password');
    fireEvent.change(passwordInput, { target: { value: 'pass123' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please fill in all fields');
    });
  });

  test('shows alert when password is empty', async () => {
    renderComponent();
    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please fill in all fields');
    });
  });

  test('shows alert when both fields are empty', async () => {
    renderComponent();
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please fill in all fields');
    });
  });

  test('successfully logs in verified user', async () => {
    const mockSession = { access_token: 'token' };
    const mockUser = { 
      id: '123', 
      email: 'verified@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };
    
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'verified@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('✅ Login successful!');
    });
  });

  test('stores user data in localStorage after successful login', async () => {
    const mockSession = { access_token: 'token' };
    const mockUser = { 
      id: '456', 
      email: 'user@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };
    
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  test('prevents login when email is not verified', async () => {
    const mockSession = { access_token: 'token' };
    const mockUser = { 
      id: '789', 
      email: 'unverified@example.com',
      email_confirmed_at: null
    };
    
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'unverified@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please verify your email before logging in.');
    });
  });

  test('prevents login when session is missing', async () => {
    const mockUser = { 
      id: '789', 
      email: 'nosession@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };
    
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: mockUser },
      error: null,
    });
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'nosession@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please verify your email before logging in.');
    });
  });

  test('shows error message when credentials are invalid', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Invalid login credentials');
    });
  });

  test('handles network error gracefully', async () => {
    supabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('An error occurred during login');
    });
  });

  test('disables button and shows loading text during login', async () => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    supabase.auth.signInWithPassword.mockReturnValue(promise);
    
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);
    
    expect(loginButton).toBeDisabled();
    expect(screen.getByText('Logging in...')).toBeInTheDocument();
    
    resolvePromise({ data: { session: { token: '123' }, user: { email_confirmed_at: 'date' } }, error: null });
  });

  test('navigates to forgot password page when link is clicked', () => {
    renderComponent();
    const forgotLink = screen.getByText('Forgot Password?');
    fireEvent.click(forgotLink);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  test('calls switchToRegister when register link is clicked', () => {
    renderComponent();
    const registerLink = screen.getByText('Register');
    fireEvent.click(registerLink);
    expect(mockSwitchToRegister).toHaveBeenCalled();
  });
});