import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SellerReviewsPage from "./SellerProfileReviews.jsx";

global.alert = vi.fn();

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGetUser = vi.fn();

const mockProfilesSingle = vi.fn();
const mockRatingsOrder = vi.fn();
const mockRatingsInsert = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },

    from: vi.fn((table) => {
      // Profiles table
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockProfilesSingle,
            })),
          })),
        };
      }

      // Ratings table
      if (table === "ratings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: mockRatingsOrder,
              eq: vi.fn(() => ({
                maybeSingle: mockMaybeSingle,
              })),
            })),
          })),

          insert: mockRatingsInsert,
        };
      }

      return {};
    }),
  },
}));

describe("SellerReviewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "current-user",
        },
      },
    });

    mockProfilesSingle.mockResolvedValue({
      data: {
        name: "Alice",
      },
      error: null,
    });

    mockRatingsOrder.mockResolvedValue({
      data: [
        {
          id: "1",
          score: 5,
          comment: "Amazing seller",
          created_at: "2026-05-10",
        },
        {
          id: "2",
          score: 4,
          comment: "Smooth transaction",
          created_at: "2026-05-09",
        },
      ],
      error: null,
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
    });

    mockRatingsInsert.mockResolvedValue({
      error: null,
    });
  });

  it("renders loading state initially", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/reviews/123"]}>
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(await screen.findByText(/Alice Reviews/i)).toBeInTheDocument();
  });

  it("renders seller name and review stats", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/reviews/123"]}>
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(await screen.findByText(/Alice Reviews/i)).toBeInTheDocument();

    expect(await screen.findByText("4.5★")).toBeInTheDocument();

    expect(await screen.findByText(/2 Total Reviews/i)).toBeInTheDocument();
  });

  it("renders all reviews", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/reviews/123"]}>
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(await screen.findByText(/Amazing seller/i)).toBeInTheDocument();

    expect(
      await screen.findByText(/Smooth transaction/i)
    ).toBeInTheDocument();
  });

  it("shows leave review button when user exists", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/reviews/123"]}>
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(
      await screen.findByText(/Leave a Review/i)
    ).toBeInTheDocument();
  });

  it("shows review form in rate mode", async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={["/reviews/123?action=rate"]}
        >
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(await screen.findByText(/Post Review/i)).toBeInTheDocument();

    expect(
      await screen.findByPlaceholderText(
        /Describe your experience/i
      )
    ).toBeInTheDocument();
  });

  it("alerts if no star rating selected", async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={["/reviews/123?action=rate"]}
        >
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    const submitBtn = await screen.findByText(/Post Review/i);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Please select a star rating"
    );
  });

  it("submits a review successfully", async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={["/reviews/123?action=rate"]}
        >
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    const stars = screen.getAllByText("★");

    await act(async () => {
      fireEvent.click(stars[4]);
    });

    const textarea = screen.getByPlaceholderText(
      /Describe your experience/i
    );

    fireEvent.change(textarea, {
      target: {
        value: "Very trustworthy seller",
      },
    });

    const submitBtn = screen.getByText(/Post Review/i);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockRatingsInsert).toHaveBeenCalled();

    expect(global.alert).toHaveBeenCalledWith(
      "Review submitted!"
    );
  });

  it("shows no reviews message when reviews array is empty", async () => {
    mockRatingsOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/reviews/123"]}>
          <Routes>
            <Route
              path="/reviews/:sellerId"
              element={<SellerReviewsPage />}
            />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(
      await screen.findByText(/No reviews yet/i)
    ).toBeInTheDocument();
  });
});