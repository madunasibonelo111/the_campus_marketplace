import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResetPassword from './ResetPassword';
import { supabase } from '@/supabase/supabaseClient';

// Mock the Supabase client
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

describe('ResetPassword Component', () => {
  it('renders the reset password form correctly', () => {
    render(<ResetPassword />);
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
  });

  it('shows password matching feedback', () => {
    render(<ResetPassword />);
    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');

    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'Mismatch123!' } });

    expect(screen.getByText('✗ No match')).toBeInTheDocument();

    fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
    expect(screen.getByText('✓ Match')).toBeInTheDocument();
  });

  it('calls supabase.auth.updateUser on valid submission', async () => {
    //
    supabase.auth.updateUser.mockResolvedValueOnce({ error: null });
    window.alert = vi.fn(); // Mock alert

    render(<ResetPassword />);
    
    const passwordInput = screen.getByPlaceholderText('New Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');
    const updateButton = screen.getByRole('button', { name: /update password/i });

    // Must be strong: 8+ chars, upper, lower, digit, symbol
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
    
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'StrongPass123!',
      });
      expect(window.alert).toHaveBeenCalledWith('✅ Password updated successfully!');
    });
  });
});
