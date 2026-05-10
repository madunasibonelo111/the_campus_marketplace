import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DropoffManagement from "./DropoffManagement";

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

describe("US13: Item Receipt Confirmation", () => {
  const mockDropoffs = [
    {
      id: "1",
      transaction_id: "TXN-001",
      booking_date: new Date().toISOString(),
      status: "pending",
      transactions: {
        id: "TXN-001",
        total_amount: 249.99,
        listings: { title: "Vintage Leather Boots" },
        seller: { name: "John Doe" },
        buyer: { name: "Jane Smith" },
      },
    },
    {
      id: "2",
      transaction_id: "TXN-002",
      booking_date: new Date().toISOString(),
      status: "completed",
      transactions: {
        id: "TXN-002",
        total_amount: 1299.99,
        listings: { title: "MacBook Pro" },
        seller: { name: "Alice Johnson" },
        buyer: { name: "Bob Williams" },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockDropoffs,
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
          <DropoffManagement />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Loading drop-offs...")).not.toBeInTheDocument();
    });
    return component;
  };

  it("displays pending items awaiting receipt confirmation", async () => {
    await renderComponent();
    expect(screen.getByText("Vintage Leather Boots")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows confirm receipt button for pending items", async () => {
    await renderComponent();
    const confirmButton = screen.getByRole("button", { name: "Confirm Drop-off" });
    expect(confirmButton).toBeInTheDocument();
  });

  it("displays item details correctly", async () => {
    await renderComponent();
    expect(screen.getByText("Vintage Leather Boots")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("R249.99")).toBeInTheDocument();
  });

  it("shows status badge for pending receipts", async () => {
    await renderComponent();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("shows completed status for completed dropoffs", async () => {
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

  it("shows empty state when no pending receipts", async () => {
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
          <DropoffManagement />
        </MemoryRouter>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText("No drop-off appointments")).toBeInTheDocument();
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
          <DropoffManagement />
        </MemoryRouter>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText("Vintage Leather Boots")).toBeInTheDocument();
    });
  });
});