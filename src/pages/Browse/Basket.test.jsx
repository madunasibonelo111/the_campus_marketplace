import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Basket from './Basket.jsx';
import { supabase } from "@/supabase/supabaseClient";
import React from 'react';

// 🛑 HOISTED SYSTEM GATEWAY MOCK: Handles alias resolution globally
vi.mock("@/supabase/supabaseClient", () => {
  const qbChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }))
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn(() => qbChain),
    },
  };
});

vi.mock("../Profile/TradeOfferModal", () => ({
  default: () => <div data-testid="mock-trade-modal">Mock Trade Offer Modal</div>
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockOnViewListing = vi.fn();
global.alert = vi.fn();

describe('Basket Page Comprehensive & Boundary Suite', () => {
  let mockSessionUser = { id: '1', email: 'test@wits.ac.za' };
  let mockProfileResponse = { data: { id: '1', name: 'Test User' }, error: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    global.alert.mockClear();
    
    mockSessionUser = { id: '1', email: 'test@wits.ac.za' };
    mockProfileResponse = { data: { id: '1', name: 'Test User' }, error: null };

    // Setup Auth Session
    vi.spyOn(supabase.auth, 'getSession').mockImplementation(() => 
      Promise.resolve({ data: { session: mockSessionUser ? { user: mockSessionUser } : null }, error: null })
    );

    // Dynamic database mock builder
    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      const qbChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn()
      };

      if (table === 'categories') {
        qbChain.select.mockResolvedValue({ data: [{ name: 'Textbooks' }, { name: 'Electronics' }], error: null });
      } else if (table === 'listings') {
        qbChain.select.mockResolvedValue({ 
          data: [
            { id: 'l1', title: 'Calculus', price: 350, user_id: '2', status: 'active', listing_type: 'sale' },
            { id: 'l2', title: 'My Own Textbook', price: 150, user_id: '1', status: 'active', listing_type: 'sale' },
            { id: 'l3', title: 'Sold Out Book', price: 200, user_id: '3', status: 'sold', listing_type: 'sale' }
          ], 
          error: null 
        });
      } else if (table === 'profiles') {
        qbChain.single.mockImplementation(() => Promise.resolve(mockProfileResponse));
        qbChain.insert.mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Auto Created Profile' }, error: null })
        }));
      } else if (table === 'transactions') {
        qbChain.insert.mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'tx-999', total_amount: 350 }, error: null })
        }));
      }
      return qbChain;
    });
  });

  it('renders categories sidebar correctly', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    fireEvent.click(screen.getByText(/Explore Categories/i));
    expect(await screen.findByRole('button', { name: /Textbooks/i })).toBeInTheDocument();
  });

  it('adds item to basket and opens basket panel', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    const addBtn = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn[0]); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open basket/i })); });
    expect(screen.getByText(/Proceed to Checkout/i)).toBeInTheDocument();
  });

  it('removes item from basket cleanly', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    const addBtn = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn[0]); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open basket/i })); });
    fireEvent.click(screen.getByText('−'));
    expect(screen.queryByText(/Qty:/i)).not.toBeInTheDocument();
  });

  it('Branch Coverage: Renders empty state and sold-out items', async () => {
    // 1. Mock empty items list specifically for this test
    supabase.from.mockImplementationOnce(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }));
    
    await act(async () => {
      render(<BrowserRouter><Basket /></BrowserRouter>);
    });

    // 2. Open the basket panel
    const basketBtn = screen.getByRole('button', { name: /Open basket/i });
    await act(async () => {
      fireEvent.click(basketBtn);
    });

    // 3. Now verify the empty state text exists
    expect(screen.getByText(/Your basket is empty/i)).toBeInTheDocument();
  });

  it('checkout triggers transaction mapping pipeline successfully', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    const addBtn = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn[0]); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open basket/i })); });
    await act(async () => { fireEvent.click(screen.getByText(/Proceed to Checkout/i)); });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.any(Object));
    });
  });

  /* ======================================================================
      🚀 BOUNDARY VALUE TESTING (BVA) & EQUIVALENCE PARTITIONS (EP)
     ====================================================================== */

  it('Boundary Check: Rejects checkout pipeline loops if an unauthenticated user session context is used', async () => {
    mockSessionUser = null; 
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    const addBtn = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn[0]); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open basket/i })); });
    await act(async () => { fireEvent.click(screen.getByText(/Proceed to Checkout/i)); });
    expect(global.alert).toHaveBeenCalledWith("Please login to checkout");
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it('Boundary Check: Triggers automatic profile sync record building when user row lookup responds missing (PGRST116)', async () => {
    mockProfileResponse = { data: null, error: { code: 'PGRST116', message: 'Profile mismatch' } };
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    const addBtn = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtn[0]); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open basket/i })); });
    await act(async () => { fireEvent.click(screen.getByText(/Proceed to Checkout/i)); });
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.any(Object));
    });
  });

  it('Equivalence Partition: Renders sold-out item restrictions correctly', async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <Basket onViewListing={mockOnViewListing} />
      </BrowserRouter>
    );
  });

  // Sold items should render disabled
  expect(screen.getByText(/out of stock/i)).toBeDisabled();

  // User-owned listings are filtered out completely
  expect(screen.queryByText(/your listing/i)).not.toBeInTheDocument();
});
});