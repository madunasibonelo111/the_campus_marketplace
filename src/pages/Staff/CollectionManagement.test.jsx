import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CollectionManagement from "./CollectionManagement";
import { supabase } from "@/supabase/supabaseClient";

//  Mock react-router-dom navigations
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

//  Mock Supabase Client
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("US13: Item Release to Buyer (CollectionManagement)", () => {
  let globalFetchError = null;
  let globalUpdateError = null;
  let hangFetch = false;

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
    vi.spyOn(console, "error").mockImplementation(() => {}); 

    globalFetchError = null;
    globalUpdateError = null;
    hangFetch = false;

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
            return Promise.resolve({ data: [], error: globalFetchError });
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
    expect(screen.getByText("Mountain Bike")).toBeInTheDocument();
    expect(screen.getByText("Sarah Williams")).toBeInTheDocument();
    expect(screen.getByText("Unknown Item")).toBeInTheDocument();
    expect(screen.getByText("Unknown Seller")).toBeInTheDocument();
    expect(screen.getByText("Unknown Buyer")).toBeInTheDocument();
  });

  it("displays buyer information, amounts, condition notes, and status badges correctly", async () => {
    await renderComponent();
    expect(screen.getByText("Sarah Williams")).toBeInTheDocument();
    expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
    expect(screen.getByText("R599.99")).toBeInTheDocument();
    expect(screen.getAllByText("Verified Custody").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PENDING").length).toBeGreaterThan(0);
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

  it("handles database errors and successfully displays fallback data", async () => {
    globalFetchError = new Error("Database error");
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

  it("opens the Confirm Collection modal, allows checkbox toggling, handles cancellation, and successfully processes status confirmation", async () => {
    const user = userEvent.setup();
    await renderComponent();

    const confirmCardButtons = screen.getAllByRole("button", { name: "Confirm Collection" });
    await act(async () => {
      await user.click(confirmCardButtons[0]);
    });

    const modalHeading = screen.getByRole("heading", { name: "Confirm Collection" });
    expect(modalHeading).toBeInTheDocument();

    const verifyIdCheck = screen.getByRole("checkbox", { name: /verified the buyer's ID/i });
    const verifyItemCheck = screen.getByRole("checkbox", { name: /condition matches the recorded notes/i });

    await act(async () => {
      await user.click(verifyIdCheck);
      await user.click(verifyItemCheck);
    });

    expect(verifyIdCheck).toBeChecked();
    expect(verifyItemCheck).toBeChecked();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await act(async () => {
      await user.click(cancelBtn);
    });
    expect(screen.queryByRole("heading", { name: "Confirm Collection" })).not.toBeInTheDocument();

    await act(async () => {
      await user.click(confirmCardButtons[0]);
    });

    const allConfirmButtons = screen.getAllByRole("button", { name: "Confirm Collection" });
    const modalSubmitBtn = allConfirmButtons[allConfirmButtons.length - 1];

    await act(async () => {
      await user.click(modalSubmitBtn);
    });

    expect(supabase.from).toHaveBeenCalledWith("facility_bookings");
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Collection finalized"));
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

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Failed to confirm collection"));
  });
});