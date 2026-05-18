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
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data: { slot_duration_minutes: 30, max_capacity_per_slot: 5, open_time: "09:00", close_time: "17:00" } })
        }),
        order: () => Promise.resolve({
          data: [
            { id: 1, status: "pending", booking_date: "2026-05-16", booking_type: "drop_off", profiles: { name: "Sarah" } }
          ]
        })
      })
    })),
    // ✅ Mock the RPC calls for User Story 2
    rpc: vi.fn((rpcName, payload) => {
      if (rpcName === 'get_pending_flags') {
        return Promise.resolve({ 
          data: [{ 
            flag_id: "test-flag-1", 
            item_id: "item-12345678", 
            reporter_name: "John Doe", 
            reason: "Inappropriate content", 
            created_at: new Date().toISOString() 
          }] 
        });
      }
      return Promise.resolve({ data: null });
    })
  }
}));

// MOCK CHILD COMPONENT
vi.mock("./AnalyticsView", () => ({
  default: () => <div data-testid="mock-analytics-view">Platform Analytics Dashboard</div>
}));

describe("AdminDashboard Interactive Navigation Viewports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders global dashboard layout after passing security checkpoint", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // ✅ FIXED: Using findByTestId to avoid the "multiple elements found" error
    expect(await screen.findByTestId("mock-analytics-view")).toBeInTheDocument();
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

  // ✅ Test for User Story 2 (Sibonelo's Moderation Queue Component)
  it("swaps viewports seamlessly to load content moderation workspace", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    const moderationButton = await screen.findByText(/Content Moderation/i);
    
    await act(async () => {
      fireEvent.click(moderationButton);
    });

    // Check if the component text successfully rendered using the mocked RPC data
    await waitFor(() => {
      expect(screen.getByText(/Moderation Queue/i)).toBeInTheDocument();
      // Should also see the mocked dummy data reporter name
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

});