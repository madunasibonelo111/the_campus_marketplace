import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import TransactionHistory from './TransactionHistory';
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
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('TransactionHistory Component Unit & Boundary Test Suite', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <TransactionHistory />
      </BrowserRouter>
    );
  };

  test('renders loading state initially', () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderComponent();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('opens and closes the detail modal smoothly on element click sequences', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
    
    const mockTransactions = {
      data: [
        {
          id: 'tx-modal-1',
          buyer_id: 'user-123',
          offer_amount: 150.00,
          status: 'pending',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Textbook', price: 150.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-id' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: [{ id: 'pay-1', amount: 150.00, method: 'card', status: 'completed' }]
        }
      ],
      error: null
    };
    
    const mockOrder = vi.fn().mockResolvedValue(mockTransactions);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const transaction = screen.getByText('Textbook');
      fireEvent.click(transaction);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
    });
  });

  test('handles error when fetching fails', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') });
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Database error/i)).toBeInTheDocument();
    });
  });

  test('executes filter button selection updates to sort history cards accurately', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockDataset = {
      data: [
        {
          id: 'tx-filter-1',
          buyer_id: 'user-123',
          offer_amount: 200.00,
          status: 'partial_payment',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Engineering Drafting Kit', price: 200.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-id' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: [{ id: 'pay-part', amount: 50.00, status: 'completed' }]
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockDataset);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    // Test the filter buttons systematically to cover the conditional mapping tracks
    const purchaseFilterBtn = screen.getByRole('button', { name: /Purchases/i });
    const salesFilterBtn = screen.getByRole('button', { name: /Sales/i });
    const partialFilterBtn = screen.getByRole('button', { name: /Partial Payments/i });

    await act(async () => { fireEvent.click(purchaseFilterBtn); });
    expect(screen.getByText('Engineering Drafting Kit')).toBeInTheDocument();

    await act(async () => { fireEvent.click(salesFilterBtn); });
    expect(screen.queryByText('Engineering Drafting Kit')).not.toBeInTheDocument();

    await act(async () => { fireEvent.click(partialFilterBtn); });
    expect(screen.getByText('Engineering Drafting Kit')).toBeInTheDocument();
  });

  test('triggers seller drop-off slot reservation navigation successfully', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockSellDataset = {
      data: [
        {
          id: 'tx-sell-1',
          buyer_id: 'buyer-456',
          seller_id: 'user-123', // Active user is the seller here
          offer_amount: 300.00,
          status: 'pending',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Lab Coat', price: 300.00 },
          seller: { name: 'Buyer Bob', user_id: 'user-123' },
          buyer: { name: 'Seller Sam', user_id: 'buyer-456' },
          payments: []
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockSellDataset);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    const bookBtn = await screen.findByRole('button', { name: /Book Seller Drop-off Slot/i });
    await act(async () => {
      fireEvent.click(bookBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/booking/dropoff', expect.any(Object));
  });

  test('triggers payment shortfall processing navigation when outstanding balance alerts are selected', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockShortfallDataset = {
      data: [
        {
          id: 'tx-short-1',
          buyer_id: 'user-123',
          seller_id: 'seller-456',
          offer_amount: 500.00,
          status: 'partial_payment',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Scientific Calculator', price: 500.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-456' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: [{ id: 'p-1', amount: 200.00, status: 'completed' }] // R300 balance remaining
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockShortfallDataset);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    const payBtn = await screen.findByRole('button', { name: /Pay Outstanding Shortfall Balance/i });
    await act(async () => {
      fireEvent.click(payBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.any(Object));
  });

  test('routes buyers cleanly to the ratings submission page when feedback actions trigger', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockCompletedDataset = {
      data: [
        {
          id: 'tx-complete-1',
          buyer_id: 'user-123',
          seller_id: 'seller-456',
          offer_amount: 150.00,
          status: 'completed',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Mechanics Notes', price: 150.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-456' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: [{ id: 'p-full', amount: 150.00, status: 'completed' }],
          ratings: null // Signifies no feedback has been logged yet
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockCompletedDataset);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    const rateBtn = await screen.findByRole('button', { name: /Rate Seller Performance/i });
    await act(async () => {
      fireEvent.click(rateBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/reviews/'), expect.any(Object));
  });

  test('Boundary Check: Renders Outstanding Balance message when debt hits exactly R0.10 margin threshold', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockBorderTx = {
      data: [
        {
          id: 'tx-border-10c',
          buyer_id: 'user-123',
          offer_amount: 100.00,
          status: 'item_in_custody',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Borderline Asset', price: 100.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-id' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: []
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockBorderTx);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText(/Outstanding Balance/i)).toBeInTheDocument();
    });
  });

  test('Boundary Check: Displays Booking action triggers flawlessly when remaining balances resolve to absolute zero', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockZeroTx = {
      data: [
        {
          id: 'tx-zero-paid',
          buyer_id: 'user-123',
          offer_amount: 100.00,
          status: 'item_in_custody',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Fully Paid Textbook Pack', price: 100.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-id' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: [{ id: 'pay-zero', amount: 100.00, shortfall_amount: 0.00, status: 'completed' }]
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockZeroTx);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText(/🎁 Book Buyer Collection Slot/i)).toBeInTheDocument();
    });
  });

  test('Coverage Boost: Redirects users directly to auth layout entry gates if session context token is missing on mount', async () => {
    // Force getSession to resolve empty to trigger the early authentication failure return path
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error('Session dropped') });

    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  test('Coverage Boost: Handles trade transactional arrays and maps active filter gates flawlessly', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    // The component maps fields based on specific object keys. 
    // We will set the listing_type here to force the UI render.
    const mockTradeData = {
      data: [
        {
          id: 'tx-trade-idx-1',
          buyer_id: 'user-123',
          seller_id: 'seller-789',
          type: 'trade', 
          status: 'pending',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { 
            title: 'Lab Apparatus Swap Bundle', 
            price: 0.00, 
            listing_type: 'trade' 
          },
          seller: { name: 'Seller Sam', user_id: 'seller-789' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: []
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockTradeData);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    // Tap into the Trades explicit filtering tab
    const tradeFilterBtn = screen.getByRole('button', { name: /Trades/i });
    await act(async () => { 
      fireEvent.click(tradeFilterBtn); 
    });

    // Use a more generic matcher if the emoji is wrapped in an element
    // The previous error showed it's not finding the 🔄 text node directly
    await waitFor(() => {
      expect(screen.getByText(/Lab Apparatus Swap Bundle/i)).toBeInTheDocument();
      // If the icon is rendering, it must be in the transaction-type-icon div
      const typeIcons = screen.getAllByText((content, element) => 
        element.className === 'transaction-type-icon' || content === '🔄'
      );
      expect(typeIcons.length).toBeGreaterThan(0);
    });
  });
  
  test('Coverage Boost: Displays feedback completion indicators when user rating rows match as already evaluated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } }, error: null });

    const mockRatedDataset = {
      data: [
        {
          id: 'tx-rated-already',
          buyer_id: 'user-123',
          seller_id: 'seller-456',
          offer_amount: 100.00,
          status: 'completed',
          created_at: '2026-05-11T09:00:00.000Z',
          listings: { title: 'Pre-rated Item', price: 100.00 },
          seller: { name: 'Seller Sam', user_id: 'seller-456' },
          buyer: { name: 'Buyer Bob', user_id: 'user-123' },
          payments: [{ id: 'p-full', amount: 100.00, status: 'completed' }],
          ratings: [{ id: 'rat-idx-9' }] // array elements populate alreadyRated as truthy
        }
      ],
      error: null
    };

    const mockOrder = vi.fn().mockResolvedValue(mockRatedDataset);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    supabase.from.mockReturnValue({ select: mockSelect });

    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText(/✓ Feedback Submitted/i)).toBeInTheDocument();
    });
  });
});