// src/pages/Profile/Reviews.test.jsx
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SellerReviewsPage from "./Reviews";
import { supabase } from "@/supabase/supabaseClient";

// Mock React Router parameters cleanly
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ sellerId: "seller-789" }),
    useLocation: () => ({ search: "?action=all", state: null })
  };
});

// Mock the core Supabase Client methods safely
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "buyer-123" } }, error: null }))
    },
    from: vi.fn()
  }
}));

describe("SellerReviewsPage Workspace Coverage Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Standard structural mock return for profiles & reviews records loading logs
    supabase.from.mockImplementation((table) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      if (table === "profiles") {
        queryBuilder.single.mockResolvedValue({
          data: { id: "seller-789", name: "John Seller" },
          error: null
        });
      }

      if (table === "ratings") {
        queryBuilder.order.mockResolvedValue({
          data: [
            { id: 1, score: 5, comment: "Amazing seller!", created_at: "2026-01-01" }
          ],
          error: null
        });
      }

      return queryBuilder;
    });
  });

  test("successfully resolves authentication and loads seller profile data", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/reviews/seller-789"]}>
          <Routes>
            <Route path="/reviews/:sellerId" element={<SellerReviewsPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait until loading boundaries clear out and profile content surfaces
    await waitFor(() => {
      expect(screen.getByText(/John Seller Reviews/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Amazing seller!/i)).toBeInTheDocument();
    expect(screen.getByText("★★★★★")).toBeInTheDocument();
  });
});