import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Reviews from './Reviews.jsx';

// mock alert (just in case)
global.alert = vi.fn();

// mock supabase
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => {

      // 🔹 profiles mock
      if (table === 'profiles') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              error: null,
            })
          ),
        };
      }

      // 🔹 ratings mock
      if (table === 'ratings') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { reviewee_id: '1', score: 5, comment: 'Great seller!' },
                { reviewee_id: '1', score: 4, comment: 'Smooth deal' },
              ],
              error: null,
            })
          ),
        };
      }

      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }),
  },
}));

describe('Reviews Page', () => {

  it('renders Reviews page title', async () => {
    await act(async () => {
      render(<Reviews />);
    });

    expect(screen.getByText(/Seller Reviews/i)).toBeInTheDocument();
  });

  it('renders all users from profiles', async () => {
    await act(async () => {
      render(<Reviews />);
    });

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });

  it('shows average rating for users with reviews', async () => {
    await act(async () => {
      render(<Reviews />);
    });

    // Alice has 5 and 4 → avg = 4.5
    expect(await screen.findByText(/⭐ 4.5 \(2\)/i)).toBeInTheDocument();
  });

  it('shows latest comment', async () => {
    await act(async () => {
      render(<Reviews />);
    });

    expect(await screen.findByText(/Smooth deal/i)).toBeInTheDocument();
  });

  it('shows "No reviews yet" for users without ratings', async () => {
    await act(async () => {
      render(<Reviews />);
    });

    // Bob has no ratings
    expect(await screen.findByText(/No reviews yet/i)).toBeInTheDocument();
  });

});