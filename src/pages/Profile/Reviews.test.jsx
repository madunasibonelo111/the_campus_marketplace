import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SellerReviewsPage from "./Reviews";
import { supabase } from "@/supabase/supabaseClient";

const mockNavigate = vi.fn();
let mockSearchParam = "?action=all";
let mockLocationState = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ sellerId: "seller-789" }),
    useLocation: () => ({
      get search() { return mockSearchParam; },
      get state() { return mockLocationState; }
    })
  };
});

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
    vi.spyOn(window, "alert").mockImplementation(() => {});
    mockSearchParam = "?action=all";
    mockLocationState = null;

    supabase.from.mockImplementation((table) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn().mockResolvedValue({ data: true, error: null })
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

    await waitFor(() => {
      expect(screen.getByText(/John Seller Reviews/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Amazing seller!/i)).toBeInTheDocument();
  });

  test("renders empty review message layout safely when database profiles return zero arrays", async () => {
    supabase.from.mockImplementation((table) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: "John Seller" } }),
      };
      if (table === "ratings") {
        queryBuilder.order.mockResolvedValue({ data: [], error: null });
      }
      return queryBuilder;
    });

    render(
      <MemoryRouter>
        <SellerReviewsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet./i)).toBeInTheDocument();
    });
  });

  test("submits interactive star ratings and comment content streams successfully", async () => {
    mockSearchParam = "?action=rate";
    mockLocationState = { transactionId: "tx-456" };
    
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    supabase.from.mockImplementation((table) => {
      if (table === "ratings") {
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: "John Seller" } })
      };
    });

    render(
      <MemoryRouter>
        <SellerReviewsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Leave a Review/i)).toBeInTheDocument();
    });

    const stars = screen.getAllByText("★");
    fireEvent.click(stars[3]); // Sets rating to 4 stars

    const textInput = screen.getByPlaceholderText(/Describe your experience.../i);
    fireEvent.change(textInput, { target: { value: "Great transaction interface." } });

    const submitBtn = screen.getByRole("button", { name: /Post Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        score: 4,
        comment: "Great transaction interface.",
        transaction_id: "tx-456"
      }));
      expect(mockNavigate).toHaveBeenCalledWith("/history");
    });
  });

  test("guards submission pipelines safely when no interactive stars are selected", async () => {
    mockSearchParam = "?action=rate";

    render(
      <MemoryRouter>
        <SellerReviewsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Post Review/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Post Review/i });
    fireEvent.click(submitBtn);

    expect(window.alert).toHaveBeenCalledWith("Please select a rating score!");
  });

  test("handles database write operational failures within the submission loop cleanly", async () => {
    mockSearchParam = "?action=rate";

    supabase.from.mockImplementation((table) => {
      if (table === "ratings") {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: { message: "Database connection lost" } }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: "John Seller" } })
      };
    });

    render(
      <MemoryRouter>
        <SellerReviewsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Post Review/i })).toBeInTheDocument();
    });

    const stars = screen.getAllByText("★");
    fireEvent.click(stars[4]); // 5 Stars

    const submitBtn = screen.getByRole("button", { name: /Post Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to submit review: Database connection lost");
    });
  });
});