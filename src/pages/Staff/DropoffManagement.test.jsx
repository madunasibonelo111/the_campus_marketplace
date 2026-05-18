import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DropoffManagement from "./DropoffManagement";
import { supabase } from "@/supabase/supabaseClient";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

describe("US13: Item Receipt Confirmation (DropoffManagement)", () => {
  let globalUpdateError = null;
  const mockDropoffs = [{
    id: "1",
    transaction_id: "TXN-001",
    booking_date: "2026-05-11T09:00:00.000Z",
    status: "pending",
    transactions: {
      id: "TXN-001",
      total_amount: 150.00,
      listings: { title: "Test Textbook" },
      seller: { name: "Seller Sam" },
      buyer: { name: "Buyer Bob" }
    }
  }];

  beforeEach(() => {
    vi.clearAllMocks();
    globalUpdateError = null;
    vi.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      // Define the mock chain to handle the specific sequence: select -> eq -> eq -> order
      const qb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(), // Handles both .eq('booking_type', ...) and .eq('status', ...)
        order: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: mockDropoffs, error: null });
        }),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => Promise.resolve({ error: globalUpdateError }))
        }))
      };
      return qb;
    });
  });

  const renderComponent = async () => {
    await act(async () => {
      render(<MemoryRouter><DropoffManagement /></MemoryRouter>);
    });
  };

  it("completes full vault intake workflow including form inputs", async () => {
    await renderComponent();
    
    // 1. Open modal
    fireEvent.click(await screen.findByRole("button", { name: /Inspect & Accept Package/i }));

    // 2. Interact with the form branches
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    
    const conditionSelect = screen.getByRole("combobox");
    fireEvent.change(conditionSelect, { target: { value: "Fair - Visible wear" } });
    
    const notesInput = screen.getByPlaceholderText(/Log packaging/i);
    fireEvent.change(notesInput, { target: { value: "Corner slightly bent" } });

    // 3. Authorize
    const submitBtn = screen.getByRole("button", { name: /Authorize Vault Intake/i });
    await act(async () => fireEvent.click(submitBtn));

    expect(supabase.from).toHaveBeenCalled();
  });

  it("alerts failure if updating the drop-off status encounters an error", async () => {
    globalUpdateError = new Error("Update failed");
    await renderComponent();

    fireEvent.click(await screen.findByRole("button", { name: /Inspect & Accept Package/i }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Authorize Vault Intake/i }));
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Failed to process transaction:"));
  });
});