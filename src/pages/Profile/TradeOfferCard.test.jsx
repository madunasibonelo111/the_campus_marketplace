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
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

import "@testing-library/jest-dom";

// ---------------- HOISTED MOCKS ----------------

const {
  mockTradeOffersOrder,
  mockTradeUpdateEq,
  mockTransactionsInsert,
  mockListingsUpdateEq,
} = vi.hoisted(() => ({
  mockTradeOffersOrder:
    vi.fn(),

  mockTradeUpdateEq:
    vi.fn(),

  mockTransactionsInsert:
    vi.fn(),

  mockListingsUpdateEq:
    vi.fn(),
}));

// ---------------- SUPABASE MOCK ----------------

vi.mock(
  "@/supabase/supabaseClient",
  () => ({
    supabase: {
      from: vi.fn((table) => {
        // -------- trade_offers --------

        if (
          table ===
          "trade_offers"
        ) {
          return {
            select: vi.fn(
              () => ({
                or: vi.fn(
                  () => ({
                    order:
                      mockTradeOffersOrder,
                  })
                ),
              })
            ),

            update: vi.fn(
              () => ({
                eq:
                  mockTradeUpdateEq,
              })
            ),
          };
        }

        // -------- transactions --------

        if (
          table ===
          "transactions"
        ) {
          return {
            insert:
              mockTransactionsInsert,
          };
        }

        // -------- listings --------

        if (
          table ===
          "listings"
        ) {
          return {
            update: vi.fn(
              () => ({
                eq:
                  mockListingsUpdateEq,
              })
            ),
          };
        }

        return {};
      }),
    },
  })
);

// import AFTER mocks
import TradeOffers from "./TradeOffers";

// ---------------- MOCK USER ----------------

const mockUser = {
  id: "user-1",
};

// ---------------- MOCK TRADE ----------------

const mockTradeOffer = {
  id: "trade-1",

  sender_id: "user-2",

  receiver_id: "user-1",

  requested_listing_id:
    "listing-1",

  status: "pending",

  offered_item_title:
    "Gaming Mouse",

  offered_item_description:
    "RGB Mouse",

  offered_item_images: [
    "test-image.jpg",
  ],

  sender: {
    id: "user-2",
    name: "Mike",
  },

  receiver: {
    id: "user-1",
    name: "John",
  },

  requested_listing: {
    id: "listing-1",

    title: "Keyboard",

    condition: "Good",

    listing_images: [
      {
        image_url:
          "listing-image.jpg",
      },
    ],
  },
};

// ---------------- RENDER HELPER ----------------

function renderComponent() {
  return render(
    <TradeOffers
      currentUser={
        mockUser
      }
    />
  );
}

// ---------------- TESTS ----------------

describe(
  "TradeOffers",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      global.alert =
        vi.fn();

      mockTradeOffersOrder.mockResolvedValue(
        {
          data: [
            mockTradeOffer,
          ],

          error: null,
        }
      );

      mockTradeUpdateEq.mockResolvedValue(
        {
          error: null,
        }
      );

      mockTransactionsInsert.mockResolvedValue(
        {
          error: null,
        }
      );

      mockListingsUpdateEq.mockResolvedValue(
        {
          error: null,
        }
      );
    });

    test(
      "renders loading state",
      () => {
        renderComponent();

        expect(
          screen.getByText(
            /loading trade offers/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "renders trade offer",
      async () => {
        renderComponent();

        expect(
          await screen.findByText(
            /mike/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /gaming mouse/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /keyboard/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "renders accept and decline buttons for receiver",
      async () => {
        renderComponent();

        await screen.findByText(
          /gaming mouse/i
        );

        expect(
          screen.getByRole(
            "button",
            {
              name:
                /accept/i,
            }
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "button",
            {
              name:
                /decline/i,
            }
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "accept trade updates status",
      async () => {
        renderComponent();

        await screen.findByText(
          /gaming mouse/i
        );

        const acceptButton =
          screen.getByRole(
            "button",
            {
              name:
                /accept/i,
            }
          );

        await act(
          async () => {
            fireEvent.click(
              acceptButton
            );
          }
        );

        await waitFor(
          () => {
            expect(
              mockTradeUpdateEq
            ).toHaveBeenCalledWith(
              "id",
              "trade-1"
            );
          }
        );
      }
    );

    test(
      "accept trade inserts transaction",
      async () => {
        renderComponent();

        await screen.findByText(
          /gaming mouse/i
        );

        const acceptButton =
          screen.getByRole(
            "button",
            {
              name:
                /accept/i,
            }
          );

        await act(
          async () => {
            fireEvent.click(
              acceptButton
            );
          }
        );

        await waitFor(
          () => {
            expect(
              mockTransactionsInsert
            ).toHaveBeenCalled();
          }
        );
      }
    );

    test(
      "accept trade updates listing status",
      async () => {
        renderComponent();

        await screen.findByText(
          /gaming mouse/i
        );

        const acceptButton =
          screen.getByRole(
            "button",
            {
              name:
                /accept/i,
            }
          );

        await act(
          async () => {
            fireEvent.click(
              acceptButton
            );
          }
        );

        await waitFor(
          () => {
            expect(
              mockListingsUpdateEq
            ).toHaveBeenCalledWith(
              "id",
              "listing-1"
            );
          }
        );
      }
    );

    test(
      "decline trade updates status",
      async () => {
        renderComponent();

        await screen.findByText(
          /gaming mouse/i
        );

        const declineButton =
          screen.getByRole(
            "button",
            {
              name:
                /decline/i,
            }
          );

        await act(
          async () => {
            fireEvent.click(
              declineButton
            );
          }
        );

        await waitFor(
          () => {
            expect(
              mockTradeUpdateEq
            ).toHaveBeenCalledWith(
              "id",
              "trade-1"
            );
          }
        );
      }
    );

    test(
      "shows empty state when no trade offers",
      async () => {
        mockTradeOffersOrder.mockResolvedValue(
          {
            data: [],

            error: null,
          }
        );

        renderComponent();

        expect(
          await screen.findByText(
            /no trade offers yet/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "renders accepted trade text",
      async () => {
        mockTradeOffersOrder.mockResolvedValue(
          {
            data: [
              {
                ...mockTradeOffer,

                status:
                  "accepted",
              },
            ],

            error: null,
          }
        );

        renderComponent();

        expect(
          await screen.findByText(
            /trade accepted/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "renders rejected trade text",
      async () => {
        mockTradeOffersOrder.mockResolvedValue(
          {
            data: [
              {
                ...mockTradeOffer,

                status:
                  "rejected",
              },
            ],

            error: null,
          }
        );

        renderComponent();

        expect(
          await screen.findByText(
            /trade declined/i
          )
        ).toBeInTheDocument();
      }
    );
  }
);