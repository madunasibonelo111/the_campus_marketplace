import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StaffDashboard from "./StaffDashboard";
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

describe("StaffDashboard Component", () => {
  const mockUser = { id: "staff-123", email: "staff@wits.ac.za" };
  const mockProfile = { name: "Blessing Maduna" };

  const mockDropoffs = [
    {
      id: "booking-dropoff-1",
      transaction_id: "tx-1",
      booking_date: "2026-05-11T10:00:00.000Z",
      status: "pending",
      transactions: {
        id: "tx-1",
        total_amount: 350,
        listings: { title: "Engineering Physics Textbook" },
        seller: { name: "Alice Seller" },
        buyer: { name: "Bob Buyer" },
      },
    },
  ];

  const mockCollections = [
    {
      id: "booking-collection-1",
      transaction_id: "tx-2",
      booking_date: "2026-05-11T11:00:00.000Z",
      status: "pending",
      transactions: {
        id: "tx-2",
        total_amount: 800,
        listings: { title: "Drafting Kit" },
        seller: { name: "Charlie Seller" },
        buyer: { name: "Diana Buyer" },
      },
      facility_handoffs: [{ item_condition_notes: "Perfect condition" }],
    },
  ];

  // Global control flags for deterministic branch/error testing
  let globalFetchError = null;
  let globalUpdateError = null;
  let hangGetUser = false;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {}); // Keep console clean during error fallback tests

    // Reset control flags
    globalFetchError = null;
    globalUpdateError = null;
    hangGetUser = false;

    // Lock system time to a guaranteed afternoon hour to make the greeting deterministic
    vi.setSystemTime(new Date("2026-05-11T14:30:00.000Z"));

    supabase.auth.getUser.mockImplementation(() => {
      if (hangGetUser) {
        return new Promise(() => {});
      }
      if (globalFetchError) {
        return Promise.reject(globalFetchError);
      }
      return Promise.resolve({ data: { user: mockUser }, error: null });
    });

    // Centralized, stateful mock builder ensuring independent query chains
    supabase.from.mockImplementation((table) => {
      let currentBookingType = null;
      let isUpdateQuery = false;

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col, val) => {
          if (col === "booking_type") {
            currentBookingType = val;
          }
          if (isUpdateQuery) {
            // Resolves the final chained call of .update().eq()
            if (globalUpdateError) {
              return Promise.resolve({ data: null, error: globalUpdateError });
            }
            return Promise.resolve({ data: null, error: null });
          }
          return queryBuilder;
        }),
        order: vi.fn().mockImplementation(() => {
          if (globalFetchError) {
            return Promise.reject(globalFetchError);
          }
          if (table === "facility_bookings") {
            if (currentBookingType === "drop_off") {
              return Promise.resolve({ data: mockDropoffs, error: null });
            }
            if (currentBookingType === "collection") {
              return Promise.resolve({ data: mockCollections, error: null });
            }
          }
          return Promise.resolve({ data: [], error: null });
        }),
        single: vi.fn().mockImplementation(() => {
          if (table === "profiles") {
            return Promise.resolve({ data: mockProfile, error: null });
          }
          return Promise.resolve({ data: null, error: null });
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

  it("renders the initial loading state correctly", async () => {
    hangGetUser = true;

    render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  it("loads profile data, displays proper metrics, and renders the correct afternoon greeting", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Campus Marketplace")).toBeInTheDocument();
      expect(screen.getByText("Staff Management Portal")).toBeInTheDocument();
      expect(screen.getByTestId("greeting")).toHaveTextContent("Good afternoon, Blessing Maduna! 👋");
    });

    // Verify fetched metrics and appointment items render properly from the isolated chains
    expect(screen.getByText("Engineering Physics Textbook")).toBeInTheDocument();
    expect(screen.getByText("Drop-off by Alice Seller")).toBeInTheDocument();
    expect(screen.getByText("Drafting Kit")).toBeInTheDocument();
    expect(screen.getByText("Collection by Diana Buyer")).toBeInTheDocument();
  });

  it("handles database fetch errors by successfully mounting the fallback/demo items", async () => {
    globalFetchError = new Error("Database offline");

    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // The fallback items specified in the catch block should render cleanly
      expect(screen.getByText("Vintage Leather Boots")).toBeInTheDocument();
      expect(screen.getByText("Mountain Bike")).toBeInTheDocument();
    });
  });

  it("processes navigation correctly when clicking Quick Action cards", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });

    const dropoffCard = await screen.findByTestId("manage-dropoffs-card");
    const collectionCard = await screen.findByTestId("manage-collections-card");

    await act(async () => {
      await user.click(dropoffCard);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/staff/dropoffs");

    await act(async () => {
      await user.click(collectionCard);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/staff/collections");
  });

  it("opens the Receipt Modal for drop-offs, allows input, and successfully processes confirmation", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });

    // Grab confirm button specifically for the drop-off item
    const confirmButtons = await screen.findAllByRole("button", { name: "Confirm" });
    
    await act(async () => {
      await user.click(confirmButtons[0]);
    });

    const modalHeading = screen.getByRole("heading", { name: "Confirm Drop-off" });
    expect(modalHeading).toBeInTheDocument();
    expect(modalHeading.closest("div")).toHaveTextContent(/Engineering Physics Textbook/i);

    // Bypassing broken HTML label association by grabbing elements via native accessible roles
    const conditionSelect = screen.getByRole("combobox");
    const notesText = screen.getByRole("textbox");

    await act(async () => {
      await user.selectOptions(conditionSelect, "Good - Minor wear");
      await user.type(notesText, "Verified item clean.");
    });

    // Test canceling modal first
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await act(async () => {
      await user.click(cancelBtn);
    });
    expect(screen.queryByRole("heading", { name: "Confirm Drop-off" })).not.toBeInTheDocument();

    // Re-open modal and confirm fully
    await act(async () => {
      await user.click(confirmButtons[0]);
    });

    const confirmSubmitBtn = screen.getByRole("button", { name: "Confirm Drop-off" });
    await act(async () => {
      await user.click(confirmSubmitBtn);
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("successfully"));
  });

  it("opens the Release Modal for collections, handles checkboxes, and successfully processes confirmation", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });

    const confirmButtons = await screen.findAllByRole("button", { name: "Confirm" });
    await act(async () => {
      await user.click(confirmButtons[1]);
    });

    const modalHeading = screen.getByRole("heading", { name: "Confirm Collection" });
    expect(modalHeading).toBeInTheDocument();
    expect(modalHeading.closest("div")).toHaveTextContent(/Drafting Kit/i);

    // Check verification checkboxes
    const verifyIdCheck = screen.getByLabelText(/verified the buyer's ID/i);
    const verifyItemCheck = screen.getByLabelText(/condition matches the recorded notes/i);

    await act(async () => {
      await user.click(verifyIdCheck);
      await user.click(verifyItemCheck);
    });

    expect(verifyIdCheck).toBeChecked();
    expect(verifyItemCheck).toBeChecked();

    // Submit collection confirmation
    const confirmCollectionBtn = screen.getByRole("button", { name: "Confirm Collection" });
    await act(async () => {
      await user.click(confirmCollectionBtn);
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("successfully"));
  });

  it("alerts failure if updating the booking status encounters an error", async () => {
    const user = userEvent.setup();
    globalUpdateError = new Error("Update blocked");

    await act(async () => {
      render(
        <MemoryRouter>
          <StaffDashboard />
        </MemoryRouter>
      );
    });

    const confirmButtons = await screen.findAllByRole("button", { name: "Confirm" });
    await act(async () => {
      await user.click(confirmButtons[0]);
    });

    const confirmSubmitBtn = screen.getByRole("button", { name: "Confirm Drop-off" });
    await act(async () => {
      await user.click(confirmSubmitBtn);
    });

    expect(window.alert).toHaveBeenCalledWith("Failed to update booking status");
  });

  it("renders correct morning and evening greetings based on system time", async () => {
    // Test Morning
    vi.setSystemTime(new Date("2026-05-11T08:00:00.000Z"));
    const { unmount } = render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId("greeting")).toHaveTextContent(/Good morning/i);
    });
    unmount();

    // Test Evening
    vi.setSystemTime(new Date("2026-05-11T20:00:00.000Z"));
    render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId("greeting")).toHaveTextContent(/Good evening/i);
    });
  });
});