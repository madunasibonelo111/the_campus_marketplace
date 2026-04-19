// src/pages/Payments/PaymentStatusTracker.test.jsx
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
    from: vi.fn(),
  },
}));

import PaymentStatusTracker from './PaymentStatusTracker';
import { supabase } from '@/supabase/supabaseClient';

describe('PaymentStatusTracker Component', () => {
  const mockTransactionId = 'trans-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PaymentStatusTracker transactionId={mockTransactionId} />
      </BrowserRouter>
    );
  };

  test('renders loading state initially', () => {
    const pendingPromise = new Promise(() => {});
    const mockSingle = vi.fn().mockReturnValue(pendingPromise);
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    renderComponent();
    
    expect(screen.getByText('Loading payment status...')).toBeInTheDocument();
  });

  test('displays payment status with complete payment', async () => {
    const mockTransaction = {
      data: {
        total_amount: 150.00,
        amount_paid: 150.00,
        remaining_balance: 0,
        status: 'completed'
      },
      error: null
    };
    
    const mockPayments = {
      data: [
        {
          id: 'pay-1',
          amount: 150.00,
          method: 'card',
          status: 'completed',
          created_at: '2024-01-15T10:00:00Z'
        }
      ],
      error: null
    };
    
    const mockSingle = vi.fn().mockResolvedValue(mockTransaction);
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    const mockOrder = vi.fn().mockResolvedValue(mockPayments);
    const mockPaymentsEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ eq: mockPaymentsEq });
    
    supabase.from.mockImplementation((table) => {
      if (table === 'transactions') {
        return { select: mockSelect };
      }
      return { select: mockPaymentsSelect };
    });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Payment Status')).toBeInTheDocument();
      // Use regex to match with or without spaces
      expect(screen.getByText(/Total Amount:/)).toBeInTheDocument();
      expect(screen.getByText(/Total Paid:/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining Balance:/)).toBeInTheDocument();
    });
  });

  test('displays payment status with partial payment', async () => {
    const mockTransaction = {
      data: {
        total_amount: 200.00,
        amount_paid: 100.00,
        remaining_balance: 100.00,
        status: 'partial_payment'
      },
      error: null
    };
    
    const mockPayments = {
      data: [
        {
          id: 'pay-1',
          amount: 100.00,
          method: 'card',
          status: 'partial',
          created_at: '2024-01-15T10:00:00Z'
        }
      ],
      error: null
    };
    
    const mockSingle = vi.fn().mockResolvedValue(mockTransaction);
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    const mockOrder = vi.fn().mockResolvedValue(mockPayments);
    const mockPaymentsEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ eq: mockPaymentsEq });
    
    supabase.from.mockImplementation((table) => {
      if (table === 'transactions') {
        return { select: mockSelect };
      }
      return { select: mockPaymentsSelect };
    });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Remaining Balance:/)).toBeInTheDocument();
      expect(screen.getByText('Make Additional Payment')).toBeInTheDocument();
    });
  });

  test('displays payment history for multiple payments', async () => {
    const mockTransaction = {
      data: {
        total_amount: 300.00,
        amount_paid: 300.00,
        remaining_balance: 0,
        status: 'completed'
      },
      error: null
    };
    
    const mockPayments = {
      data: [
        {
          id: 'pay-1',
          amount: 100.00,
          method: 'card',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'pay-2',
          amount: 100.00,
          method: 'paypal',
          created_at: '2024-01-16T10:00:00Z'
        },
        {
          id: 'pay-3',
          amount: 100.00,
          method: 'card',
          created_at: '2024-01-17T10:00:00Z'
        }
      ],
      error: null
    };
    
    const mockSingle = vi.fn().mockResolvedValue(mockTransaction);
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    const mockOrder = vi.fn().mockResolvedValue(mockPayments);
    const mockPaymentsEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ eq: mockPaymentsEq });
    
    supabase.from.mockImplementation((table) => {
      if (table === 'transactions') {
        return { select: mockSelect };
      }
      return { select: mockPaymentsSelect };
    });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Payment History')).toBeInTheDocument();
      expect(screen.getByText('Payment #1')).toBeInTheDocument();
      expect(screen.getByText('Payment #2')).toBeInTheDocument();
      expect(screen.getByText('Payment #3')).toBeInTheDocument();
    });
  });

  test('shows progress bar with correct percentage', async () => {
    const mockTransaction = {
      data: {
        total_amount: 200.00,
        amount_paid: 150.00,
        remaining_balance: 50.00,
        status: 'partial_payment'
      },
      error: null
    };
    
    const mockPayments = {
      data: [
        {
          id: 'pay-1',
          amount: 150.00,
          method: 'card',
          created_at: '2024-01-15T10:00:00Z'
        }
      ],
      error: null
    };
    
    const mockSingle = vi.fn().mockResolvedValue(mockTransaction);
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    const mockOrder = vi.fn().mockResolvedValue(mockPayments);
    const mockPaymentsEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ eq: mockPaymentsEq });
    
    supabase.from.mockImplementation((table) => {
      if (table === 'transactions') {
        return { select: mockSelect };
      }
      return { select: mockPaymentsSelect };
    });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('75% Complete')).toBeInTheDocument();
    });
  });

  test('handles error when fetching payment status fails', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Unable to load payment status')).toBeInTheDocument();
    });
  });

  test('navigates to payment page when clicking make additional payment', async () => {
    const mockTransaction = {
      data: {
        total_amount: 200.00,
        amount_paid: 100.00,
        remaining_balance: 100.00,
        status: 'partial_payment'
      },
      error: null
    };
    
    const mockPayments = {
      data: [
        {
          id: 'pay-1',
          amount: 100.00,
          method: 'card',
          created_at: '2024-01-15T10:00:00Z'
        }
      ],
      error: null
    };
    
    const mockSingle = vi.fn().mockResolvedValue(mockTransaction);
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    const mockOrder = vi.fn().mockResolvedValue(mockPayments);
    const mockPaymentsEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ eq: mockPaymentsEq });
    
    supabase.from.mockImplementation((table) => {
      if (table === 'transactions') {
        return { select: mockSelect };
      }
      return { select: mockPaymentsSelect };
    });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const payButton = screen.getByText('Make Additional Payment');
      fireEvent.click(payButton);
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
  
});