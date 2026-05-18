import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EmailConfirmed from './EmailConfirmed';
import { supabase } from "@/supabase/supabaseClient";
import React from 'react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'amy-123', email: 'amy@campus.edu', user_metadata: { name: 'Amy' } } } })),
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('EmailConfirmed Component Lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly with the updated activation message', async () => {
    await act(async () => {
      render(<BrowserRouter><EmailConfirmed /></BrowserRouter>);
    });
    
    expect(screen.getByText(/Account Activated!/i)).toBeInTheDocument();
    expect(screen.getByText(/Syncing your profile/i)).toBeInTheDocument();
  });

  it('navigates to auth after the 5 second timeout', async () => {
    await act(async () => {
      render(<BrowserRouter><EmailConfirmed /></BrowserRouter>);
    });
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('handles the negative boundary path cleanly when the authenticated user returns null', async () => {
    // This explicitly triggers the false side of the if (user) condition to satisfy branch coverage
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: null }, error: null });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockImplementation(() => ({ upsert: mockUpsert }));

    await act(async () => {
      render(<BrowserRouter><EmailConfirmed /></BrowserRouter>);
    });

    // Confirms that the database pipeline is safely bypassed when no session exists
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('intercepts and logs backend profiles database synchronization rejections accurately', async () => {
    // Equivalence partition check to verify operational error logging outputs
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: { message: "Database constraint breach" } })
    }));

    await act(async () => {
      render(<BrowserRouter><EmailConfirmed /></BrowserRouter>);
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Profile sync failed:"),
      "Database constraint breach"
    );
  });
});