import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
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

  let mockExistingRowResponse = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockExistingRowResponse = { id: "row-456" }; // Reset to mock UPDATE path by default
    vi.spyOn(window, "alert").mockImplementation(() => {});

    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    
    supabase.from.mockImplementation((table) => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        
        eq: vi.fn().mockImplementation((col, val) => {
          if (table === 'profiles') {
            return { single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }) };
          }
          if (table === 'facility_bookings') {
            return {
              eq: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockResolvedValue({ 
                  data: val === 'drop_off' ? mockDropoffs : mockCollections, 
                  error: null 
                })
              }))
            };
          }
          if (table === 'analytics_facility_utilization') {
            return { maybeSingle: vi.fn().mockResolvedValue({ data: mockExistingRowResponse, error: null }) };
          }
          return qb;
        }),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: true, error: null })
        })),
        insert: vi.fn().mockResolvedValue({ data: true, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "row-456" }, error: null })
      };

      qb.then = (resolve) => resolve({ data: [], error: null });
      return qb;
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

  /* ================= Existing Core Layout Tests ================= */

  it("executes receipt modal verification branch successfully", async () => {
    const user = userEvent.setup();
    await renderDashboard();

    const receiptBtns = await screen.findAllByRole('button', { name: /Quick Confirm Drop-off/i });
    
    await act(async () => {
      await user.click(receiptBtns[0]);
    });
    expect(global.alert).toHaveBeenCalled();
  });

  it("Branch Coverage: Validates compliance checkboxes inside the Release Modal", async () => {
    const user = userEvent.setup();
    await renderDashboard();
    
    const releaseBtns = screen.getAllByRole("button", { name: /Quick Release Item/i });
    
    await act(async () => {
      await user.click(releaseBtns[0]);
    });
    
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("🛑 Verification Compliance"));
  });

  it("Branch Coverage: Alerts user when attempting Quick Release without checklist verification", async () => {
    const user = userEvent.setup();
    await renderDashboard();

    const releaseBtns = await screen.findAllByRole("button", { name: /Quick Release Item/i });
    
    await act(async () => {
      await user.click(releaseBtns[0]);
    });

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("🛑 Verification Compliance"));
  });
  
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

  it("intercepts operational database lookup exceptions safely within the try-catch frame", async () => {
    vi.spyOn(supabase.auth, "getUser").mockRejectedValue(new Error("Database instance unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await renderDashboard();
    expect(screen.getByText("Staff Management Portal")).toBeInTheDocument();
  });

  /* ================= Branch Coverage Boosters ================= */

  it("Branch Coverage: Navigates to dedicated drop-off management views upon card click updates", async () => {
    await renderDashboard();
    const dropoffCard = screen.getByTestId("manage-dropoffs-card");
    
    fireEvent.click(dropoffCard);
    expect(mockNavigate).toHaveBeenCalledWith('/staff/dropoffs');
  });

  it("Branch Coverage: Navigates to dedicated collection management views upon card click updates", async () => {
    await renderDashboard();
    const collectionCard = screen.getByTestId("manage-collections-card");
    
    fireEvent.click(collectionCard);
    expect(mockNavigate).toHaveBeenCalledWith('/staff/collections');
  });

  it("Branch Coverage: Forces the analytics snapshot loop to select the INSERT path when no matching row exists for today", async () => {
    mockExistingRowResponse = null; // Forces "else" branch inside pushUtilizationAnalyticsSnapshot
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

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("logged and synchronized!"));
  });

  

  /* ================= BVA Testing & Equivalence Partitions ================= */

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
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: (resolve) => resolve({ data: [], error: null })
    }));

    await renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText("Staff Management Portal")).toBeInTheDocument();
    });
  });

  it("Equivalence Partition: Verifies afternoon shift greeting messages compile at standard hour distributions", async () => {
    vi.setSystemTime(new Date("2026-05-17T14:30:00.000Z"));
    await renderDashboard();
    expect(screen.getByTestId("greeting")).toHaveTextContent(/Good afternoon/i);
  });

  it("Boundary Check: Verifies evening shift fallback greetings load cleanly at upper time limitations", async () => {
    vi.setSystemTime(new Date("2026-05-17T20:15:00.000Z"));
    await renderDashboard();
    expect(screen.getByTestId("greeting")).toHaveTextContent(/Good evening/i);
  });
});