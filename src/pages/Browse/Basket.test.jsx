import { render, screen, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Basket from './Basket.jsx';

// mock navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockOnViewListing = vi.fn();

// mock alert
global.alert = vi.fn();

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: '1' } } },
          error: null,
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },

    from: vi.fn((table) => {

      if (table === 'categories') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { name: 'Textbooks' },
                { name: 'Electronics' },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === 'listings') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: 1,
                  title: 'Calculus',
                  price: 350,
                  listing_images: [],
                  categories: { name: 'Textbooks' },
                  user_id: '2',
                  listing_type: 'buy',
                },
              ],
              error: null,
            })
          ),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: null })
                ),
              })),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { id: 'conv1' },
              })
            ),
          })),
        })),
      };
    }),
  },
}));

describe('Basket Page', () => {

  it('renders categories sidebar correctly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket onViewListing={mockOnViewListing} />
        </BrowserRouter>
      );
    });

    fireEvent.click(screen.getByText(/Explore Categories/i));

    const btn = await screen.findByRole('button', { name: /Textbooks/i });
    expect(btn).toBeInTheDocument();
  });

  it('adds item to basket and opens basket panel', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket onViewListing={mockOnViewListing} />
        </BrowserRouter>
      );
    });

    const addBtn = await screen.findByText(/Add to Basket/i);

    await act(async () => {
      fireEvent.click(addBtn);
    });

    const basketBtn = await screen.findByRole('button', {
      name: /open basket/i,
    });

    await act(async () => {
      fireEvent.click(basketBtn);
    });

    const checkout = await screen.findByText(/Proceed to Checkout/i);
    expect(checkout).toBeInTheDocument();
  });

  it('removes item from basket', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket onViewListing={mockOnViewListing} />
        </BrowserRouter>
      );
    });

    const addBtn = await screen.findByText(/Add to Basket/i);

    await act(async () => {
      fireEvent.click(addBtn);
    });

    const basketBtn = await screen.findByRole('button', {
      name: /open basket/i,
    });

    await act(async () => {
      fireEvent.click(basketBtn);
    });

    const minusBtn = await screen.findByText('−');

    await act(async () => {
      fireEvent.click(minusBtn);
    });

    // ✅ correct check
    expect(screen.queryByText(/Qty:/i)).not.toBeInTheDocument();
  });

  it('checkout triggers supabase logic', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket onViewListing={mockOnViewListing} />
        </BrowserRouter>
      );
    });

    const addBtn = await screen.findByText(/Add to Basket/i);

    await act(async () => {
      fireEvent.click(addBtn);
    });

    const basketBtn = await screen.findByRole('button', {
      name: /open basket/i,
    });

    await act(async () => {
      fireEvent.click(basketBtn);
    });

    const checkoutBtn = await screen.findByText(/Proceed to Checkout/i);

    await act(async () => {
      fireEvent.click(checkoutBtn);
    });

    expect(global.alert).toHaveBeenCalled();
  });

});