import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CollectionManagement from "./CollectionManagement";

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
    from: vi.fn(),
  },
}));

import { supabase } from "@/supabase/supabaseClient";

describe("US13: Item Release to Buyer", () => {
  const mockCollections = [
    {
      id: "1",
      transaction_id: "TXN-002",
      booking_date: new Date().toISOString(),
      status: "pending",
      transactions: {
        id: "TXN-002",
        total_amount: 599.99,
        listings: { title: "Mountain Bike" },
        seller: { name: "Mike Johnson" },
        buyer: { name: "Sarah Williams" },
      },
      facility_handoffs: [{ item_condition_notes: "Good condition" }],
    },
    {
      id: "2",
      transaction_id: "TXN-003",
      booking_date: new Date().toISOString(),
      status: "completed",
      transactions: {
        id: "TXN-003",
        total_amount: 89.99,
        listings: { title: "Calculus Textbook" },
        seller: { name: "Emily Brown" },
        buyer: { name: "Chris Davis" },
      },
      facility_handoffs: [{ item_condition_notes: "Like new" }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCollections,
            error: null,
          }),
        }),
      }),
    });
  });

  const renderComponent = async () => {
    let component;
    await act(async () => {
      component = render(
        <MemoryRouter>
          <CollectionManagement />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Loading collections...")).not.toBeInTheDocument();
    });
    return component;
  };

  it("displays pending items awaiting release to buyer", async () => {
    await renderComponent();
    expect(screen.getByText("Mountain Bike")).toBeInTheDocument();
    expect(screen.getByText("Sarah Williams")).toBeInTheDocument();
  });

  it("shows confirm release button for pending items", async () => {
    await renderComponent();
    const confirmButton = screen.getByRole("button", { name: "Confirm Collection" });
    expect(confirmButton).toBeInTheDocument();
  });

  it("displays buyer information correctly", async () => {
    await renderComponent();
    expect(screen.getByText("Sarah Williams")).toBeInTheDocument();
    expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
  });

  it("displays amount correctly", async () => {
    await renderComponent();
    expect(screen.getByText("R599.99")).toBeInTheDocument();
  });

  it("displays item condition notes", async () => {
    await renderComponent();
    expect(screen.getByText("Good condition")).toBeInTheDocument();
  });

  it("shows status badge for pending releases", async () => {
    await renderComponent();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("shows completed status for completed collections", async () => {
    await renderComponent();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  it("navigates back to dashboard when back button clicked", async () => {
    const user = userEvent.setup();
    await renderComponent();
    const backButton = screen.getByText("← Back to Dashboard");
    await user.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/staff");
  });

  it("shows empty state when no pending releases", async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CollectionManagement />
        </MemoryRouter>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText("No collection appointments")).toBeInTheDocument();
    });
  });

  it("handles database error and shows fallback data", async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CollectionManagement />
        </MemoryRouter>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText("Mountain Bike")).toBeInTheDocument();
    });
  });
});