import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EmailConfirmed from './EmailConfirmed';

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

describe('EmailConfirmed Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
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
});