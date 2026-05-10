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
  mockUpload,
  mockGetPublicUrl,
  mockTradeInsertSelectSingle,
  mockConversationMaybeSingle,
  mockConversationInsertSelectSingle,
  mockMessagesInsert,
} = vi.hoisted(() => ({
  mockUpload: vi.fn(),

  mockGetPublicUrl:
    vi.fn(),

  mockTradeInsertSelectSingle:
    vi.fn(),

  mockConversationMaybeSingle:
    vi.fn(),

  mockConversationInsertSelectSingle:
    vi.fn(),

  mockMessagesInsert:
    vi.fn(),
}));

// ---------------- SUPABASE MOCK ----------------

vi.mock(
  "@/supabase/supabaseClient",
  () => ({
    supabase: {
      storage: {
        from: vi.fn(() => ({
          upload:
            mockUpload,

          getPublicUrl:
            mockGetPublicUrl,
        })),
      },

      from: vi.fn(
        (table) => {
          // -------- trade_offers --------

          if (
            table ===
            "trade_offers"
          ) {
            return {
              insert: vi.fn(
                () => ({
                  select:
                    vi.fn(
                      () => ({
                        single:
                          mockTradeInsertSelectSingle,
                      })
                    ),
                })
              ),
            };
          }

          // -------- conversations --------

          if (
            table ===
            "conversations"
          ) {
            return {
              select: vi.fn(
                () => ({
                  eq: vi.fn(
                    () => ({
                      or: vi.fn(
                        () => ({
                          maybeSingle:
                            mockConversationMaybeSingle,
                        })
                      ),
                    })
                  ),
                })
              ),

              insert: vi.fn(
                () => ({
                  select:
                    vi.fn(
                      () => ({
                        single:
                          mockConversationInsertSelectSingle,
                      })
                    ),
                })
              ),
            };
          }

          // -------- messages --------

          if (
            table ===
            "messages"
          ) {
            return {
              insert:
                mockMessagesInsert,
            };
          }

          return {};
        }
      ),
    },
  })
);

// import AFTER mocks
import TradeOfferModal from "./TradeOfferModal";

// ---------------- MOCK DATA ----------------

const mockOnClose =
  vi.fn();

const mockUser = {
  id: "user-1",
};

const mockListing = {
  id: "listing-1",

  user_id: "seller-1",

  title:
    "Gaming Keyboard",

  description:
    "Mechanical keyboard",

  condition: "good",

  price: 500,

  listing_images: [
    {
      image_url:
        "keyboard.jpg",
    },
  ],
};

// ---------------- RENDER HELPER ----------------

function renderComponent(
  open = true
) {
  return render(
    <TradeOfferModal
      open={open}
      onClose={
        mockOnClose
      }
      currentUser={
        mockUser
      }
      requestedListing={
        mockListing
      }
    />
  );
}

// ---------------- TESTS ----------------

describe(
  "TradeOfferModal",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      global.alert =
        vi.fn();

      mockUpload.mockResolvedValue(
        {
          error: null,
        }
      );

      mockGetPublicUrl.mockReturnValue(
        {
          data: {
            publicUrl:
              "image.jpg",
          },
        }
      );

      mockTradeInsertSelectSingle.mockResolvedValue(
        {
          data: {
            id:
              "trade-1",
          },

          error: null,
        }
      );

      mockConversationMaybeSingle.mockResolvedValue(
        {
          data: {
            id:
              "conversation-1",
          },
        }
      );

      mockConversationInsertSelectSingle.mockResolvedValue(
        {
          data: {
            id:
              "conversation-1",
          },

          error: null,
        }
      );

      mockMessagesInsert.mockResolvedValue(
        {
          error: null,
        }
      );
    });

    test(
      "renders modal when open",
      () => {
        renderComponent();

        expect(
          screen.getByRole(
            "heading",
            {
              name:
                /trade offer/i,
            }
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "does not render when closed",
      () => {
        renderComponent(
          false
        );

        expect(
          screen.queryByRole(
            "heading",
            {
              name:
                /trade offer/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );

    test(
      "renders requested listing details",
      () => {
        renderComponent();

        expect(
          screen.getByText(
            /gaming keyboard/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /mechanical keyboard/i
          )
        ).toBeInTheDocument();
      }
    );

    test(
      "close button calls onClose",
      () => {
        renderComponent();

        const closeButton =
          screen.getByRole(
            "button",
            {
              name: "✕",
            }
          );

        fireEvent.click(
          closeButton
        );

        expect(
          mockOnClose
        ).toHaveBeenCalled();
      }
    );

    test(
      "shows alert if user not logged in",
      () => {
        render(
          <TradeOfferModal
            open={true}
            onClose={
              mockOnClose
            }
            currentUser={
              null
            }
            requestedListing={
              mockListing
            }
          />
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /send trade offer/i,
            }
          )
        );

        expect(
          global.alert
        ).toHaveBeenCalledWith(
          "Please log in first"
        );
      }
    );

    test(
      "shows validation for empty title",
      () => {
        renderComponent();

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /send trade offer/i,
            }
          )
        );

        expect(
          global.alert
        ).toHaveBeenCalledWith(
          "Please enter your item title"
        );
      }
    );

    test(
      "uploads image successfully",
      () => {
        renderComponent();

        const file =
          new File(
            ["hello"],
            "test.png",
            {
              type:
                "image/png",
            }
          );

        const input =
          document.querySelector(
            'input[type="file"]'
          );

        fireEvent.change(
          input,
          {
            target: {
              files: [
                file,
              ],
            },
          }
        );

        expect(
          input.files[0]
            .name
        ).toBe(
          "test.png"
        );
      }
    );

    test(
      "submits trade offer successfully",
      async () => {
        renderComponent();

        fireEvent.change(
          screen.getByPlaceholderText(
            /jbl speaker/i
          ),
          {
            target: {
              value:
                "Playstation",
            },
          }
        );

        fireEvent.change(
          screen.getByPlaceholderText(
            /describe your item/i
          ),
          {
            target: {
              value:
                "PS5 Console",
            },
          }
        );

        const file =
          new File(
            ["hello"],
            "trade.png",
            {
              type:
                "image/png",
            }
          );

        const fileInput =
          document.querySelector(
            'input[type="file"]'
          );

        fireEvent.change(
          fileInput,
          {
            target: {
              files: [
                file,
              ],
            },
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /send trade offer/i,
            }
          )
        );

        await waitFor(
          () => {
            expect(
              mockUpload
            ).toHaveBeenCalled();

            expect(
              mockTradeInsertSelectSingle
            ).toHaveBeenCalled();

            expect(
              mockMessagesInsert
            ).toHaveBeenCalled();

            expect(
              global.alert
            ).toHaveBeenCalledWith(
              "Trade offer sent successfully!"
            );

            expect(
              mockOnClose
            ).toHaveBeenCalled();
          }
        );
      }
    );

    test(
      "creates conversation if missing",
      async () => {
        mockConversationMaybeSingle.mockResolvedValue(
          {
            data:
              null,
          }
        );

        renderComponent();

        fireEvent.change(
          screen.getByPlaceholderText(
            /jbl speaker/i
          ),
          {
            target: {
              value:
                "Speaker",
            },
          }
        );

        fireEvent.change(
          screen.getByPlaceholderText(
            /describe your item/i
          ),
          {
            target: {
              value:
                "Bluetooth speaker",
            },
          }
        );

        const file =
          new File(
            ["hello"],
            "trade.png",
            {
              type:
                "image/png",
            }
          );

        const fileInput =
          document.querySelector(
            'input[type="file"]'
          );

        fireEvent.change(
          fileInput,
          {
            target: {
              files: [
                file,
              ],
            },
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /send trade offer/i,
            }
          )
        );

        await waitFor(
          () => {
            expect(
              mockConversationInsertSelectSingle
            ).toHaveBeenCalled();
          }
        );
      }
    );
  }
);