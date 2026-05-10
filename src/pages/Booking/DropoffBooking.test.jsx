import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DropoffBooking from './DropoffBooking';
import { supabase } from '@/supabase/supabaseClient';

// 1. Mock react-router-dom navigations and state
const mockNavigate = vi.fn();
let mockLocationState = { transactionId: 'tx-123' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockLocationState,
    }),
  };
});

// 2. Mock Supabase Client
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('DropoffBooking Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Explicitly spy on alert so Testing Library matchers recognize the invocation reference
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Lock system time to a guaranteed weekday (Monday) so slot generation is deterministic
    vi.setSystemTime(new Date('2026-05-11T09:00:00.000Z'));

    // Default Auth Success
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'student@wits.ac.za' } },
    });

    // Default Database Chain Implementation (Happy Path)
    supabase.from.mockImplementation((table) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        single: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        // Crucial Fix: update returns its own dedicated object so it doesn't override the main builder's .eq()
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        }), 
      };

      if (table === 'transactions') {
        queryBuilder.single.mockResolvedValue({
          data: {
            id: 'tx-123',
            listing_id: 'list-123',
            buyer_id: 'buyer-123',
            seller_id: 'seller-123',
            total_amount: 450,
          },
          error: null,
        });
        return queryBuilder;
      }

      if (table === 'listings') {
        queryBuilder.single.mockResolvedValue({
          data: { id: 'list-123', title: 'Engineering Textbook', price: 450 },
          error: null,
        });
        return queryBuilder;
      }

      if (table === 'profiles') {
        queryBuilder.single.mockResolvedValue({
          data: { id: 'profile-123', name: 'Blessing' },
          error: null,
        });
        return queryBuilder;
      }

      if (table === 'facility_config') {
        queryBuilder.maybeSingle.mockResolvedValue({
          data: {
            slot_duration_minutes: 30,
            max_capacity_per_slot: 5,
            open_time: '09:00',
            close_time: '17:00',
          },
          error: null,
        });
        return queryBuilder;
      }

      if (table === 'facility_bookings') {
        queryBuilder.in.mockResolvedValue({
          count: 1, // Leaves 4 spots available
          error: null,
        });
        queryBuilder.single.mockResolvedValue({
          data: { id: 'booking-777', booking_date: '2026-05-11T09:00:00.000Z' },
          error: null,
        });
        return queryBuilder;
      }

      if (table === 'notifications') {
        queryBuilder.insert.mockResolvedValue({ data: null, error: null });
        return queryBuilder;
      }

      return queryBuilder;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects to /auth if no user is logged in', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  it('redirects to /basket if no transactionId is in location state or localStorage', async () => {
    mockLocationState = null;
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/basket');
    });
  });

  it('fetches transaction from localStorage if missing from location state', async () => {
    mockLocationState = null;
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('tx-local-999');

    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Transaction Summary')).toBeInTheDocument();
    });
  });

  it('alerts and redirects to /basket on transaction fetch error', async () => {
    // Override transactions to throw an error
    supabase.from.mockImplementationOnce((table) => {
      const qb = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      qb.single = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      return qb;
    });

    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'));
      expect(mockNavigate).toHaveBeenCalledWith('/basket');
    });
  });

  it('loads available slots, allows slot selection, and successfully submits a booking', async () => {
    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/spots available/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Engineering Textbook')).toBeInTheDocument();

    const bookBtn = screen.getByRole('button', { name: /Confirm Drop-off Slot/i });
    expect(bookBtn).toBeDisabled();

    const firstSlotCard = screen.getAllByText(/spots available/i)[0].closest('.slot-card');
    fireEvent.click(firstSlotCard);

    await waitFor(() => {
      expect(bookBtn).not.toBeDisabled();
    });

    fireEvent.click(bookBtn);

    await waitFor(() => {
      expect(screen.getByText('Drop-off Slot Booked!')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View My Transactions'));
    expect(mockNavigate).toHaveBeenCalledWith('/history');

    fireEvent.click(screen.getByText('Continue Shopping'));
    expect(mockNavigate).toHaveBeenCalledWith('/basket');
  });

  it('renders no slots state when capacity is fully booked', async () => {
    supabase.from.mockImplementation((table) => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), 
        single: vi.fn().mockResolvedValue({
          data: { id: 'tx-123', listing_id: 'list-123' },
          error: null
        })
      };
      if (table === 'facility_bookings') {
        qb.in.mockResolvedValue({ count: 5, error: null });
      }
      return qb;
    });

    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No available slots found for the next 7 days')).toBeInTheDocument();
    });
  });

  it('navigates back when the back button is clicked', async () => {
    render(
      <MemoryRouter>
        <DropoffBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Back'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});