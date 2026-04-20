
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

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

import PaymentForm from './PaymentForm';
import { supabase } from '@/supabase/supabaseClient';

describe('PaymentForm Component', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    mockNavigate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PaymentForm />
      </BrowserRouter>
    );
  };

  test('renders payment form with order summary', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Complete Payment')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  test('renders payment methods', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Credit / Debit Card')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
    });
  });

  test('renders discount coupon input', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Discount Coupon (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
  });

  test('applies valid discount code', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const discountInput = screen.getByPlaceholderText('Discount Coupon (Optional)');
    const applyButton = screen.getByText('Apply');
    
    fireEvent.change(discountInput, { target: { value: 'SAVE10' } });
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Discount applied! 10% off');
    });
  });

  test('shows error for invalid discount code', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const discountInput = screen.getByPlaceholderText('Discount Coupon (Optional)');
    const applyButton = screen.getByText('Apply');
    
    fireEvent.change(discountInput, { target: { value: 'INVALID' } });
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Invalid coupon code');
    });
  });

  test('formats card number with spaces', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const cardNumberInput = screen.getByPlaceholderText('Card Number');
    fireEvent.change(cardNumberInput, { target: { value: '4242424242424242' } });
    expect(cardNumberInput.value).toBe('4242 4242 4242 4242');
  });

  test('formats expiry date with slash', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const expiryInput = screen.getByPlaceholderText('Expiry date (MM/YY)');
    fireEvent.change(expiryInput, { target: { value: '1225' } });
    expect(expiryInput.value).toBe('12/25');
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

  test('renders saved cards when available', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockSavedCards = [
      {
        id: 'card-1',
        card_brand: 'Visa',
        last4: '4242',
        expiry_month: '12',
        expiry_year: '25',
        is_default: true,
        card_holder_name: 'TEST USER'
      }
    ];
    
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSavedCards, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Saved Cards')).toBeInTheDocument();
    });
  });

  test('validates card details before processing', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const payButton = screen.getByText('Pay R150.00');
    fireEvent.click(payButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please fill in all card details')).toBeInTheDocument();
    });
  });

  test('shows error when payment amount is zero', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const amountInput = screen.getByDisplayValue('150');
    fireEvent.change(amountInput, { target: { value: '0' } });
    
    const payButton = screen.getByText('Pay R0.00');
    fireEvent.click(payButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid payment amount')).toBeInTheDocument();
    });
  });

  test('shows error when payment amount exceeds total', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const amountInput = screen.getByDisplayValue('150');
    fireEvent.change(amountInput, { target: { value: '200' } });
    
    const payButton = screen.getByText('Pay R200.00');
    fireEvent.click(payButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment amount cannot exceed total price')).toBeInTheDocument();
    });
  });

  test('displays saved card when available', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockSavedCards = [
      {
        id: 'card-1',
        card_brand: 'Visa',
        last4: '4242',
        expiry_month: '12',
        expiry_year: '25',
        is_default: true,
        card_holder_name: 'TEST USER'
      }
    ];
    
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSavedCards, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Saved Cards')).toBeInTheDocument();
      expect(screen.getAllByText('Visa').length).toBeGreaterThan(0);
      expect(screen.getByText('**** **** **** 4242')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  test('switches to PayPal payment method', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    const paypalRadio = screen.getByText('PayPal');
    fireEvent.click(paypalRadio);
    
    await waitFor(() => {
      expect(screen.getByText('You will be redirected to PayPal to complete your payment securely.')).toBeInTheDocument();
    });
  });

  test('changes to different card from saved card', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockSavedCards = [
      {
        id: 'card-1',
        card_brand: 'Visa',
        last4: '4242',
        expiry_month: '12',
        expiry_year: '25',
        is_default: true,
        card_holder_name: 'TEST USER'
      }
    ];
    
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSavedCards, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const changeButton = screen.getByText('Use different card');
      fireEvent.click(changeButton);
      expect(screen.getByPlaceholderText('Card Holder Name')).toBeInTheDocument();
    });
  });

  test('save card checkbox can be checked', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const saveCardCheckbox = screen.getByText('Save this card for future payments');
      const checkbox = saveCardCheckbox.querySelector('input');
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  test('allows changing payment amount', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const amountInput = screen.getByDisplayValue('150');
      fireEvent.change(amountInput, { target: { value: '75' } });
      expect(amountInput.value).toBe('75');
    });
  });

  test('accepts card number input', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cardNumberInput = screen.getByPlaceholderText('Card Number');
      fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });
      expect(cardNumberInput.value).toBe('4111 1111 1111 1111');
    });
  });

  test('accepts CVV input', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cvvInput = screen.getByPlaceholderText('CVV');
      fireEvent.change(cvvInput, { target: { value: '123' } });
      expect(cvvInput.value).toBe('123');
    });
  });

  test('accepts card holder name input', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const holderNameInput = screen.getByPlaceholderText('Card Holder Name');
      fireEvent.change(holderNameInput, { target: { value: 'John Doe' } });
      expect(holderNameInput.value).toBe('John Doe');
    });
  });

  test('shows alert for empty discount code', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      expect(global.alert).toHaveBeenCalledWith('Please enter a coupon code');
    });
  });

  test('displays multiple saved cards when available', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockSavedCards = [
      {
        id: 'card-1',
        card_brand: 'Visa',
        last4: '4242',
        expiry_month: '12',
        expiry_year: '25',
        is_default: true,
        card_holder_name: 'TEST USER'
      },
      {
        id: 'card-2',
        card_brand: 'Mastercard',
        last4: '5555',
        expiry_month: '10',
        expiry_year: '26',
        is_default: false,
        card_holder_name: 'TEST USER'
      }
    ];
    
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSavedCards, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Saved Cards')).toBeInTheDocument();
      expect(screen.getAllByText('Visa').length).toBeGreaterThan(0);
      expect(screen.getByText('Mastercard')).toBeInTheDocument();
      expect(screen.getByText('**** **** **** 4242')).toBeInTheDocument();
      expect(screen.getByText('**** **** **** 5555')).toBeInTheDocument();
    });
  });

  test('CVV input has maxlength of 4', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cvvInput = screen.getByPlaceholderText('CVV');
      expect(cvvInput).toHaveAttribute('maxlength', '4');
    });
  });

  test('detects Visa card brand from number', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cardNumberInput = screen.getByPlaceholderText('Card Number');
      fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });
      expect(cardNumberInput.value).toBe('4111 1111 1111 1111');
    });
  });

  test('detects Mastercard brand from number', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cardNumberInput = screen.getByPlaceholderText('Card Number');
      fireEvent.change(cardNumberInput, { target: { value: '5555555555554444' } });
      expect(cardNumberInput.value).toBe('5555 5555 5555 4444');
    });
  });

  test('detects Amex brand from number', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cardNumberInput = screen.getByPlaceholderText('Card Number');
      fireEvent.change(cardNumberInput, { target: { value: '378282246310005' } });
      expect(cardNumberInput.value).toBe('3782 8224 6310 005');
    });
  });

  test('detects Discover brand from number', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cardNumberInput = screen.getByPlaceholderText('Card Number');
      fireEvent.change(cardNumberInput, { target: { value: '6011111111111117' } });
      expect(cardNumberInput.value).toBe('6011 1111 1111 1117');
    });
  });

  test('handles error fetching saved cards gracefully', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    });
  });

  test('validates card expiry date with invalid month (13)', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const holderName = screen.getByPlaceholderText('Card Holder Name');
      const cardNumber = screen.getByPlaceholderText('Card Number');
      const expiry = screen.getByPlaceholderText('Expiry date (MM/YY)');
      const cvv = screen.getByPlaceholderText('CVV');
      
      fireEvent.change(holderName, { target: { value: 'Test User' } });
      fireEvent.change(cardNumber, { target: { value: '4242424242424242' } });
      fireEvent.change(expiry, { target: { value: '13/25' } });
      fireEvent.change(cvv, { target: { value: '123' } });
    });
    
    await waitFor(() => {
      const payButton = screen.getByText('Pay R150.00');
      fireEvent.click(payButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Card has expired')).toBeInTheDocument();
    });
  });

  test('handles credit card number formatting with existing spaces', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const cardNumberInput = screen.getByPlaceholderText('Card Number');
      fireEvent.change(cardNumberInput, { target: { value: '4111 1111 1111 1111' } });
      expect(cardNumberInput.value).toBe('4111 1111 1111 1111');
    });
  });

  test('handles discount code with empty string', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const discountInput = screen.getByPlaceholderText('Discount Coupon (Optional)');
      const applyButton = screen.getByText('Apply');
      
      fireEvent.change(discountInput, { target: { value: '' } });
      fireEvent.click(applyButton);
      
      expect(global.alert).toHaveBeenCalledWith('Please enter a coupon code');
    });
  });

  test('shows correct button text when not processing', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const payButton = screen.getByText('Pay R150.00');
      expect(payButton).toBeInTheDocument();
      expect(payButton).not.toBeDisabled();
    });
  });

  test('displays discount in order summary when applied', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const discountInput = screen.getByPlaceholderText('Discount Coupon (Optional)');
      const applyButton = screen.getByText('Apply');
      
      fireEvent.change(discountInput, { target: { value: 'SAVE10' } });
      fireEvent.click(applyButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Discount (10%)')).toBeInTheDocument();
      expect(screen.getByText('-R15.00')).toBeInTheDocument();
    });
  });

  test('handles partial payment amount change', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({ select: mockSelect });
    
    await act(async () => {
      renderComponent();
    });
    
    await waitFor(() => {
      const amountInput = screen.getByDisplayValue('150');
      fireEvent.change(amountInput, { target: { value: '50' } });
      expect(amountInput.value).toBe('50');
      const payButton = screen.getByText('Pay R50.00');
      expect(payButton).toBeInTheDocument();
    });
  });
});