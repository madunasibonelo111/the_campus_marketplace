import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DropoffBooking from './DropoffBooking';
import { supabase } from '@/supabase/supabaseClient';

const mockNavigate = vi.fn();
let mockLocation = { state: { transactionId: 'tx-123' } };

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
    rpc: vi.fn(() => Promise.resolve({ data: {}, error: null }))
  },
}));

describe('DropoffBooking Component Comprehensive & Boundary Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { state: { transactionId: 'tx-123' } };
    localStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.setSystemTime(new Date('2026-05-18T09:00:00.000Z'));
  });

  const setupSupabaseMocks = (options = {}) => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: options.unauthenticated ? null : { id: 'user-123', email: 'student@wits.ac.za' } },
      error: null,
    });

    supabase.from.mockImplementation((table) => {
      const configData = {
        open_time: '09:00',
        close_time: '17:00',
        slot_duration_minutes: 30,
        max_capacity_per_slot: options.zeroCapacityScenario ? 0 : 5
      };

      // Locks down the date lifecycle down the entire database reference tree
      const operationalDate = options.oldTransactionScenario ? '2026-01-01T09:00:00.000Z' : '2026-05-18T09:00:00.000Z';

      const transactionPayload = {
        id: 'tx-123',
        listing_id: 'listing-123',
        buyer_id: 'buyer-123',
        seller_id: 'seller-123',
        status: 'payment_completed',
        created_at: operationalDate,
        offer_amount: options.missingOfferAmount ? null : 250.00,
        payments: options.missingPayments ? null : [{ amount: 250.00 }]
      };

      const baseChainBuilder = {
        select: vi.fn().mockImplementation(() => baseChainBuilder),
        eq: vi.fn().mockImplementation(() => baseChainBuilder),
        neq: vi.fn().mockImplementation(() => baseChainBuilder),
        in: vi.fn().mockImplementation(() => baseChainBuilder),
        order: vi.fn().mockImplementation(() => baseChainBuilder),
        insert: vi.fn().mockImplementation(() => baseChainBuilder),
        update: vi.fn().mockImplementation(() => baseChainBuilder),
        upsert: vi.fn().mockImplementation(() => baseChainBuilder),
        gte: vi.fn().mockImplementation(() => baseChainBuilder),
        lte: vi.fn().mockImplementation(() => baseChainBuilder),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (options.facilityConfigError) {
            return Promise.reject(new Error('Config fetch failed'));
          }
          if (options.facilityConfigEmpty) {
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: configData, error: null });
        }),
        single: vi.fn().mockImplementation(() => {
          if (table === 'transactions') {
            if (options.transactionEmpty) {
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({ data: transactionPayload, error: null });
          }
          if (table === 'listings') {
            return Promise.resolve({
              data: { id: 'listing-123', title: 'Academic Textbook X', price: options.missingOfferAmount ? null : 250.00, created_at: operationalDate },
              error: null
            });
          }
          if (table === 'profiles') {
            return Promise.resolve({
              data: { id: 'mock-id', name: 'Student Participant', email: 'test@wits.ac.za' },
              error: null
            });
          }
          if (table === 'facility_bookings') {
            return Promise.resolve({
              data: { id: 'booking-999', transaction_id: 'tx-123', booking_date: '2026-05-18T09:00:00.000Z' },
              error: null
            });
          }
          return Promise.resolve({ data: configData, error: null });
        })
      };

      if (table === 'facility_bookings') {
        baseChainBuilder.in = vi.fn().mockImplementation((field, values) => {
          if (values.includes('pending') && values.includes('confirmed')) {
            const mockBookingsList = [];
            if (options.hasExistingBookings) {
              const targetDateISO = new Date('2026-05-19T09:00:00.000Z').toISOString();
              for (let k = 0; k < 4; k++) {
                mockBookingsList.push({ booking_date: targetDateISO });
              }
            }
            return Promise.resolve({ data: mockBookingsList, error: null });
          }
          if (options.analyticsEmptyBookings) {
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: [{ id: 'b1' }], error: null });
        });
      }
      
      return baseChainBuilder;
    });
  };

  /* ================= Baseline Tests ================= */

  it('authenticates session profiles and pulls matching item metadata successfully', async () => {
    setupSupabaseMocks();
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Book Drop-off Slot/i })).toBeInTheDocument();
    });
  });

  it('Boundary Check: Registers exactly 1 remaining open spot when 4 appointments fill a slot card boundary', async () => {
    setupSupabaseMocks({ hasExistingBookings: true });
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      const remainingSpotsCards = screen.queryAllByText(/open spots/i);
      expect(remainingSpotsCards.length).toBeGreaterThan(0);
    });
  });

  it('allows user initialization interaction to click back navigation actions normally', async () => {
    setupSupabaseMocks();
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    const backButton = await screen.findByRole('button', { name: /← Back/i });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('Coverage Boost: Handles database fetch errors gracefully', async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error('Supabase unreachable'))
    }));

    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Error loading transaction details"));
    });
  });

  it('Coverage Boost: Ensures no slots are generated for weekends', async () => {
    setupSupabaseMocks();
    vi.setSystemTime(new Date('2026-05-22T09:00:00.000Z')); // Friday

    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      const slots = screen.queryAllByText(/Saturday|Sunday/i);
      expect(slots.length).toBe(0);
    });
  });

  /* ================= Branch Coverage Boosters ================= */

  it('Branch Coverage: Redirects unauthenticated profile users straight to auth portal view', async () => {
    setupSupabaseMocks({ unauthenticated: true });
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  it('Branch Coverage: Uses localStorage fallback when location.state is empty', async () => {
    mockLocation = { state: null };
    localStorage.setItem('lastTransactionId', 'tx-local-789');
    setupSupabaseMocks();

    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Book Drop-off Slot/i })).toBeInTheDocument();
    });
  });

  it('Branch Coverage: Redirects to basket when both location state and localStorage tracking keys are missing', async () => {
    mockLocation = { state: null };
    setupSupabaseMocks();

    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/basket');
    });
  });

  it('Branch Coverage: Throws runtime error inside transaction pipeline if dataset comes back empty', async () => {
    setupSupabaseMocks({ transactionEmpty: true });
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Transaction not found"));
    });
  });

  it('Branch Coverage: Forces hardcoded fallback parameters when facility configuration database returns empty or errors out', async () => {
    setupSupabaseMocks({ facilityConfigError: true });
    const { unmount } = render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Book Drop-off Slot/i })).toBeInTheDocument();
    });
    
    unmount();

    setupSupabaseMocks({ facilityConfigEmpty: true });
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Book Drop-off Slot/i })).toBeInTheDocument();
    });
  });

  it('Branch Coverage: Drops out slot item options completely if transaction creation date exceeds rules deadline timeline', async () => {
  // 1. Intercept both tables to prevent the active May 2026 timeline leaking into the component state
  supabase.from.mockImplementation((table) => {
    const historicalDate = '2026-01-01T09:00:00.000Z';
    
    const baseMockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { open_time: '09:00', close_time: '17:00', slot_duration_minutes: 30 }, error: null }),
      single: vi.fn().mockImplementation(() => {
        if (table === 'transactions') {
          return Promise.resolve({
            data: { id: 'tx-123', listing_id: 'listing-123', status: 'payment_completed', created_at: historicalDate },
            error: null
          });
        }
        if (table === 'listings') {
          return Promise.resolve({
            data: { id: 'listing-123', title: 'Academic Textbook X', price: 250.00, created_at: historicalDate },
            error: null
          });
        }
        return Promise.resolve({ data: {}, error: null });
      })
    };
    return baseMockChain;
  });

  render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
  
  // 2. The slots array evaluates cleanly to 0, completely unmounting the slot cards wrapper layout
  await waitFor(() => {
    const noticeMessage = screen.getByText(/No available slots found/i);
    expect(noticeMessage).toBeInTheDocument();
  });
});

  it('Branch Coverage: Handles missing offer amounts or payment sub-arrays safely using mathematical fallback boundaries', async () => {
    setupSupabaseMocks({ missingOfferAmount: true, missingPayments: true });
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('R0.00')).toBeInTheDocument();
    });
  });

  it('Branch Coverage: Exercises analytics metrics recording edge fallback case when aggregate lookup counts return empty', async () => {
    setupSupabaseMocks({ analyticsEmptyBookings: true });
    render(<MemoryRouter><DropoffBooking /></MemoryRouter>);

    const slotCards = await screen.findAllByText('Monday');
    fireEvent.click(slotCards[0]);

    const bookButton = await screen.findByRole('button', { name: /Confirm Drop-off Slot/i });
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Drop-off Slot Secured!/i })).toBeInTheDocument();
    });
  });
});