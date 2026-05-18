import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Basket from './Basket.jsx';
import { supabase } from "@/supabase/supabaseClient";
import React from 'react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockOnViewListing = vi.fn();
global.alert = vi.fn();

vi.mock('@/supabase/supabaseClient', () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    selectAfterInsert: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: { session: { user: { id: 'user-123', email: 'test@wits.ac.za', user_metadata: { name: 'Test User' } } } },
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
            select: vi.fn(() => Promise.resolve({ data: [{ name: 'Textbooks' }, { name: 'Electronics' }], error: null })),
          };
        }
        if (table === 'listings') {
          return {
            select: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: 1,
                    title: 'Calculus textbook',
                    price: 350,
                    listing_images: [],
                    categories: { name: 'Textbooks' },
                    user_id: 'seller-456',
                    listing_type: 'buy',
                    status: 'active',
                  },
                ],
                error: null,
              })
            ),
          };
        }
        return mockChain;
      }),
    },
  };
});

describe('Basket Page Extended Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    await act(async () => { fireEvent.click(addBtn); });

    const basketBtn = await screen.findByRole('button', { name: /open basket/i });
    await act(async () => { fireEvent.click(basketBtn); });

    const checkout = await screen.findByText(/Proceed to Checkout/i);
    expect(checkout).toBeInTheDocument();
  });

  it('removes item from basket cleanly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket onViewListing={mockOnViewListing} />
        </BrowserRouter>
      );
    });

    const addBtn = await screen.findByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn); });

    const basketBtn = await screen.findByRole('button', { name: /open basket/i });
    await act(async () => { fireEvent.click(basketBtn); });

    const minusBtn = screen.getByText('−');
    await act(async () => { fireEvent.click(minusBtn); });

    expect(screen.queryByText(/Qty:/i)).not.toBeInTheDocument();
  });

  it('creates a new profile record if the student profile lookup returns empty', async () => {
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // First call: profile lookup fails
      .mockResolvedValueOnce({ data: { id: 'user-123', name: 'Test User' }, error: null }); // Second call: after insert resolves successfully

    const profilesChain = {
      select: mockSelect,
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      insert: mockInsert
    };

    const transactionsChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'trans-999' }, error: null })
    };

    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'profiles') return profilesChain;
      if (table === 'transactions') return transactionsChain;
      if (table === 'categories') return { select: vi.fn(() => Promise.resolve({ data: [] })) };
      if (table === 'listings') {
        return {
          select: vi.fn(() => Promise.resolve({ data: [{ id: 1, title: 'Calculus', price: 350, user_id: 'seller-456' }] }))
        };
      }
    });

    render(
      <BrowserRouter>
        <Basket onViewListing={mockOnViewListing} />
      </BrowserRouter>
    );

    const addBtn = await screen.findByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn); });

    const basketBtn = screen.getByRole("button", { name: /open basket/i });
    await act(async () => { fireEvent.click(basketBtn); });

    const checkoutBtn = screen.getByText(/Proceed to Checkout/i);
    await act(async () => { fireEvent.click(checkoutBtn); });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-123' }));
      expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.any(Object));
    });
  });
  
  it('completes the checkout journey and navigates to the payment page when profile already exists', async () => {
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-123', name: 'Existing User' }, error: null })
    };

    const transactionsChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'trans-777' }, error: null })
    };

    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'profiles') return profilesChain;
      if (table === 'transactions') return transactionsChain;
      if (table === 'categories') return { select: vi.fn(() => Promise.resolve({ data: [] })) };
      if (table === 'listings') {
        return {
          select: vi.fn(() => Promise.resolve({ data: [{ id: 1, title: 'Calculus', price: 350, user_id: 'seller-456' }] }))
        };
      }
    });

    render(
      <BrowserRouter>
        <Basket onViewListing={mockOnViewListing} />
      </BrowserRouter>
    );

    const addBtn = await screen.findByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn); });

    const basketBtn = screen.getByRole('button', { name: /open basket/i });
    await act(async () => { fireEvent.click(basketBtn); });

    const checkoutBtn = screen.getByText(/Proceed to Checkout/i);
    await act(async () => { fireEvent.click(checkoutBtn); });

    await waitFor(() => {
      expect(transactionsChain.insert).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.any(Object));
    });
  });

  it('intercepts system errors within the checkout transaction loop gracefully', async () => {
    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error('Connection failure'))
        };
      }
      if (table === 'listings') {
        return {
          select: vi.fn(() => Promise.resolve({ data: [{ id: 1, title: 'Calculus', price: 350, user_id: 'seller-456' }] }))
        };
      }
      return { select: vi.fn(() => Promise.resolve({ data: [] })) };
    });

    render(
      <BrowserRouter>
        <Basket onViewListing={mockOnViewListing} />
      </BrowserRouter>
    );

    const addBtn = await screen.findByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn); });

    const basketBtn = screen.getByRole('button', { name: /open basket/i });
    await act(async () => { fireEvent.click(basketBtn); });

    const checkoutBtn = screen.getByText(/Proceed to Checkout/i);
    await act(async () => { fireEvent.click(checkoutBtn); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error processing checkout:'));
    });
  });
});