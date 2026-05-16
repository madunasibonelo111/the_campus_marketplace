// src/pages/Admin/AdminDashboard.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";

// MOCK NAVIGATE
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// MOCK SECURITY & RPC ENDPOINTS
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "admin-1" } } })),
      signOut: vi.fn(() => Promise.resolve())
    },
    from: vi.fn((table) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: "Bobo", role: "admin" } })
        }),
        order: () => Promise.resolve({
          data: [
            { id: 1, status: "pending", booking_date: "2026-05-16", booking_type: "drop_off", profiles: { name: "Sarah" } }
          ]
        }),
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data: { slot_duration_minutes: 30, max_capacity_per_slot: 5 } }),
          single: () => Promise.resolve({ data: { slot_duration_minutes: 30, max_capacity_per_slot: 5 } })
        })
      }),
      update: () => ({ eq: () => Promise.resolve({ data: true, error: null }) }),
      insert: () => Promise.resolve({ data: true, error: null })
    })),
    rpc: vi.fn(() => Promise.resolve({
      data: { total_transaction_volume: 12500, pending_flagged_items: 2, weekly_facility_utilization_pct: 10, monthly_successful_handoffs: 5 },
      error: null
    }))
  }
}));

describe("AdminDashboard Navigation & Layout Toggles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders side navigation layout buttons correctly", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    // ✅ Wait for loading spinner to clear and dashboard to mount
    expect(await screen.findByText(/Platform Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Facility Operations/i)).toBeInTheDocument();
  });

  it("swaps viewports seamlessly to handle live facility bookings table", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    // ✅ Use findByText to await the auth lifecycle state resolution before interacting
    const opsButton = await screen.findByText(/Facility Operations/i);
    
    // ✅ Wrap state-mutating UI clicks in act() to clear console warnings
    await act(async () => {
      fireEvent.click(opsButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Live Booking Verification/i)).toBeInTheDocument();
    });
  });

  it("swaps viewports seamlessly to load facility config settings form", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    // ✅ Use findByText to wait out the layout's initial global spinner state
    const configButton = await screen.findByText(/Facility Configuration/i);
    
    // ✅ Wrap state-mutating UI clicks in act() to clear console warnings
    await act(async () => {
      fireEvent.click(configButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Facility Parameters & Constraints/i)).toBeInTheDocument();
    });
  });
});