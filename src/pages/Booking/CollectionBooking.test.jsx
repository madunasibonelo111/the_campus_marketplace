import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CollectionBooking from "./CollectionBooking";
import { supabase } from "@/supabase/supabaseClient";

// Mock Supabase layers completely
jest.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    },
    from: jest.fn()
  }
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: { transactionId: "mock-tx-123" }
  })
}));

describe("CollectionBooking Component Testing Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock user session resolution
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-buyer-789" } } },
      error: null
    });

    // Mock chaining methods for Supabase queries
    const mockSupabaseBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
      maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis()
    };

    supabase.from.mockReturnValue(mockSupabaseBuilder);
  });

  test("Renders loader while prerequisites compile", async () => {
    render(
      <MemoryRouter>
        <CollectionBooking />
      </MemoryRouter>
    );

    expect(screen.getByText(/Calculating valid schedules.../i)).toBeInTheDocument();
  });

  test("Validates authentication routing fallback redirects to login", async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null
    });

    render(
      <MemoryRouter>
        <CollectionBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  test("Confirms transaction values present on layout once loaded", async () => {
    // Setup precise mock state payloads
    supabase.from.mockImplementation((table) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        gte: () => chain,
        lte: () => chain,
        limit: () => chain,
        single: () => {
          if (table === "transactions") {
            return Promise.resolve({ data: { id: "tx-123", offer_amount: 800, listings: { title: "Tennis Racket" } } });
          }
          if (table === "facility_config") {
            return Promise.resolve({ data: { open_time: "09:00", close_time: "10:00", max_capacity_per_slot: 5, slot_duration_minutes: 30 } });
          }
          return Promise.resolve({ data: null });
        },
        maybeSingle: () => Promise.resolve({ data: { booking_date: "2026-05-18T09:00:00.000Z" } })
      };
      return chain;
    });

    render(
      <MemoryRouter>
        <CollectionBooking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Tennis Racket")).toBeInTheDocument();
      expect(screen.getByText("R800.00")).toBeInTheDocument();
    });
  });
});