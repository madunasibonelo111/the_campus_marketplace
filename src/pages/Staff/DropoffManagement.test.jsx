import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DropoffManagement from "./DropoffManagement";
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
    from: vi.fn(),
  },
}));

describe("US13: Item Receipt Confirmation (DropoffManagement)", () => {
  let globalFetchError = null;
  let globalUpdateError = null;
  let simulateEmptyQueue = false;

  const mockDropoffs = [
    {
      id: "1",
      transaction_id: "TXN-001",
      booking_date: "2026-05-11T09:00:00.000Z",
      status: "pending",
      transactions: {
        id: "TXN-001",
        total_amount: 150.00,
        listing_id: "L-001",
        listings: { title: "Test Textbook" },
        seller: { name: "Seller Sam" },
        buyer: { name: "Buyer Bob" }
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    globalFetchError = null;
    globalUpdateError = null;
    simulateEmptyQueue = false;
    vi.spyOn(window, "alert").mockImplementation(() => {});

    // High fidelity fluent chaining simulation builder engine 
    supabase.from.mockImplementation((table) => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockImplementation(() => Promise.resolve({ error: globalUpdateError || null })),
        order: vi.fn().mockImplementation(() => {
          if (simulateEmptyQueue) return Promise.resolve({ data: [], error: null });
          if (globalFetchError) return Promise.resolve({ data: null, error: globalFetchError });
          return Promise.resolve({ data: mockDropoffs, error: null });
        }),
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      qb.eq = vi.fn().mockImplementation(function(col, val) {
        if (table === 'facility_bookings' && col === 'id') {
          return Promise.resolve({ error: globalUpdateError || null });
        }
        return qb;
      });

      return qb;
    });
  });

  const renderComponent = async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <DropoffManagement />
        </MemoryRouter>
      );
    });
  };

  it("renders drop-off items array grid maps gracefully upon execution resolution", async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Drop-off Intake Desk")).toBeInTheDocument();
      expect(screen.getByText("Intake: Test Textbook")).toBeInTheDocument();
    });
  });

  it("alerts failure if updating the drop-off status encounters an error", async () => {
    globalUpdateError = new Error("Update failed");
    await renderComponent();

    const openInspectBtn = await screen.findByRole("button", { name: /Inspect & Accept Package/i });
    await act(async () => {
      fireEvent.click(openInspectBtn);
    });

    const checkboxes = screen.getAllByRole("checkbox");
    await act(async () => {
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
    });

    const submitBtn = screen.getByRole("button", { name: /Authorize Vault Intake/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Failed to process transaction:"));
  });

  it("Boundary Check: Renders empty queue fallback cards when database lookup rows evaluate to zero", async () => {
    simulateEmptyQueue = true;
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Intake Queue Clear")).toBeInTheDocument();
    });
  });

  it("Boundary Check: Renders extremely long asset title descriptions safely without runtime display overflow crashes", async () => {
    mockDropoffs[0].transactions.listings.title = "A".repeat(255);
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Intake: AAAAA/i)).toBeInTheDocument();
    });
  });
});