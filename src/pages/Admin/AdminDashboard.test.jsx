import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import AdminDashboard from "./AdminDashboard";
import { supabase } from "@/supabase/supabaseClient";

const mockNavigate = vi.fn();

// Set up routing overrides to isolate layout button behaviors programmatically
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Configure system mocks for analytics metrics, database tables, and auth profiles
vi.mock("@/supabase/supabaseClient", () => {
  let mockBookingsData = [
    { id: "b-1", status: "pending", booking_date: "2026-05-16T10:00:00.000Z", booking_type: "drop_off", profiles: { name: "Sarah" } },
    { id: "b-2", status: "confirmed", booking_date: "2026-05-17T12:00:00.000Z", booking_type: "collection", profiles: { name: "John" } }
  ];

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "admin-1" } } })),
        signOut: vi.fn(() => Promise.resolve())
      },
      from: vi.fn((table) => {
        const chain = {
          select: vi.fn().mockImplementation(() => chain),
          eq: vi.fn().mockImplementation(() => chain),
          order: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: mockBookingsData, error: null });
          }),
          limit: vi.fn().mockImplementation(() => chain),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (table === "profiles") return Promise.resolve({ data: { name: "Bobo", role: "admin" } });
            if (table === "facility_config") return Promise.resolve({ data: { id: "cfg-123", slot_duration_minutes: 30, max_capacity_per_slot: 5, open_time: "09:00", close_time: "17:00" } });
            return Promise.resolve({ data: null, error: null });
          }),
          single: vi.fn().mockImplementation(() => {
            if (table === "profiles") return Promise.resolve({ data: { name: "Bobo", role: "admin" } });
            return Promise.resolve({ data: null, error: null });
          }),
          update: vi.fn().mockImplementation(() => {
            return {
              eq: vi.fn().mockImplementation(() => Promise.resolve({ data: true, error: null }))
            };
          }),
          insert: vi.fn().mockResolvedValue({ data: true, error: null })
        };
        return chain;
      }),
      rpc: vi.fn(() => Promise.resolve({
        data: { total_transaction_volume: 12500, pending_flagged_items: 2, weekly_facility_utilization_pct: 10, monthly_successful_handoffs: 5 },
        error: null
      }))
    }
  };
});

describe("AdminDashboard Navigation, Mutation Handlers & Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    
    // Ensure standard authentication session always evaluates successfully across basic rendering tests
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("renders side navigation layout buttons correctly", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Platform Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Facility Operations/i)).toBeInTheDocument();
  });

  it("swaps viewports seamlessly to handle live facility bookings table and confirm drop-off actions", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const opsButton = await screen.findByText(/Facility Operations/i);
    await act(async () => {
      fireEvent.click(opsButton);
    });

    expect(screen.getByText(/Live Booking Verification/i)).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(supabase.from).toHaveBeenCalledWith("facility_bookings");
  });

  it("handles the complete pipeline for running transaction handover completion statuses", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const opsButton = await screen.findByText(/Facility Operations/i);
    await act(async () => {
      fireEvent.click(opsButton);
    });

    const completeButton = screen.getByRole("button", { name: "Complete" });
    await act(async () => {
      fireEvent.click(completeButton);
    });

    expect(supabase.from).toHaveBeenCalledWith("facility_bookings");
  });

  it("swaps viewports seamlessly to load facility config settings form and updates configuration payload parameters", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const configButton = await screen.findByText(/Facility Configuration/i);
    await act(async () => {
      fireEvent.click(configButton);
    });

    expect(screen.getByText(/Facility Parameters & Constraints/i)).toBeInTheDocument();

    const inputs = screen.getAllByRole("spinbutton");
    await act(async () => {
      await user.clear(inputs[0]);
      await user.type(inputs[0], "45");
    });

    const submitConfigBtn = screen.getByRole("button", { name: /Save Configuration/i });
    await act(async () => {
      fireEvent.click(submitConfigBtn);
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Facility configuration updated!"));
    });
  });

  it("coordinates logout actions smoothly, calling the signOut session utility link", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const signOutBtn = await screen.findByRole("button", { name: /Sign Out Dashboard/i });
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  /* ======================================================================
      🚀 BOUNDARY VALUE TESTING (BVA) & EQUIVALENCE PARTITIONS (EP)
     ====================================================================== */

  it("Boundary Check: Renders zero-state empty fallback message nodes when booking database rows evaluate to absolute zero", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table) => {
      const qbChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: "Bobo", role: "admin" }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cfg-123", slot_duration_minutes: 30 }, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };
      return qbChain;
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const opsButton = await screen.findByText(/Facility Operations/i);
    await act(async () => {
      fireEvent.click(opsButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/No facility transactions available./i)).toBeInTheDocument();
    });
  });

  it("Boundary Check: Confirms system configuration form inputs accept absolute minimum boundary values safely", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table) => {
      const qbChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: "Bobo", role: "admin" }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cfg-123", slot_duration_minutes: 30 }, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: true, error: null })
        })),
        insert: vi.fn().mockResolvedValue({ data: true, error: null })
      };
      return qbChain;
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const configButton = await screen.findByText(/Facility Configuration/i);
    await act(async () => {
      fireEvent.click(configButton);
    });

    const inputs = screen.getAllByRole("spinbutton");
    await act(async () => {
      await user.clear(inputs[0]);
      await user.type(inputs[0], "1");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "1");
    });

    const submitConfigBtn = screen.getByRole("button", { name: /Save Configuration/i });
    await act(async () => {
      fireEvent.click(submitConfigBtn);
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Facility configuration updated!"));
    });
  });
});