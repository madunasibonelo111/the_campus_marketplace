
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

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
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import TransactionHistory from './TransactionHistory';
import { supabase } from '@/supabase/supabaseClient';

describe('TransactionHistory Component', () => {
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
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const pendingPromise = new Promise(() => {});
    const mockOrder = vi.fn().mockReturnValue(pendingPromise);
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    renderComponent();
    
    expect(screen.getByText('Loading transaction history...')).toBeInTheDocument();
  });

  test('renders transaction history after loading', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockTransactions = {
      data: [
        {
          id: 'trans-1',
          buyer_id: 'user-123',
          seller_id: 'user-456',
          type: 'purchase',
          status: 'completed',
          created_at: '2024-01-15T10:00:00Z',
          offer_amount: 150.00,
          listings: {
            title: 'Textbook',
            price: 150.00,
            listing_type: 'sale'
          },
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
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });
  });

  test('shows empty state when no transactions', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('No transactions found')).toBeInTheDocument();
    });
  });

  test('redirects to auth when no user', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  test('displays partial payment badge', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockTransactions = {
      data: [
        {
          id: 'trans-2',
          buyer_id: 'user-123',
          seller_id: 'user-456',
          type: 'purchase',
          status: 'partial_payment',
          created_at: '2024-01-20T14:30:00Z',
          offer_amount: 200.00,
          listings: { title: 'Laptop', price: 200.00, listing_type: 'sale' },
          payments: [{ id: 'pay-2', amount: 100.00, method: 'card', status: 'partial' }]
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
      const partialElements = screen.getAllByText('Partial Payment');
      expect(partialElements.length).toBeGreaterThan(0);
    });
  });

  test('filters to show only purchases', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockTransactions = {
      data: [
        {
          id: 'trans-1',
          buyer_id: 'user-123',
          seller_id: 'user-456',
          type: 'purchase',
          status: 'completed',
          created_at: '2024-01-15T10:00:00Z',
          offer_amount: 150.00,
          listings: { title: 'Textbook', price: 150.00, listing_type: 'sale' },
          payments: []
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
      const purchasesFilter = screen.getByText('🛒 Purchases');
      fireEvent.click(purchasesFilter);
      expect(screen.getByText('Textbook')).toBeInTheDocument();
    });
  });

  test('opens transaction details modal', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockTransactions = {
      data: [
        {
          id: 'trans-1',
          buyer_id: 'user-123',
          seller_id: 'user-456',
          type: 'purchase',
          status: 'completed',
          created_at: '2024-01-15T10:00:00Z',
          offer_amount: 150.00,
          listings: { title: 'Textbook', price: 150.00, listing_type: 'sale' },
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
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') });
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load transactions/)).toBeInTheDocument();
    });
  });
});