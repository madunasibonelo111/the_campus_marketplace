import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CollectionManagement from "./CollectionManagement";
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

describe("US13: Item Release to Buyer (CollectionManagement)", () => {
  let globalFetchError = null;
  let globalUpdateError = null;
  let simulateEmptyQueue = false;

  const mockCollections = [
    {
      id: "1",
      transaction_id: "TXN-002",
      booking_date: "2026-05-11T10:00:00.000Z",
      status: "pending",
      transactions: {
        id: "TXN-002",
        total_amount: 320.00,
        listing_id: "L-002",
        listings: { title: 'Engineering Graphics Tool' },
        seller: { name: 'Thabo Mbeki' },
        buyer: { name: 'Buyer Bob' }
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
          return Promise.resolve({ data: mockCollections, error: null });
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
          <CollectionManagement />
        </MemoryRouter>
      );
    });
  };

  it("renders collections management component with loaded items grid lists", async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Collection Handout Desk")).toBeInTheDocument();
      expect(screen.getByText(/Engineering Graphics Tool/i)).toBeInTheDocument();
    });
  });

  it("alerts failure if updating the collection status encounters an error", async () => {
    globalUpdateError = new Error("Update failed");
    await renderComponent();

    const openModalBtn = await screen.findByRole("button", { name: /Authenticate & Release Item/i });
    await act(async () => {
      fireEvent.click(openModalBtn);
    });

    const checkboxes = screen.getAllByRole("checkbox");
    await act(async () => {
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
    });

    const submitBtn = screen.getByRole("button", { name: /Authorize Release Handover/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Verification system failed to process drop:"));
  });

  it("Boundary Check: Renders zero-value (R0.00) financial assets without throwing formatting breaks", async () => {
    mockCollections[0].transactions.total_amount = 0.00;
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText("R0.00")).toBeInTheDocument();
    });
  });

  it("Boundary Check: Renders descriptive empty feedback text when elements array length hits absolute zero", async () => {
    simulateEmptyQueue = true;
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText("No student collection pick-ups are pending at the desk container right now.")).toBeInTheDocument();
    });
  });
});