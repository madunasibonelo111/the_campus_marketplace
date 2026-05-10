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
} from "@testing-library/react";

import "@testing-library/jest-dom";

// ---------------- HOISTED MOCKS ----------------

const {
  mockTradeOffersOrder,
  mockTradeOffersUpdateEq,
  mockTransactionsInsert,
  mockListingsUpdateEq,
} = vi.hoisted(() => ({
  mockTradeOffersOrder:
    vi.fn(),

  mockTradeOffersUpdateEq:
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
      from: vi.fn(
        (table) => {

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
                    mockTradeOffersUpdateEq,
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
        }
      ),
    },
  })
);

// import AFTER mocks
import TradeOffers from "./TradeOffers";

// ---------------- MOCK DATA ----------------

const currentUser = {
  id: "user-1",
};

const tradeOffer = {
  id: "trade-1",

  sender_id: "user-2",

  receiver_id: "user-1",

  requested_listing_id:
    "listing-1",

  offered_item_title:
    "Playstation 5",

  offered_item_description:
    "PS5 Console",

  offered_item_condition:
    "good",

  offered_item_images: [
    "ps5.jpg",
  ],

  status: "pending",

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

    title:
      "Gaming Keyboard",

    price: 500,

    condition:
      "good",

    listing_images: [
      {
        image_url:
          "keyboard.jpg",
      },
    ],
  },
};

// ---------------- RENDER HELPER ----------------

function renderComponent(
  user = currentUser
) {
  return render(
    <TradeOffers
      currentUser={
        user
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
            tradeOffer,
          ],
          error: null,
        }
      );

      mockTradeOffersUpdateEq.mockResolvedValue(
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
      async () => {

        renderComponent();

        expect(
          screen.getByText(
            /loading trade offers/i
          )
        ).toBeInTheDocument();

        await screen.findByText(
          /gaming keyboard/i
        );
      }
    );

    test(
      "renders trade offer",
      async () => {

        renderComponent();

        expect(
          await screen.findByText(
            /gaming keyboard/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /playstation 5/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "renders accept and decline buttons for receiver",
      async () => {

        renderComponent();

        expect(
          await screen.findByRole(
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
      "shows waiting message for sender",
      async () => {

        render(
          <TradeOffers
            currentUser={{
              id:
                "user-2",
            }}
          />
        );

        expect(
          await screen.findByText(
            /waiting for seller response/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "accept trade updates status",
      async () => {

        renderComponent();

        const button =
          await screen.findByRole(
            "button",
            {
              name:
                /accept/i,
            }
          );

        fireEvent.click(
          button
        );

        await waitFor(
          () => {
            expect(
              mockTradeOffersUpdateEq
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

        const button =
          await screen.findByRole(
            "button",
            {
              name:
                /accept/i,
            }
          );

        fireEvent.click(
          button
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

        const button =
          await screen.findByRole(
            "button",
            {
              name:
                /accept/i,
            }
          );

        fireEvent.click(
          button
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

        const button =
          await screen.findByRole(
            "button",
            {
              name:
                /decline/i,
            }
          );

        fireEvent.click(
          button
        );

        await waitFor(
          () => {
            expect(
              mockTradeOffersUpdateEq
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
                ...tradeOffer,
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
                ...tradeOffer,
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