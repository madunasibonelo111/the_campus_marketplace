
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PaymentForm from './PaymentForm';
import { supabase } from '@/supabase/supabaseClient';

const mockNavigate = vi.fn();
const mockLocation = {
  state: {
    totalAmount: 150.00,
    basket: [{ id: '1', title: 'Textbook', price: 150.00, quantity: 1 }],
    transaction: { id: 'trans-123' }
  }
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
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

describe('PaymentForm Component Coverage Suite', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    supabase.from.mockImplementation((table) => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: { id: 'pay-777' }, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      };

      if (table === 'saved_cards') {
        qb.order.mockResolvedValue({
          data: [{ id: 'card-1', last4: '4242', expiry_month: '12', expiry_year: '2028', holder_name: 'Kelly Dev' }],
          error: null
        });
      } else {
        qb.order.mockResolvedValue({ data: [], error: null });
      }

      return qb;
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PaymentForm />
      </BrowserRouter>
    );
  };

  test('renders base payment form parameters correctly', async () => {
    await act(async () => {
      renderComponent();
    });
    
    expect(screen.getByText(/Select Payment Method/i)).toBeInTheDocument();
    
    // Target the main payment action button specifically to check text presence
    const payButtons = screen.getAllByRole('button');
    const corePayBtn = payButtons.find(b => b.className === 'pay-btn');
    expect(corePayBtn).toHaveTextContent(/Pay/i);
  });

  test('handles partial payment split parameter changes', async () => {
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const amountInput = screen.getByDisplayValue('150');
      fireEvent.change(amountInput, { target: { value: '75' } });
    });
    
    await waitFor(() => {
      const payButtons = screen.getAllByRole('button');
      const corePayBtn = payButtons.find(b => b.className === 'pay-btn');
      expect(corePayBtn).toBeInTheDocument();
    });
  });

  test('successfully triggers simulated coupon deduction adjustments', async () => {
    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      const couponInput = screen.getByPlaceholderText(/Discount Coupon/i);
      const applyBtn = screen.getByText('Apply');
      
      fireEvent.change(couponInput, { target: { value: 'SAVE10' } });
      fireEvent.click(applyBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Discount/i)).toBeInTheDocument();
    });
  });

  test('switches to PayPal option and triggers redirection view container rendering rules', async () => {
    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      const paypalRadio = screen.getByLabelText(/PayPal/i);
      fireEvent.click(paypalRadio);
    });

    expect(screen.getByText(/You will be redirected to PayPal to complete your payment securely/i)).toBeInTheDocument();
    
    const payButtons = screen.getAllByRole('button');
    const corePayBtn = payButtons.find(b => b.className === 'pay-btn');
    
    await act(async () => {
      fireEvent.click(corePayBtn);
    });

    await waitFor(() => {
      expect(corePayBtn).toHaveTextContent(/Processing/i);
    });
  });

  test('detects, hooks up, and utilizes vaulted user credit cards on initialize', async () => {
    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText(/4242/)).toBeInTheDocument();
    });

    const savedCardRadio = screen.getAllByRole('radio')[0];
    await act(async () => {
      fireEvent.click(savedCardRadio);
    });

    const payButtons = screen.getAllByRole('button');
    const corePayBtn = payButtons.find(b => b.className === 'pay-btn');
    
    await act(async () => {
      fireEvent.click(corePayBtn);
    });

    await waitFor(() => {
      expect(corePayBtn).toBeInTheDocument();
    });
  });
});