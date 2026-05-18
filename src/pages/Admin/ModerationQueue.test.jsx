import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import ModerationQueue from "./ModerationQueue";
import { supabase } from "../../supabase/supabaseClient";

// Mock the Supabase client
vi.mock("../../supabase/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

describe("ModerationQueue Unit Tests & Branch Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console.error and window.alert so our terminal stays clean during error simulations
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it("renders the loading state initially", () => {
    supabase.rpc.mockImplementationOnce(() => new Promise(() => {}));
    render(<ModerationQueue />);
    expect(screen.getByText(/Loading Moderation Queue/i)).toBeInTheDocument();
  });

  it("displays the empty state when there are no pending flags", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    render(<ModerationQueue />);
    await waitFor(() => {
      expect(screen.getByText(/No pending flags/i)).toBeInTheDocument();
    });
  });

  it("renders the table with flagged items successfully", async () => {
    const mockFlags = [
      {
        flag_id: "flag-123",
        item_id: "item-11122233",
        reporter_name: "Alice Smith",
        reason: "Counterfeit product",
        created_at: "2026-05-18T08:30:00.000Z"
      }
    ];

    supabase.rpc.mockResolvedValueOnce({ data: mockFlags, error: null });
    render(<ModerationQueue />);

    expect(await screen.findByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Counterfeit product")).toBeInTheDocument();
    expect(screen.getByText("item-111...")).toBeInTheDocument();
  });

  it("handles clicking Dismiss successfully and refreshes the list", async () => {
    // 1st call: Fetch items initially
    supabase.rpc.mockResolvedValueOnce({
      data: [{ flag_id: "flag-124", item_id: "item-44455566", reporter_name: "Bob Jones", reason: "Spam Link", created_at: "2026-05-18T09:00:00.000Z" }],
      error: null
    });

    render(<ModerationQueue />);
    const dismissButton = await screen.findByRole("button", { name: /Dismiss/i });

    // 2nd call: Action mutation execution resolves happily
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    // 3rd call: Refresh re-fetch queue resolves with empty list
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("resolve_flagged_item", {
        p_flag_id: "flag-124",
        p_action_status: "dismissed"
      });
    });
  });

  it("handles clicking Remove successfully and refreshes the list", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ flag_id: "flag-125", item_id: "item-999aaabb", reporter_name: "Charlie Brown", reason: "Harassment", created_at: "2026-05-18T09:15:00.000Z" }],
      error: null
    });

    render(<ModerationQueue />);
    const removeButton = await screen.findByRole("button", { name: /Remove/i });

    // Action call and refresh re-fetch mock
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("resolve_flagged_item", {
        p_flag_id: "flag-125",
        p_action_status: "removed"
      });
    });
  });

  /* ======================================================================
      🚀 COVERAGE BOOSTER: MUTATION & RETRIEVAL ERROR FALLBACKS
     ====================================================================== */

  it("handles errors gracefully when fetching the queue fails", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "Database offline" } });
    
    render(<ModerationQueue />);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("get_pending_flags");
      expect(console.error).toHaveBeenCalledWith('Error fetching flags:', { message: "Database offline" });
      expect(screen.getByText(/Failed to load moderation queue/i)).toBeInTheDocument();
    });
  });

  it("handles errors gracefully when resolving a flag fails", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ flag_id: "flag-126", item_id: "item-777", reporter_name: "Charlie", reason: "Scam", created_at: "2026-05-18T10:00:00Z" }],
      error: null
    });
    render(<ModerationQueue />);

    const dismissButton = await screen.findByRole("button", { name: /Dismiss/i });
    
    // Force the resolve action call to throw an error payload
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "Permission Denied" } });

    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error applying action dismissed:', { message: "Permission Denied" });
      // Corrected to match the actual alert text inside your code
      expect(window.alert).toHaveBeenCalledWith("Failed to resolve the item. Please check your connection and try again.");
    });
  });
});