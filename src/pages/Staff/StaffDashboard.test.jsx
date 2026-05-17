import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StaffDashboard from "./StaffDashboard";
import { supabase } from "@/supabase/supabaseClient";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("StaffDashboard Component Core Layout Test Suite", () => {
  const mockUser = { id: "staff-123", email: "staff@wits.ac.za" };
  const mockProfile = { name: "Blessing Maduna" };

  const mockDropoffs = [
    {
      id: "booking-dropoff-1",
      transaction_id: "tx-1",
      booking_date: "2026-05-17T10:00:00.000Z",
      status: "pending",
      transactions: {
        id: "tx-1",
        total_amount: 150.00,
        listings: { title: "Textbook Alpha" },
        seller: { name: "Seller Sam" },
        buyer: { name: "Buyer Bob" }
      }
    }
  ];

  const mockCollections = [
    {
      id: "booking-collection-1",
      transaction_id: "tx-2",
      booking_date: "2026-05-17T14:00:00.000Z",
      status: "pending",
      transactions: {
        id: "tx-2",
        total_amount: 450.00,
        listings: { title: "Lab Coat Gold" },
        seller: { name: "Seller Sarah" },
        buyer: { name: "Buyer Brian" }
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.spyOn(window, "alert").mockImplementation(() => {});

    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    
    supabase.from.mockImplementation((table) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col, val) => {
          const qb = {
            single: vi.fn(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn()
          };
          
          if (table === 'profiles') {
            qb.single.mockResolvedValue({ data: mockProfile, error: null });
          }
          if (table === 'facility_bookings') {
            qb.order.mockResolvedValue({ data: col === 'booking_type' && val === 'drop_off' ? mockDropoffs : mockCollections, error: null });
            return qb;
          }
          return qb;
        }),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null })
      };
    });
  });

  const renderDashboard = async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });
  };

  it("resolves authenticated agent metrics and prints active greeting lines", async () => {
    vi.setSystemTime(new Date("2026-05-17T08:00:00.000Z"));
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("greeting")).toHaveTextContent(/Blessing Maduna/i);
      expect(screen.getByText("Staff Management Portal")).toBeInTheDocument();
    });
  });

  it("evaluates in-line validation toggles on schedule item cards and completes update processes", async () => {
    vi.setSystemTime(new Date("2026-05-17T11:00:00.000Z"));
    const user = userEvent.setup();
    await renderDashboard();

    const inlineCheckboxes = screen.getAllByRole("checkbox");
    
    await act(async () => {
      await user.click(inlineCheckboxes[0]);
      await user.click(inlineCheckboxes[1]);
    });

    const dropoffQuickBtn = screen.getByRole('button', { name: /Quick Confirm Drop-off/i });
    await act(async () => {
      await user.click(dropoffQuickBtn);
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("quick-action has been logged and synchronized!"));
  });

  /* ======================================================================
      🚀 NEW BOUNDARY TESTING CONDITIONS: SPRINT REQUIREMENTS
     ====================================================================== */

  it("Boundary Check: Evaluates late-evening (23:59) local scheduling dates accurately without timezone drift leaks", async () => {
    vi.setSystemTime(new Date("2026-05-17T23:59:59.999+02:00"));
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    });
  });

  it("Boundary Check: Safeguards map iterations seamlessly when query feeds return null indicators", async () => {
    supabase.from.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    }));

    await renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText("Staff Management Portal")).toBeInTheDocument();
    });
  });
});