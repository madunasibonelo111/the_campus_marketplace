import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import UserProfile from "./UserProfile";
import { supabase } from "@/supabase/supabaseClient";

// Mock React Router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase with smart query interception
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: { getUser: vi.fn(), signOut: vi.fn() },
    from: vi.fn()
  }
}));

describe("UserProfile Component Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {}); // Suppress intentional network error logs
    
    // 1. Mock Authentication
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, error: null 
    });

    // 2. Mock Multi-Table Database Returns
    supabase.from.mockImplementation((table) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      if (table === "profiles") {
        queryBuilder.single = vi.fn().mockResolvedValue({
          data: { id: "user-123", name: "Alice", role: "student", created_at: "2026-01-01" },
          error: null
        });
      }
      if (table === "listings") {
        queryBuilder.order = vi.fn().mockResolvedValue({
          data: [
            { id: "list-1", title: "Book", price: 100, status: "active", quantity: 1, user_id: "user-123" },
            { id: "list-2", title: "Laptop", price: 500, status: "sold", quantity: 0, user_id: "user-123" }
          ],
          error: null
        });
      }
      if (table === "ratings") {
        queryBuilder.eq = vi.fn().mockResolvedValue({
          data: [{ score: 4 }, { score: 5 }],
          error: null
        });
      }
      if (table === "transactions") {
        queryBuilder.eq = vi.fn().mockResolvedValue({
          count: 3,
          error: null
        });
      }

      return queryBuilder;
    });
  });

  test("authenticates, loads profile, and correctly calculates active/sold/trades stats", async () => {
    render(
      <MemoryRouter initialEntries={["/profile/user-123"]}>
        <Routes>
          <Route path="/profile/:userId" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert Loading State
    expect(screen.getByText(/Loading Profile.../i)).toBeInTheDocument();

    // Assert Profile UI finishes loading and renders data
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Verify Star Rating logic (4 + 5 = 9 / 2 = 4.5)
    expect(screen.getByText(/4.5/i)).toBeInTheDocument();
    
    // Verify Stats blocks
    expect(screen.getByText("Book")).toBeInTheDocument();
    expect(screen.getByText(/1 in stock/i)).toBeInTheDocument();
  });

  test("triggers logout sequence successfully", async () => {
    render(
      <MemoryRouter initialEntries={["/profile/user-123"]}>
        <Routes>
          <Route path="/profile/:userId" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Logout/i }));
    
    // Add waitFor here so the test waits for the async logout to finish
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  test("switches tabs to display sold items and activity history", async () => {
    render(
      <MemoryRouter initialEntries={["/profile/user-123"]}>
        <Routes>
          <Route path="/profile/:userId" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Click Sold Items tab
    fireEvent.click(screen.getByRole("button", { name: /Sold Items/i }));
    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    // Click Activity tab
    fireEvent.click(screen.getByRole("button", { name: /Activity/i }));
    await waitFor(() => {
      expect(screen.getByText(/Completed a secure campus handoff/i)).toBeInTheDocument();
    });
  });
});