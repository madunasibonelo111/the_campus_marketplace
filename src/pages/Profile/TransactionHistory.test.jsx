import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TransactionHistory from "./TransactionHistory";
import { supabase } from "@/supabase/supabaseClient";

// 1. Mock react-router-dom navigations
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 2. Mock Supabase Client
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("TransactionHistory Component Suite", () => {
  const mockUser = { id: "user-123", email: "student@wits.ac.za" };

  // Clean, predictable dataset ensuring unique elements and clear metric sums
  const defaultTransactions = [
    {
      id: "tx-1",
      listing_id: "list-1",
      buyer_id: "user-123", // Maps to 'buy' type
      seller_id: "seller-456",
      type: "purchase",
      status: "completed",
      created_at: "2026-05-10T10:00:00Z",
      total_amount: 300,
      amount_paid: 300,
      remaining_balance: 0,
      seller: { id: "seller-456", name: "Alice Seller" },
      listings: { title: "Custom Physics Book", price: 300, listing_type: "sale" },
      payments: [{ id: "p-1", amount: 300, method: "card", status: "completed", created_at: "2026-05-10T10:00:00Z" }]
    },
    {
      id: "tx-2",
      listing_id: "list-2",
      buyer_id: "buyer-789",
      seller_id: "user-123", // Maps to 'sell' type
      type: "trade",
      status: "partial_payment",
      created_at: "2026-05-09T10:00:00Z",
      trade_item_description: "Trading an iPad Pro",
      total_amount: 500,
      amount_paid: 200,
      remaining_balance: 300,
      buyer: { id: "buyer-789", name: "Bob Buyer" },
      listings: { title: "Drawing Tablet", price: 500, listing_type: "trade" },
      payments: [{ id: "p-2", amount: 200, method: "eft", status: "partial", shortfall_amount: 300, created_at: "2026-05-09T10:00:00Z" }]
    },
    {
      id: "tx-3",
      listing_id: "list-3",
      buyer_id: "user-123",
      seller_id: null,
      status: "pending",
      created_at: "2026-05-08T10:00:00Z",
      total_amount: 100,
      amount_paid: 0,
      listings: null, // Fully triggers the 'Unknown Item' fallback path cleanly
      payments: []
    }
  ];

  let overrideTransactions = null;
  let fetchError = null;
  let hangFetch = false;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {}); // Keep console clean during expected error fallback tests

    overrideTransactions = null;
    fetchError = null;
    hangFetch = false;

    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Completely isolated query builder avoiding persistent state issues
    supabase.from.mockImplementation((table) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => {
          if (hangFetch) {
            return new Promise(() => {});
          }
          if (fetchError) {
            return Promise.reject(fetchError);
          }
          if (table === "facility_bookings") {
            return Promise.resolve({ data: [], error: null });
          }
          if (table === "transactions") {
            return Promise.resolve({ 
              data: overrideTransactions !== null ? overrideTransactions : defaultTransactions, 
              error: null 
            });
          }
          return Promise.resolve({ data: [], error: null });
        })
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the initial loading state correctly", () => {
    hangFetch = true;
    render(
      <MemoryRouter>
        <TransactionHistory />
      </MemoryRouter>
    );
    expect(screen.getByText("Loading transaction history...")).toBeInTheDocument();
  });

  it("redirects to /auth if no authenticated user is found", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    
    await act(async () => {
      render(
        <MemoryRouter>
          <TransactionHistory />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("renders empty state when no transactions exist and navigates to shop", async () => {
    const user = userEvent.setup();
    overrideTransactions = [];

    await act(async () => {
      render(
        <MemoryRouter>
          <TransactionHistory />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("No transactions found")).toBeInTheDocument();
    });

    const shopBtn = screen.getByRole("button", { name: /Start Shopping/i });
    await act(async () => {
      await user.click(shopBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/basket");
  });

  it("navigates back to shop when clicking the top navigation pill", async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <MemoryRouter>
          <TransactionHistory />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Transaction History")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: /Back to Shop/i });
    await act(async () => {
      await user.click(backBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/basket");
  });

  it("calculates statistics accurately and renders transaction metadata cleanly", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <TransactionHistory />
        </MemoryRouter>
      );
    });

    // Safely verify calculated metric aggregations using getAllByText to accept multiple matching string nodes
    await waitFor(() => {
      expect(screen.getAllByText("R300.00").length).toBeGreaterThan(0); // Matches Total Spent & Outstanding Balance safely
      expect(screen.getByText("R200.00")).toBeInTheDocument(); // Total Earned
    });

    // Verify mapped metadata items and fallback paths
    expect(screen.getByText("Custom Physics Book")).toBeInTheDocument();
    expect(screen.getByText("Drawing Tablet")).toBeInTheDocument();
    expect(screen.getByText("Unknown Item")).toBeInTheDocument();
    expect(screen.getByText(/Trading an iPad Pro/i)).toBeInTheDocument();
  });

  it("filters transactions accurately across all filter option tabs", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <TransactionHistory />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Custom Physics Book")).toBeInTheDocument();
    });

    // Filter by Purchases
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Purchases/i }));
    });
    expect(screen.getByText("Custom Physics Book")).toBeInTheDocument();
    expect(screen.queryByText("Drawing Tablet")).not.toBeInTheDocument();

    // Filter by Sales
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Sales/i }));
    });
    expect(screen.getByText("Drawing Tablet")).toBeInTheDocument();
    expect(screen.queryByText("Custom Physics Book")).not.toBeInTheDocument();

    // Filter by Trades
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Trades/i }));
    });
    expect(screen.getByText("Drawing Tablet")).toBeInTheDocument();

    // Filter by Partial Payments
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Partial Payments/i }));
    });
    expect(screen.getByText("Drawing Tablet")).toBeInTheDocument();

    // Reset filter to All
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "All" }));
    });
    expect(screen.getByText("Custom Physics Book")).toBeInTheDocument();
    expect(screen.getByText("Drawing Tablet")).toBeInTheDocument();
  });

  it("displays error messages when fetch fails and executes retry attempts safely", async () => {
    const user = userEvent.setup();
    fetchError = new Error("Connection timed out");

    await act(async () => {
      render(
        <MemoryRouter>
          <TransactionHistory />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load transactions/i)).toBeInTheDocument();
    });

    // Resolve error state to test successful retry progression
    fetchError = null;

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    await act(async () => {
      await user.click(retryBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("Custom Physics Book")).toBeInTheDocument();
    });
  });
});