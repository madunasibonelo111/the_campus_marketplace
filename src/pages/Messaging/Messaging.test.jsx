import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Messaging from "./Messaging";

// =========================
// SAFE SUPABASE MOCK
// =========================
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [] })),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [] })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({})),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// =========================
// ROUTER MOCK
// =========================
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// =========================
// TEST SUITE (6 TESTS)
// =========================
describe("Messaging.jsx - BASIC FLOW", () => {

  it("renders main layout correctly", () => {
    render(<Messaging />);

    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(screen.getByText("Listings")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("shows default empty state", () => {
    render(<Messaging />);

    expect(
      screen.getByText("Select a chat or listing")
    ).toBeInTheDocument();
  });

  it("renders Back button", () => {
    render(<Messaging />);

    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("does NOT show input before chat selection", () => {
    render(<Messaging />);

    expect(
      screen.queryByPlaceholderText("Type a message...")
    ).toBeNull();
  });

  it("renders chat section title correctly", () => {
    render(<Messaging />);

    expect(screen.getByText("Chats")).toBeInTheDocument();
  });

  it("renders listings section correctly", () => {
    render(<Messaging />);

    expect(screen.getByText("Listings")).toBeInTheDocument();
  });

});