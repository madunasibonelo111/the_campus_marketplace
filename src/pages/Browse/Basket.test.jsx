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
        update: vi.fn().mockReturnThis(),
        single: vi.fn()
      };

      if (table === 'categories') {
        qbChain.select.mockResolvedValue({ data: [{ name: 'Textbooks' }, { name: 'Electronics' }], error: null });
      } else if (table === 'listings') {
        qbChain.select.mockResolvedValue({ 
          data: [
            {
              id: 'l1',
              title: 'Calculus',
              price: 350,
              user_id: '2',
              status: 'active',
              listing_type: 'buy',
              quantity: 1,
              profiles: { name: 'Seller Two' },
              categories: { name: 'Textbooks' },
              listing_images: []
            },
            {
              id: 'l2',
              title: 'My Own Textbook',
              price: 150,
              user_id: '1',
              status: 'active',
              listing_type: 'buy',
              quantity: 5,
              profiles: { name: 'Test User' },
              categories: { name: 'Textbooks' },
              listing_images: []
            },
            {
              id: 'l3',
              title: 'Sold Out Book',
              price: 200,
              user_id: '3',
              status: 'sold',
              listing_type: 'buy',
              quantity: 0,
              profiles: { name: 'Seller Three' },
              categories: { name: 'Electronics' },
              listing_images: []
            }
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

      // Checkout updates listing inventory: .from('listings').update(...).eq(...).select()
      if (table === 'listings') {
        qbChain.update.mockImplementation(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [{ id: 'l1', quantity: 0, status: 'sold' }], error: null })
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

  it('Equivalence Partition: Renders user ownership restrictions and stock exhaustion masks on product lists correctly', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });
    expect(screen.getByText('Your Listing')).toBeDisabled();
    expect(screen.getByText('Out of Stock')).toBeDisabled();
  });

it('adds item to basket and updates cart count', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });

    // 1. Find all add buttons, click the first one
    const addBtns = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtns[0]); });

    // 2. Verify UI updates (Button text usually updates or basket count increments)
    const basketLabel = screen.getByLabelText(/Open basket/i);
    expect(basketLabel.textContent).toContain('1'); // Assuming quantity 1
  });

  it('prevents adding more than available stock', async () => {
    // Mock an alert to intercept the warning
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });

    const addBtns = await screen.findAllByText(/Add to Basket/i);
    
    // Click twice (if the listing quantity is 1)
    await act(async () => { 
        fireEvent.click(addBtns[0]); 
        fireEvent.click(addBtns[0]); 
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("unit(s) available"));
  });

  it('rejects checkout if unauthenticated', async () => {
    // Override Auth session to null
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null });

    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });

    const addBtns = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtns[0]); });
    
    // Open Basket
    await act(async () => { fireEvent.click(screen.getByLabelText(/Open basket/i)); });

    // Click checkout
    const checkoutBtn = screen.getByText(/Proceed to Checkout/i);
    await act(async () => { fireEvent.click(checkoutBtn); });

    expect(global.alert).toHaveBeenCalledWith("Please login to checkout");
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it('triggers transaction mapping pipeline successfully', async () => {
    await act(async () => {
      render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
    });

    // Setup: Add item and Open
    const addBtns = await screen.findAllByText(/Add to Basket/i);
    await act(async () => { fireEvent.click(addBtns[0]); });
    await act(async () => { fireEvent.click(screen.getByLabelText(/Open basket/i)); });

    // Act: Proceed to checkout
    const checkoutBtn = screen.getByText(/Proceed to Checkout/i);
    await act(async () => { fireEvent.click(checkoutBtn); });

    // Assert: Check that navigation happened to payment
    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/payment", expect.any(Object));
    });
  });

  it('filters items by category correctly', async () => {
  await act(async () => {
    render(<BrowserRouter><Basket /></BrowserRouter>);
  });

  // Click "Textbooks" category
  const categoryBtn = await screen.findByRole('button', { name: /Textbooks/i });
  await act(async () => { fireEvent.click(categoryBtn); });

  // Verify only items with "Textbooks" category show up
  // Mock data has 'Calculus' and 'My Own Textbook' as Textbooks
  expect(screen.getByText('Calculus')).toBeInTheDocument();
  expect(screen.queryByText('Sold Out Book')).not.toBeInTheDocument(); // Electronics
});

it('filters items by search query', async () => {
  await act(async () => {
    render(<BrowserRouter><Basket /></BrowserRouter>);
  });

  const searchInput = screen.getByPlaceholderText(/Search listings.../i);
  await act(async () => { 
    fireEvent.change(searchInput, { target: { value: 'Calculus' } }); 
  });

  expect(screen.getByText('Calculus')).toBeInTheDocument();
  expect(screen.queryByText('My Own Textbook')).not.toBeInTheDocument();
});

it('opens trade modal when trade button is clicked', async () => {
  await act(async () => {
    render(<BrowserRouter><Basket onViewListing={mockOnViewListing} /></BrowserRouter>);
  });

  // Find the trade button for the item
  const tradeBtns = await screen.findAllByText(/Trade/i);
  await act(async () => { fireEvent.click(tradeBtns[0]); });

  // Verify the modal appears (based on your mock)
  expect(screen.getByTestId('mock-trade-modal')).toBeInTheDocument();
});

it('removes item from basket when quantity reaches 1', async () => {
  await act(async () => {
    render(<BrowserRouter><Basket /></BrowserRouter>);
  });

  // Add item
  const addBtn = await screen.findAllByText(/Add to Basket/i);
  await act(async () => { fireEvent.click(addBtn[0]); });
  await act(async () => { fireEvent.click(screen.getByLabelText(/Open basket/i)); });

  // Remove item
  const removeBtn = screen.getByText('−');
  await act(async () => { fireEvent.click(removeBtn); });

  expect(screen.getByText(/Your basket is empty/i)).toBeInTheDocument();
});


});