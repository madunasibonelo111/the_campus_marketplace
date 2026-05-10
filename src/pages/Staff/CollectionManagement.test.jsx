import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CollectionManagement from "./CollectionManagement";
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
    from: vi.fn(),
  },
}));

describe("US13: Item Release to Buyer (CollectionManagement)", () => {
  let globalFetchError = null;
  let globalUpdateError = null;
  let hangFetch = false;

  // Comprehensive mock data covering pending, completed, and missing nested fields for fallback branches
  const mockCollections = [
    {
      id: "1",
      transaction_id: "TXN-002",
      booking_date: "2026-05-11T10:00:00.000Z",
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
      booking_date: "2026-05-11T11:00:00.000Z",
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
    // Adding an item with missing nested fields to fully exercise all fallback branch paths
    {
      id: "3",
      transaction_id: "TXN-004",
      booking_date: "2026-05-11T12:00:00.000Z",
      status: "pending",
      transactions: null,
      facility_handoffs: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {}); // Keep console clean during expected error logs

    globalFetchError = null;
    globalUpdateError = null;
    hangFetch = false;

    // Centralized, robust mock query builder supporting independent select and update chains
    supabase.from.mockImplementation((table) => {
      let isUpdateQuery = false;

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col, val) => {
          if (isUpdateQuery) {
            if (globalUpdateError) {
              return Promise.resolve({ data: null, error: globalUpdateError });
            }
            return Promise.resolve({ data: null, error: null });
          }
          return queryBuilder;
        }),
        order: vi.fn().mockImplementation(() => {
          if (hangFetch) {
            return new Promise(() => {});
          }
          if (globalFetchError) {
            return Promise.reject(globalFetchError);
          }
          return Promise.resolve({ data: mockCollections, error: null });
        }),
        update: vi.fn().mockImplementation(() => {
          isUpdateQuery = true;
          return queryBuilder;
        }),
      };

      return queryBuilder;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("renders the initial loading state correctly", () => {
    hangFetch = true;
    render(
      <MemoryRouter>
        <CollectionManagement />
      </MemoryRouter>
    );
    expect(screen.getByText("Loading collections...")).toBeInTheDocument();
  });

  it("displays pending items awaiting release alongside full fallback data coverage", async () => {
    await renderComponent();
    
    // Assert standard items load
    expect(screen.getByText("Mountain Bike")).toBeInTheDocument();
    expect(screen.getByText("Sarah Williams")).toBeInTheDocument();
    
    // Assert fallback paths executed successfully for Item #3
    expect(screen.getByText("Unknown Item")).toBeInTheDocument();
    expect(screen.getByText("Unknown Seller")).toBeInTheDocument();
    expect(screen.getByText("Unknown Buyer")).toBeInTheDocument();
    expect(screen.getByText("Not yet received")).toBeInTheDocument();
  });

  it("displays buyer information, amounts, condition notes, and status badges correctly", async () => {
    await renderComponent();
    
    expect(screen.getByText("Sarah Williams")).toBeInTheDocument();
    expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
    expect(screen.getByText("R599.99")).toBeInTheDocument();
    expect(screen.getByText("Good condition")).toBeInTheDocument();
    
    // Swap getByText for getAllByText to handle multiple pending items safely
    expect(screen.getAllByText("PENDING").length).toBeGreaterThan(0);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  it("navigates back to dashboard when the back button is clicked", async () => {
    const user = userEvent.setup();
    await renderComponent();
    
    const backButton = screen.getByRole("button", { name: /Back to Dashboard/i });
    await act(async () => {
      await user.click(backButton);
    });
    
    expect(mockNavigate).toHaveBeenCalledWith("/staff");
  });

  it("shows empty state when no pending or confirmed releases exist", async () => {
    // Override the mock to resolve with an empty array
    supabase.from.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

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

  it("handles database errors and successfully displays fallback demo data", async () => {
    globalFetchError = new Error("Database error");

    await act(async () => {
      render(
        <MemoryRouter>
          <CollectionManagement />
        </MemoryRouter>
      );
    });
    
    await waitFor(() => {
      // Demo item defined in the catch block should render
      expect(screen.getByText("Mountain Bike")).toBeInTheDocument();
      expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
    });
  });

  it("opens the Confirm Collection modal, allows checkbox toggling, handles cancellation, and successfully processes status confirmation", async () => {
    const user = userEvent.setup();
    await renderComponent();

    // Grab all "Confirm Collection" buttons present on the pending cards
    const confirmCardButtons = screen.getAllByRole("button", { name: "Confirm Collection" });
    expect(confirmCardButtons.length).toBeGreaterThan(0);

    // Click the first card button to mount the modal
    await act(async () => {
      await user.click(confirmCardButtons[0]);
    });

    // Assert that the modal heading uniquely renders
    const modalHeading = screen.getByRole("heading", { name: "Confirm Collection" });
    expect(modalHeading).toBeInTheDocument();
    expect(modalHeading.closest("div")).toHaveTextContent(/Mountain Bike/i);

    // Interact with verification checkboxes via standard accessible checkbox roles
    const verifyIdCheck = screen.getByRole("checkbox", { name: /verified the buyer's ID/i });
    const verifyItemCheck = screen.getByRole("checkbox", { name: /condition matches the recorded notes/i });

    await act(async () => {
      await user.click(verifyIdCheck);
      await user.click(verifyItemCheck);
    });

    expect(verifyIdCheck).toBeChecked();
    expect(verifyItemCheck).toBeChecked();

    // Test the Cancel button workflow first
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await act(async () => {
      await user.click(cancelBtn);
    });
    expect(screen.queryByRole("heading", { name: "Confirm Collection" })).not.toBeInTheDocument();

    // Re-open the modal to complete full submission
    await act(async () => {
      await user.click(confirmCardButtons[0]);
    });

    // Uniquely grab the submit button located inside the modal (it will be the last one in the DOM array)
    const allConfirmButtons = screen.getAllByRole("button", { name: "Confirm Collection" });
    const modalSubmitBtn = allConfirmButtons[allConfirmButtons.length - 1];

    await act(async () => {
      await user.click(modalSubmitBtn);
    });

    // Verify successful update execution and alerts
    expect(supabase.from).toHaveBeenCalledWith("facility_bookings");
    expect(window.alert).toHaveBeenCalledWith("Collection confirmed successfully!");
  });

  it("alerts failure if updating the collection status encounters an error", async () => {
    globalUpdateError = new Error("Update failed");
    const user = userEvent.setup();
    await renderComponent();

    const confirmCardButtons = screen.getAllByRole("button", { name: "Confirm Collection" });
    await act(async () => {
      await user.click(confirmCardButtons[0]);
    });

    const allConfirmButtons = screen.getAllByRole("button", { name: "Confirm Collection" });
    const modalSubmitBtn = allConfirmButtons[allConfirmButtons.length - 1];

    await act(async () => {
      await user.click(modalSubmitBtn);
    });

    expect(window.alert).toHaveBeenCalledWith("Failed to confirm collection");
  });
});