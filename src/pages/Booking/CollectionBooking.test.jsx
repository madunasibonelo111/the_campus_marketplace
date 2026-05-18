import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from 'react-router-dom';
import CollectionBooking from './CollectionBooking';
import { supabase } from "@/supabase/supabaseClient";

const mockNavigate = vi.fn();
let mockLocationState = { transactionId: 'tx-456' };

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

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: {}, error: null }))
  }
}));

describe("CollectionBooking Comprehensive & Boundary Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = { transactionId: 'tx-456' };
    localStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.setSystemTime(new Date('2026-05-18T09:00:00.000Z'));
  });

  const setupCollectionMocks = (options = {}) => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: options.unauthenticated ? null : { user: { id: 'buyer-789', email: 'buyer@wits.ac.za' } } },
      error: null
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: options.unauthenticated ? null : { id: 'buyer-789' } },
      error: null
    });

    supabase.from.mockImplementation((table) => {
      const configData = {
        open_time: '09:00',
        close_time: options.zeroDurationScenario ? '09:00' : '17:00',
        slot_duration_minutes: 30,
        max_capacity_per_slot: options.zeroCapacityScenario ? 0 : 5
      };

      const transactionPayload = {
        id: 'tx-456',
        total_amount: options.isFreeItem ? 0.00 : 350.00,
        status: 'item_in_custody',
        offer_amount: options.isFreeItem ? 0.00 : 350.00,
        listings: { title: 'Engineering Graphics Tool', price: options.isFreeItem ? 0.00 : 350.00 },
        seller: { name: 'Thabo Mbeki' }
      };

      const mockBookingsList = [];
      const targetSlotISO = new Date('2026-05-18T09:00:00.000Z').toISOString();
      if (options.atMaxCapacity) {
        for (let k = 0; k < 5; k++) {
          mockBookingsList.push({ booking_date: targetSlotISO });
        }
      }

      const qb = {
        select: vi.fn().mockImplementation(() => qb),
        eq: vi.fn().mockImplementation(() => qb),
        neq: vi.fn().mockImplementation(() => qb),
        order: vi.fn().mockImplementation(() => qb),
        limit: vi.fn().mockImplementation(() => qb),
        insert: vi.fn().mockImplementation(() => qb),
        update: vi.fn().mockImplementation(() => qb),
        gte: vi.fn().mockImplementation(() => qb),
        lte: vi.fn().mockImplementation(() => qb),
        upsert: vi.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (table === 'facility_bookings') {
            if (options.missingDropoffBooking) {
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({ data: { booking_date: '2026-05-17T09:00:00.000Z' }, error: null });
          }
          return Promise.resolve({ data: configData, error: null });
        }),
        single: vi.fn().mockImplementation(() => {
          if (table === 'transactions') {
            return Promise.resolve({ data: transactionPayload, error: null });
          }
          if (table === 'facility_bookings') {
            return Promise.resolve({ data: { id: 'booking-777', booking_date: targetSlotISO }, error: null });
          }
          return Promise.resolve({ data: configData, error: null });
        }),
        in: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: mockBookingsList, error: null });
        })
      };

      return qb;
    });
  };

  /* ================= Existing Tests ================= */

  test("renders the base collection booking interface and matching metadata", async () => {
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Schedule Buyer Collection')).toBeInTheDocument();
      expect(screen.getByText('Engineering Graphics Tool')).toBeInTheDocument();
    });
  });

  test("handles authorization fallback by routing unauthenticated profile sessions back to login screen", async () => {
    setupCollectionMocks({ unauthenticated: true });
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  test("redirects to transaction history catalog if state indicators reveal empty parameter passing", async () => {
    mockLocationState = null;
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/history');
    });
  });

  test("Boundary Check: Handles free items (R0.00) financial edge condition gracefully", async () => {
    setupCollectionMocks({ isFreeItem: true });
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('R0.00')).toBeInTheDocument();
    });
  });

  test("Boundary Check: Drops availability options when slot capacity hits its absolute ceiling threshold limit", async () => {
    setupCollectionMocks({ atMaxCapacity: true });
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('No collection times available matching safety validation criteria.')).toBeInTheDocument();
    });
  });

  test("Boundary Check: Renders alternative fallback block elements when available slot calculations evaluate to zero", async () => {
    setupCollectionMocks({ zeroDurationScenario: true });
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('No collection times available matching safety validation criteria.')).toBeInTheDocument();
    });
  });

  test("allows interactive cancellation via the return layout button element normally", async () => {
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    const cancelBtn = await screen.findByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(mockNavigate).toHaveBeenCalled();
  });

  test("verifies that the confirm appointment button is disabled when no slot is selected", async () => {
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    const confirmBtn = await screen.findByRole('button', { name: /Confirm Collection Appointment/i });
    expect(confirmBtn).toBeDisabled();
  });

  test("renders initial fallback loading animations screen elements properly before processing records", () => {
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    expect(screen.getByText('Calculating valid schedules...')).toBeInTheDocument();
  });

  test("confirms structural workspace elements compile properly within the picker container pane", async () => {
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Available Collection Windows')).toBeInTheDocument();
    });
  });

  /* ================= Branch Coverage Boosters ================= */

  test("Branch Coverage: Pulls transaction information from localStorage when location state is absent", async () => {
    mockLocationState = null;
    localStorage.setItem('lastTransactionId', 'tx-local-999');
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Schedule Buyer Collection')).toBeInTheDocument();
    });
  });

  test("Branch Coverage: Employs standard local time context when drop_off date reference matches are missing", async () => {
    setupCollectionMocks({ missingDropoffBooking: true });
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Schedule Buyer Collection')).toBeInTheDocument();
    });
  });

  test("Branch Coverage: Completes full collection cycle workflow and updates view to receipt page layout", async () => {
    setupCollectionMocks();
    render(<MemoryRouter><CollectionBooking /></MemoryRouter>);

    const slotCards = await screen.findAllByText('Monday');
    fireEvent.click(slotCards[0]);

    // Wait for the async loading/processing state to settle before finding the button
const confirmBtn = await waitFor(() => 
  screen.getByRole('button', { name: /Confirm Collection Appointment/i })
);

expect(confirmBtn).not.toBeDisabled();
fireEvent.click(confirmBtn);

    // Verify layout transitions smoothly to receipt template view
    await waitFor(() => {
      expect(screen.getByText('Collection Slot Reserved!')).toBeInTheDocument();
    });

    const returnBtn = screen.getByRole('button', { name: /Return to My Transactions/i });
    fireEvent.click(returnBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/history');
  });
});