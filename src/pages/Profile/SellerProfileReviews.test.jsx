
import React from "react";
import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
} from "vitest";

import {
  render,
  screen,
} from "@testing-library/react";

import "@testing-library/jest-dom";

import {
  MemoryRouter,
  Routes,
  Route,
} from "react-router-dom";

// ---------------- HOISTED MOCKS ----------------

const {
  mockNavigate,
  mockGetUser,
  mockProfilesSingle,
  mockRatingsOrder,
  mockProfilesIn,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetUser: vi.fn(),
  mockProfilesSingle: vi.fn(),
  mockRatingsOrder: vi.fn(),
  mockProfilesIn: vi.fn(),
}));

// ---------------- SUPABASE MOCK ----------------

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },

    from: vi.fn((table) => {
      // profiles table
      if (table === "profiles") {
        return {
          select: vi.fn((query) => {
            // seller profile fetch
            if (query === "name") {
              return {
                eq: vi.fn(() => ({
                  single: mockProfilesSingle,
                })),
              };
            }

            // reviewer profiles fetch
            if (query === "id, name") {
              return {
                in: mockProfilesIn,
              };
            }

            return {};
          }),
        };
      }

      // ratings table
      if (table === "ratings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: mockRatingsOrder,
            })),
          })),
        };
      }

      return {};
    }),
  },
}));

// ---------------- ROUTER MOCK ----------------

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// import AFTER mocks
import SellerProfileReviews from "./SellerProfileReviews";

// ---------------- RENDER HELPER ----------------

function renderComponent(
  initialRoute = "/reviews/seller-1"
) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/reviews/:sellerId"
          element={<SellerProfileReviews />}
        />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------- TESTS ----------------

describe("SellerProfileReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });

    mockProfilesSingle.mockResolvedValue({
      data: {
        name: "John Seller",
      },
      error: null,
    });

    mockRatingsOrder.mockResolvedValue({
      data: [
        {
          id: 1,
          reviewer_id: "reviewer-1",
          score: 5,
          comment: "Amazing seller!",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });

    mockProfilesIn.mockResolvedValue({
      data: [
        {
          id: "reviewer-1",
          name: "Mike",
        },
      ],
      error: null,
    });
  });

  test("renders loading state", async () => {
    renderComponent();

    expect(
      screen.getByText(/loading reviews/i)
    ).toBeInTheDocument();

    await screen.findByText(
      /john seller reviews/i
    );
  });

  test("renders seller reviews heading", async () => {
    renderComponent();

    expect(
      await screen.findByText(
        /john seller reviews/i
      )
    ).toBeInTheDocument();
  });

  test("renders average rating", async () => {
    renderComponent();

    expect(
      await screen.findByText(/5\.0★/i)
    ).toBeInTheDocument();
  });

  test("renders review comment", async () => {
    renderComponent();

    expect(
      await screen.findByText(
        /amazing seller/i
      )
    ).toBeInTheDocument();
  });

  test("renders reviewer name", async () => {
    renderComponent();

    expect(
      await screen.findByText(/by: mike/i)
    ).toBeInTheDocument();
  });

  test("renders stars correctly", async () => {
    renderComponent();

    expect(
      await screen.findByText("★★★★★")
    ).toBeInTheDocument();
  });

  test("shows no reviews message", async () => {
    mockRatingsOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    renderComponent();

    expect(
      await screen.findByText(
        /no reviews yet/i
      )
    ).toBeInTheDocument();
  });

  test("renders back button", async () => {
    renderComponent();

    const backButton =
      await screen.findByRole("button", {
        name: /back/i,
      });

    expect(backButton).toBeInTheDocument();
  });

  test("navigates back when back button clicked", async () => {
    renderComponent();

    const backButton =
      await screen.findByRole("button", {
        name: /back/i,
      });

    backButton.click();

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});