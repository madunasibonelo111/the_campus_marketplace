// src/components/Auth/ForgotPassword.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
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
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  test('renders form elements correctly', () => {
    renderComponent();
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
  });

  test('shows alert when email is empty', async () => {
    renderComponent();
    const button = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.click(button);
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please enter your email');
    });
  });

  test('successfully sends reset link with valid email', async () => {
    renderComponent();
    const emailInput = screen.getByPlaceholderText('Email');
    const button = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled();
    });
    expect(global.alert).toHaveBeenCalledWith('📧 Check your email for reset link');
  });

  test('shows error message when API returns error', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ 
      error: { message: 'User not found' } 
    });
    renderComponent();
    const emailInput = screen.getByPlaceholderText('Email');
    const button = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('User not found');
    });
  });

  test('navigates back to login when Back to Login is clicked', () => {
    renderComponent();
    const backLink = screen.getByText('Back to Login');
    fireEvent.click(backLink);
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });
});