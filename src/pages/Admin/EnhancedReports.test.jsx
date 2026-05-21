import React from "react";

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

import "@testing-library/jest-dom";

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
} from "vitest";

import EnhancedReports from "./EnhancedReports";

import { supabase } from "@/supabase/supabaseClient";

import * as XLSX from "xlsx";

/* =========================
   PDF MOCK
========================== */

const mockSave = vi.fn();

vi.mock("jspdf", () => {

  return {
    default: vi.fn(function () {

      return {
        setFontSize: vi.fn(),
        text: vi.fn(),
        save: mockSave,
        lastAutoTable: {
          finalY: 100,
        },
      };

    }),
  };

});

vi.mock(
  "jspdf-autotable",
  () => ({
    default: vi.fn(),
  })
);

/* =========================
   SUPABASE MOCK
========================== */

vi.mock(
  "@/supabase/supabaseClient",
  () => ({
    supabase: {
      rpc: vi.fn(),
    },
  })
);

/* =========================
   XLSX MOCK
========================== */

vi.mock("xlsx", () => ({

  utils: {

    book_new:
      vi.fn(() => ({})),

    json_to_sheet:
      vi.fn(() => ({})),

    book_append_sheet:
      vi.fn(),

  },

  writeFile: vi.fn(),

}));

/* =========================
   MOCK DATA
========================== */

const mockTransactions = [
  {
    id: "1",
    listing_id: "listing-1",
    status: "completed",
    total_amount: 100,
    amount_paid: 100,
    remaining_balance: 0,
  },
];

const mockListings = [
  {
    id: "listing-1",
    title: "MacBook Pro",
    status: "active",
  },
];

const mockPayments = [
  {
    id: "payment-1",
    status: "completed",
    amount: 100,
    method: "cash",
  },
];

const mockFlagged = [
  {
    id: "flag-1",
    content_type: "listing",
    reason: "Spam",
    status: "pending",
  },
];

const mockFacility = [
  {
    id: "facility-1",
  },
];

/* =========================
   HELPERS
========================== */

const setupRpcMocks = () => {

  supabase.rpc

    .mockResolvedValueOnce({
      data: mockTransactions,
    })

    .mockResolvedValueOnce({
      data: mockListings,
    })

    .mockResolvedValueOnce({
      data: mockPayments,
    })

    .mockResolvedValueOnce({
      data: mockFlagged,
    })

    .mockResolvedValueOnce({
      data: mockFacility,
    });

};

/* =========================
   BEFORE EACH
========================== */

beforeEach(() => {

  vi.clearAllMocks();

  setupRpcMocks();

});

/* =========================
   TESTS
========================== */

describe(
  "EnhancedReports Component",
  () => {

    test(
      "renders loading state",
      () => {

        render(
          <EnhancedReports />
        );

        expect(
          screen.getByText(
            /Loading Reports/i
          )
        ).toBeInTheDocument();

      }
    );

    test(
      "renders dashboard title",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            screen.getByText(
              /Campus Marketplace Reports/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    test(
      "renders statistics cards",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            screen.getByText(
              /Transactions/i
            )
          ).toBeInTheDocument();

          expect(
            screen.getAllByText(
              /Listings/i
            )[0]
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              /Payments/i
            )
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              /Flagged Content/i
            )
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              /Facility Reports/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    test(
      "shows active listings text",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            screen.getByText(
              /active listings remaining/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    test(
      "calculates revenue correctly",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            screen.getByText(
              /100.00/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    test(
      "calls supabase rpc",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            supabase.rpc
          ).toHaveBeenCalled();

        });

      }
    );

    test(
      "opens export dropdown",
      async () => {

        render(
          <EnhancedReports />
        );

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /Export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        expect(
          screen.getByText(
            /Export PDF/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /Export CSV/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /Export Excel/i
          )
        ).toBeInTheDocument();

      }
    );

    test(
      "exports PDF",
      async () => {

        render(
          <EnhancedReports />
        );

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /Export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        fireEvent.click(
          screen.getByText(
            /Export PDF/i
          )
        );

        expect(mockSave)
          .toHaveBeenCalled();

      }
    );

    test(
      "exports Excel",
      async () => {

        render(
          <EnhancedReports />
        );

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /Export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        fireEvent.click(
          screen.getByText(
            /Export Excel/i
          )
        );

        expect(
          XLSX.writeFile
        ).toHaveBeenCalled();

      }
    );

    test(
      "exports CSV",
      async () => {

        global.URL.createObjectURL =
          vi.fn();

        global.URL.revokeObjectURL =
          vi.fn();

        render(
          <EnhancedReports />
        );

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /Export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        fireEvent.click(
          screen.getByText(
            /Export CSV/i
          )
        );

        expect(
          URL.createObjectURL
        ).toHaveBeenCalled();

      }
    );

    test(
      "shows alert for invalid dates",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            screen.getByDisplayValue(
              "2024-01-01"
            )
          ).toBeInTheDocument();

        });

        window.alert = vi.fn();

        const startInput =
          screen.getByDisplayValue(
            "2024-01-01"
          );

        const endInput =
          screen.getByDisplayValue(
            "2030-12-31"
          );

        fireEvent.change(
          startInput,
          {
            target: {
              value:
                "2035-01-01",
            },
          }
        );

        fireEvent.change(
          endInput,
          {
            target: {
              value:
                "2020-01-01",
            },
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /Generate Report/i,
            }
          )
        );

        await waitFor(() => {

          expect(
            window.alert
          ).toHaveBeenCalled();

        });

      }
    );

    test(
      "handles rpc errors",
      async () => {

        vi.clearAllMocks();

        console.error =
          vi.fn();

        supabase.rpc.mockRejectedValue(
          new Error(
            "RPC failed"
          )
        );

        render(
          <EnhancedReports />
        );

        fireEvent.click(
          await screen.findByRole(
            "button",
            {
              name:
                /Generate Report/i,
            }
          )
        );

        await waitFor(() => {

          expect(
            console.error
          ).toHaveBeenCalled();

        });

      }
    );

    test(
      "updates date inputs",
      async () => {

        render(
          <EnhancedReports />
        );

        await waitFor(() => {

          expect(
            screen.getByDisplayValue(
              "2024-01-01"
            )
          ).toBeInTheDocument();

        });

        const startInput =
          screen.getByDisplayValue(
            "2024-01-01"
          );

        fireEvent.change(
          startInput,
          {
            target: {
              value:
                "2025-01-01",
            },
          }
        );

        expect(
          startInput.value
        ).toBe(
          "2025-01-01"
        );

      }
    );

  }
);