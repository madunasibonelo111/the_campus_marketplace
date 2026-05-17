import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
// changed import path target to run directly against the card file structure
import TradeOfferCard from "./TradeOfferCard";
import { supabase } from "@/supabase/supabaseClient";

const {
  mockTradeOffersOrder,
  mockTradeUpdateEq,
  mockTransactionsInsert,
  mockListingsUpdateEq,
} = vi.hoisted(() => ({
  mockTradeOffersOrder: vi.fn(),
  mockTradeUpdateEq: vi.fn(),
  mockTransactionsInsert: vi.fn(),
  mockListingsUpdateEq: vi.fn(),
}));

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === "trade_offers") {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              order: mockTradeOffersOrder,
            })),
          })),
          update: vi.fn(() => ({
            eq: mockTradeUpdateEq,
          })),
        };
      }
      if (table === "transactions") {
        return {
          insert: mockTransactionsInsert,
        };
      }
      if (table === "listings") {
        return {
          update: vi.fn(() => ({
            eq: mockListingsUpdateEq,
          })),
        };
      }
      return {};
    }),
  },
}));

const mockUser = {
  id: "user-1",
};

const mockTradeOffer = {
  id: "trade-1",
  sender_id: "user-2",
  receiver_id: "user-1",
  requested_listing_id: "listing-1",
  status: "pending",
  offered_item_title: "Gaming Mouse",
  offered_item_description: "RGB Mouse",
  offered_item_images: ["test-image.jpg"],
  sender: { id: "user-2", name: "Mike" },
  receiver: { id: "user-1", name: "John" },
  requested_listing: {
    id: "listing-1",
    title: "Keyboard",
    condition: "Good",
    listing_images: [{ image_url: "listing-image.jpg" }],
  },
};

function renderComponent() {
  // instantiate the tradeoffercard file directly
  return render(<TradeOfferCard currentUser={mockUser} />);
}

describe("TradeOffers Component Coverage and Boundary Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();

    mockTradeOffersOrder.mockResolvedValue({ data: [mockTradeOffer], error: null });
    mockTradeUpdateEq.mockResolvedValue({ error: null });
    mockTransactionsInsert.mockResolvedValue({ error: null });
    mockListingsUpdateEq.mockResolvedValue({ error: null });
  });

  test("renders loading spinner state initially while fetching requests", () => {
    mockTradeOffersOrder.mockImplementationOnce(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/loading trade offers/i)).toBeInTheDocument();
  });

  test("renders active incoming trade offer details correctly upon resolution", async () => {
    await act(async () => {
      renderComponent();
    });
    expect(await screen.findByText(/mike/i)).toBeInTheDocument();
    expect(screen.getByText(/gaming mouse/i)).toBeInTheDocument();
    expect(screen.getByText(/keyboard/i)).toBeInTheDocument();
  });

  test("renders action controls for the receiving student profile", async () => {
    await act(async () => {
      renderComponent();
    });
    await screen.findByText(/gaming mouse/i);
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
  });

  test("accepting a trade updates the specific offer entry status payload", async () => {
    await act(async () => {
      renderComponent();
    });
    await screen.findByText(/gaming mouse/i);

    const acceptButton = screen.getByRole("button", { name: /accept/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(mockTradeUpdateEq).toHaveBeenCalledWith("id", "trade-1");
    });
  });

  test("accepting a trade inserts a new row record into the transactions table", async () => {
    await act(async () => {
      renderComponent();
    });
    await screen.findByText(/gaming mouse/i);

    const acceptButton = screen.getByRole("button", { name: /accept/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(mockTransactionsInsert).toHaveBeenCalled();
    });
  });

  test("accepting a trade marks the requested item listing status as traded", async () => {
    await act(async () => {
      renderComponent();
    });
    await screen.findByText(/gaming mouse/i);

    const acceptButton = screen.getByRole("button", { name: /accept/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(mockListingsUpdateEq).toHaveBeenCalledWith("id", "listing-1");
    });
  });

  test("declining a trade updates the remote status target reference", async () => {
    await act(async () => {
      renderComponent();
    });
    await screen.findByText(/gaming mouse/i);

    const declineButton = screen.getByRole("button", { name: /decline/i });
    await act(async () => {
      fireEvent.click(declineButton);
    });

    await waitFor(() => {
      expect(mockTradeUpdateEq).toHaveBeenCalledWith("id", "trade-1");
    });
  });

  test("shows descriptive clean empty state message when booking queries return zero rows", async () => {
    mockTradeOffersOrder.mockResolvedValue({ data: [], error: null });
    await act(async () => {
      renderComponent();
    });
    expect(await screen.findByText(/no trade offers yet/i)).toBeInTheDocument();
  });

  test("renders correct confirmation string modifiers for pre-accepted trade cards", async () => {
    mockTradeOffersOrder.mockResolvedValue({
      data: [{ ...mockTradeOffer, status: "accepted" }],
      error: null,
    });
    await act(async () => {
      renderComponent();
    });
    expect(await screen.findByText(/trade accepted/i)).toBeInTheDocument();
  });

  test("renders correct negative indication labels for pre-declined trade rows", async () => {
    mockTradeOffersOrder.mockResolvedValue({
      data: [{ ...mockTradeOffer, status: "rejected" }],
      error: null,
    });
    await act(async () => {
      renderComponent();
    });
    expect(await screen.findByText(/trade declined/i)).toBeInTheDocument();
  });

  test("catches and alerts backend network errors gracefully inside warning boxes", async () => {
    mockTradeOffersOrder.mockResolvedValue({
      data: null,
      error: { message: "network connection interruption" },
    });
    await act(async () => {
      renderComponent();
    });
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("network connection interruption");
    });
  });

  test("handles update failure exceptions during status changes elegantly", async () => {
    await act(async () => {
      renderComponent();
    });
    await screen.findByText(/gaming mouse/i);

    mockTradeUpdateEq.mockResolvedValue({ error: { message: "failed to write row update" } });
    const acceptButton = screen.getByRole("button", { name: /accept/i });
    
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("failed to write row update");
    });
  });

  test("renders placeholder images seamlessly if item description image lists are missing", async () => {
    mockTradeOffersOrder.mockResolvedValue({
      data: [{
        ...mockTradeOffer,
        offered_item_images: null,
        requested_listing: { ...mockTradeOffer.requested_listing, listing_images: null }
      }],
      error: null
    });

    let container;
    await act(async () => {
      const rendered = renderComponent();
      container = rendered.container;
    });
    
    await waitFor(() => {
      const fallbackImages = container.querySelectorAll(".trade-item-image");
      expect(fallbackImages.length).toBeGreaterThan(0);
      expect(fallbackImages[0].getAttribute("src")).toBe("https://via.placeholder.com/300");
    });
  });

  test("verifies layout adjustments when current profile identity matches the sender id bounds", async () => {
    mockTradeOffersOrder.mockResolvedValue({
      data: [{ ...mockTradeOffer, sender_id: "user-1", receiver_id: "user-2" }],
      error: null
    });

    await act(async () => {
      renderComponent();
    });
    expect(await screen.findByText(/trade offer sent to/i)).toBeInTheDocument();
  });
});