import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Reviews from './Reviews.jsx';

global.alert = vi.fn();


vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { id: '1', user_id: 'user-1', name: 'Alice' }, // ✅ Added user_id
                { id: '2', user_id: 'user-2', name: 'Bob' },
              ],
              error: null,
            })
          ),
        };
      }
      if (table === 'ratings') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { reviewee_id: 'user-1', score: 5, comment: 'Great seller!' },
                { reviewee_id: 'user-1', score: 4, comment: 'Smooth deal' },
              ],
              error: null,
            })
          ),
        };
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) };
    }),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } }))
    }
  },
}));

describe('Reviews Page', () => {

  it('renders modern page title', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Reviews />
        </MemoryRouter>
      );
    });
    
    expect(screen.getByText(/What Our/i)).toBeInTheDocument();
    expect(screen.getByText(/Students/i)).toBeInTheDocument();
  });

  it('renders all users from profiles', async () => {
    await act(async () => {
      render(<MemoryRouter><Reviews /></MemoryRouter>);
    });
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });

  it('shows average rating for users with reviews', async () => {
    await act(async () => {
      render(<MemoryRouter><Reviews /></MemoryRouter>);
    });
    
    expect(await screen.findByText('4.5')).toBeInTheDocument();
    expect(await screen.findByText(/2 reviews/i)).toBeInTheDocument();
  });

  it('shows latest comment', async () => {
    await act(async () => {
      render(<MemoryRouter><Reviews /></MemoryRouter>);
    });
    
    expect(await screen.findByText(/"Smooth deal"/i)).toBeInTheDocument();
  });

  it('shows default text for users without ratings', async () => {
    await act(async () => {
      render(<MemoryRouter><Reviews /></MemoryRouter>);
    });
    
    expect(await screen.findByText(/No specific feedback/i)).toBeInTheDocument();
  });
});