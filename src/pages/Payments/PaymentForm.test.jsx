import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PaymentForm from './PaymentForm';
import { supabase } from '@/supabase/supabaseClient';
import React from 'react';

const mockNavigate = vi.fn();
const mockLocation = {
  state: {
    totalAmount: 150.00,
    basket: [{ id: '1', title: 'Textbook', price: 150.00, quantity: 1 }],
    transaction: { id: 'trans-123', total_amount: 150.00, amount_paid: 0 }
  }
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ ...mockLocation }),
  };
});

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      // Mock the nested return structure: { data: { user: ... } }
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'user-123' } }, 
        error: null 
      }),
    },
    from: vi.fn(),
  },
}));

describe('PaymentForm Component Coverage Suite', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a chainable mock object
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'some-id' }, error: null }),
      single: vi.fn().mockResolvedValue({ 
        data: { id: 'p-999', booking_date: '2026-05-20T10:00:00Z' }, 
        error: null 
      }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(), // Added chain support
    };

    supabase.from.mockImplementation(() => mockChain);
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } }, 
      error: null 
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PaymentForm />
      </BrowserRouter>
    );
  };

  test('renders base payment form with initialized pricing totals safely', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Complete Payment/i)).toBeInTheDocument();
    });
  });

  test('equivalence partition valid: processes workflow normally when input matches the exact balance due', async () => {
    const { container } = renderComponent();
    
    await waitFor(() => {
      expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
    });

    const amountInput = container.querySelector('input[type="number"]');
    
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: 150.00 } });
    });

    const payBtn = screen.getByRole('button', { name: /Pay R150.00/i });
    expect(payBtn).toBeInTheDocument();
  });

  test('equivalence partition invalid: rejects transaction attempts when input amount is zero or negative', async () => {
    const { container } = renderComponent();
    
    await waitFor(() => {
      expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
    });

    const amountInput = container.querySelector('input[type="number"]');
    
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: -10.00 } });
    });

    const payBtn = screen.getByRole('button', { name: /Pay R-10.00/i });
    
    await act(async () => {
      fireEvent.click(payBtn);
    });

    expect(screen.getByText(/Please enter a valid payment amount/i)).toBeInTheDocument();
  });

  test('boundary check lower limit: confirms split payment system maps at the absolute minimum partial value limit', async () => {
    const { container } = renderComponent();
    
    await waitFor(() => {
      expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
    });

    const amountInput = container.querySelector('input[type="number"]');
    
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: 0.01 } });
    });

    const payBtn = screen.getByRole('button', { name: /Pay R0.01/i });
    expect(payBtn).toBeInTheDocument();
  });

  test('boundary check upper limit: rejects checkout processing if input value exceeds the absolute total balance due limit', async () => {
    const { container } = renderComponent();
    
    await waitFor(() => {
      expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
    });

    const amountInput = container.querySelector('input[type="number"]');
    
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: 150.01 } });
    });

    const payBtn = screen.getByRole('button', { name: /Pay R150.01/i });
    
    await act(async () => {
      fireEvent.click(payBtn);
    });

    expect(screen.getByText(/Payment amount cannot exceed total price/i)).toBeInTheDocument();
  });

  test('executes complete workflow checkout handling when full card configurations are provided', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = renderComponent();

    // allow loading initialization sequence to resolve on real clocks
    await waitFor(() => {
      expect(container.querySelector('input[placeholder="Card Holder Name"]')).toBeInTheDocument();
    });

    const nameInput = container.querySelector('input[placeholder="Card Holder Name"]');
    const cardInput = container.querySelector('input[placeholder="Card Number"]');
    const expiryInput = container.querySelector('input[placeholder="Expiry date (MM/YY)"]');
    const cvvInput = container.querySelector('input[placeholder="CVV"]');
    const amountInput = container.querySelector('input[type="number"]');

    await act(async () => {
      fireEvent.change(amountInput, { target: { value: 150.00 } });
      fireEvent.change(nameInput, { target: { value: 'Khotso Mokoena' } });
      fireEvent.change(cardInput, { target: { value: '4242 4242 4242 4242' } });
      fireEvent.change(expiryInput, { target: { value: '12/29' } });
      fireEvent.change(cvvInput, { target: { value: '123' } });
    });

    // turn on fake clocks right before submission click event to resolve payment latency
    vi.useFakeTimers();

    const payBtn = screen.getByRole('button', { name: /Pay R150.00/i });
    await act(async () => {
      fireEvent.click(payBtn);
    });

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText(/Successful/i)).toBeInTheDocument();
    });
  });
  
  test('handles paypal gateway redirection routines smoothly on selection update toggles', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/PayPal/i)).toBeInTheDocument();
    });

    const paypalRadio = screen.getByLabelText(/PayPal/i);
    await act(async () => {
      fireEvent.click(paypalRadio);
    });

    expect(screen.getByText(/You will be redirected to PayPal to complete your payment securely/i)).toBeInTheDocument();
  });

  test('validates dynamic coupon discount deductions and modifies final amount text labels', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Discount Coupon/i)).toBeInTheDocument();
    });

    const couponInput = screen.getByPlaceholderText(/Discount Coupon/i);
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    await act(async () => {
      fireEvent.change(couponInput, { target: { value: 'SAVE10' } });
      fireEvent.click(applyBtn);
    });

    expect(window.alert).toHaveBeenCalledWith('Discount applied! 10% off');
    expect(screen.getByRole('button', { name: /Pay R135.00/i })).toBeInTheDocument();
  });

  test('triggers shortfall warning when payment amount is less than total price', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();

    // 1. Get elements
    const amountInput = await screen.findByRole('spinbutton');
    const nameInput = screen.getByPlaceholderText('Card Holder Name');
    const cardInput = screen.getByPlaceholderText('Card Number');
    const expiryInput = screen.getByPlaceholderText('Expiry date (MM/YY)');
    const cvvInput = screen.getByPlaceholderText('CVV');

    // 2. Perform actions: Input a partial amount (100) for a 150 total
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '100.00' } });
      fireEvent.change(nameInput, { target: { value: 'Khotso Mokoena' } });
      fireEvent.change(cardInput, { target: { value: '4242 4242 4242 4242' } });
      fireEvent.change(expiryInput, { target: { value: '12/29' } });
      fireEvent.change(cvvInput, { target: { value: '123' } });
    });

    const payBtn = screen.getByRole('button', { name: /Pay R100.00/i });
    
    // 3. Click pay and wait for the async processPayment to resolve
    await act(async () => {
      fireEvent.click(payBtn);
    });

    // 4. Increase timeout to wait for the 1500ms gateway delay inside PaymentForm
    await waitFor(() => {
      // Look for the specific H2 header rendered when shortfallInfo exists
      expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/Payment Balance Recorded/i);
      expect(screen.getByText(/Remaining Balance Owed:/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
  
});