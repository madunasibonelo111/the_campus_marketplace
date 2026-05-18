import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ModerationQueue from "./ModerationQueue";
import { supabase } from "../../supabase/supabaseClient";

// Mock the Supabase client
vi.mock("../../supabase/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

describe("ModerationQueue Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console.error so our terminal stays clean when we intentionally trigger errors
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
    supabase.rpc.mockResolvedValueOnce({
      data: [{
        flag_id: "flag-123",
        item_id: "item-999",
        reporter_name: "Alice",
        reason: "Spam",
        created_at: "2026-05-18T10:00:00Z"
      }],
      error: null
    });
    render(<ModerationQueue />);
    await waitFor(() => {
      expect(screen.getByText(/Alice/i)).toBeInTheDocument();
      expect(screen.getByText(/Spam/i)).toBeInTheDocument();
    });
  });

  it("calls the resolve RPC when the Dismiss button is clicked", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ flag_id: "flag-123", item_id: "item-999", reporter_name: "Alice", reason: "Spam", created_at: "2026-05-18T10:00:00Z" }],
      error: null
    });
    render(<ModerationQueue />);

    const dismissButton = await screen.findByRole("button", { name: /Dismiss/i });
    
    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null }); 

    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("resolve_flagged_item", {
        p_flag_id: "flag-123",
        p_action_status: "dismissed"
      });
    });
  });

  // ✅ ADDED FOR 80%+ COVERAGE: Test the "Remove Item" branch
  it("calls the resolve RPC with 'removed' when the Remove button is clicked", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ flag_id: "flag-124", item_id: "item-888", reporter_name: "Bob", reason: "Inappropriate", created_at: "2026-05-18T10:00:00Z" }],
      error: null
    });
    render(<ModerationQueue />);

    const removeButton = await screen.findByRole("button", { name: /Remove/i });
    
    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: null }) 
      .mockResolvedValueOnce({ data: [], error: null });

    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("resolve_flagged_item", {
        p_flag_id: "flag-124",
        p_action_status: "removed"
      });
    });
  });

  // ✅ ADDED FOR 80%+ COVERAGE: Test the error branch during initial fetch
  it("handles errors gracefully when fetching the queue fails", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "Database offline" } });
    
    render(<ModerationQueue />);

    // We just need to wait for the RPC to be called so the error state block executes
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("get_pending_flags");
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ✅ ADDED FOR 80%+ COVERAGE: Test the error branch when taking an action fails
  it("handles errors gracefully when resolving a flag fails", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ flag_id: "flag-125", item_id: "item-777", reporter_name: "Charlie", reason: "Scam", created_at: "2026-05-18T10:00:00Z" }],
      error: null
    });
    render(<ModerationQueue />);

    const dismissButton = await screen.findByRole("button", { name: /Dismiss/i });
    
    // Force the action to fail
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "Action blocked by RLS" } });

    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("resolve_flagged_item", expect.anything());
      expect(console.error).toHaveBeenCalled();
    });
  });
});