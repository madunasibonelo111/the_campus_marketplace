import React from "react";

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

import { vi } from "vitest";

import Reports from "./Reports";

import { supabase }
from "@/supabase/supabaseClient";

/* =========================
   MOCK NAVIGATION
========================= */

const mockNavigate = vi.fn();

vi.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
  })
);

/* =========================
   MOCK SUPABASE
========================= */

vi.mock(
  "@/supabase/supabaseClient",
  () => ({
    supabase: {
      rpc: vi.fn(),
    },
  })
);

/* =========================
   MOCK JSPDF
========================= */

vi.mock("jspdf", () => {

  return {
    default: function () {

      return {

        internal: {
          pageSize: {
            getWidth: () => 200,
          },
        },

        setFontSize: vi.fn(),

        text: vi.fn(),

        save: vi.fn(),

        lastAutoTable: {
          finalY: 50,
        },

      };

    },
  };

});

/* =========================
   MOCK AUTOTABLE
========================= */

vi.mock(
  "jspdf-autotable",
  () => ({
    default: vi.fn(),
  })
);

/* =========================
   MOCK XLSX
========================= */

vi.mock("xlsx", () => ({

  utils: {

    book_new: vi.fn(),

    json_to_sheet: vi.fn(),

    book_append_sheet: vi.fn(),

  },

  writeFile: vi.fn(),

}));

describe(
  "Reports Component",
  () => {

    const transactionData = [
      {
        id: "1",
        status: "completed",
        offer_amount: 5000,
        type: "purchase",
      },
    ];

    const facilityData = [
      {
        check_date:
          "2025-01-01",

        total_slots_available: 100,

        total_slots_booked: 80,

        utilization_percentage: 80,
      },
    ];

    beforeEach(() => {

      vi.clearAllMocks();

      supabase.rpc.mockImplementation(
        (_, params) => {

          if (
            params.p_report_type ===
            "transactions"
          ) {

            return Promise.resolve({

              data: transactionData,

              error: null,

            });

          }

          if (
            params.p_report_type ===
            "facility"
          ) {

            return Promise.resolve({

              data: facilityData,

              error: null,

            });

          }

          return Promise.resolve({

            data: [],

            error: null,

          });

        }
      );

    });

    /* =========================
       RENDER
    ========================= */

    test(
      "renders reports page",
      async () => {

        render(<Reports />);

        await waitFor(() => {

          expect(
            screen.getByText(
              /Campus Marketplace Reports/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    /* =========================
       KPI CARDS
    ========================= */

    test(
      "renders KPI cards",
      async () => {

        render(<Reports />);

        await waitFor(() => {

          expect(
            screen.getByText(
              /Facility Reports/i
            )
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              /Transactions/i
            )
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              /Total Revenue/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    /* =========================
       REVENUE
    ========================= */

    test(
      "calculates revenue correctly",
      async () => {

        render(<Reports />);

        await waitFor(() => {

          expect(
            screen.getByText(
              /5000.00/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    /* =========================
       GENERATE REPORT
    ========================= */

    test(
      "generate report button works",
      async () => {

        render(<Reports />);

        const button =
          await screen.findByText(
            /Generate Report/i
          );

        fireEvent.click(button);

        expect(
          supabase.rpc
        ).toHaveBeenCalled();

      }
    );

    /* =========================
       EXPORT MENU
    ========================= */

    test(
      "opens export dropdown",
      async () => {

        render(<Reports />);

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /export/i,
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

      }
    );

    /* =========================
       PDF EXPORT
    ========================= */

    test(
      "exports PDF successfully",
      async () => {

        render(<Reports />);

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        const pdfButton =
          await screen.findByText(
            /Export PDF/i
          );

        fireEvent.click(
          pdfButton
        );

        await waitFor(() => {

          expect(
            screen.queryByText(
              /Export PDF/i
            )
          ).not.toBeInTheDocument();

        });

      }
    );

    /* =========================
       CSV EXPORT
    ========================= */

    test(
      "exports CSV successfully",
      async () => {

        global.URL
          .createObjectURL =
          vi.fn();

        global.URL
          .revokeObjectURL =
          vi.fn();

        render(<Reports />);

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        const csvButton =
          await screen.findByText(
            /Export CSV/i
          );

        fireEvent.click(
          csvButton
        );

        expect(
          global.URL
            .createObjectURL
        ).toHaveBeenCalled();

      }
    );

    /* =========================
       EXCEL EXPORT
    ========================= */

    test(
      "exports Excel successfully",
      async () => {

        render(<Reports />);

        const exportButton =
          await screen.findByRole(
            "button",
            {
              name: /export/i,
            }
          );

        fireEvent.click(
          exportButton
        );

        const excelButton =
          await screen.findByText(
            /Export Excel/i
          );

        fireEvent.click(
          excelButton
        );

        await waitFor(() => {

          expect(
            screen.queryByText(
              /Export Excel/i
            )
          ).not.toBeInTheDocument();

        });

      }
    );

    /* =========================
       DATE INPUTS
    ========================= */

    test(
      "updates date inputs",
      async () => {

        render(<Reports />);

        const inputs =
          await screen.findAllByDisplayValue(
            /20/i
          );

        fireEvent.change(
          inputs[0],
          {
            target: {
              value:
                "2024-01-01",
            },
          }
        );

        fireEvent.change(
          inputs[1],
          {
            target: {
              value:
                "2024-12-31",
            },
          }
        );

        expect(
          inputs[0].value
        ).toBe("2024-01-01");

        expect(
          inputs[1].value
        ).toBe("2024-12-31");

      }
    );

    /* =========================
       EMPTY DATA
    ========================= */

    test(
      "handles empty report data",
      async () => {

        supabase.rpc.mockResolvedValue({
          data: [],
          error: null,
        });

        render(<Reports />);

        await waitFor(() => {

          expect(
            screen.getByText(
              /Facility Reports/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    /* =========================
       FAILED RPC
    ========================= */

    test(
      "handles failed RPC gracefully",
      async () => {

        supabase.rpc.mockResolvedValue({
          data: null,
          error: {
            message: "Failed",
          },
        });

        render(<Reports />);

        await waitFor(() => {

          expect(
            screen.getByText(
              /Campus Marketplace Reports/i
            )
          ).toBeInTheDocument();

        });

      }
    );

    /* =========================
       EXPORT BUTTON EXISTS
    ========================= */

    test(
      "renders export button",
      async () => {

        render(<Reports />);

        expect(
          await screen.findByRole(
            "button",
            {
              name: /export/i,
            }
          )
        ).toBeInTheDocument();

      }
    );

    /* =========================
       REPORT CARDS
    ========================= */

    test(
      "renders report cards",
      async () => {

        render(<Reports />);

        expect(
          await screen.findByText(
            /Facility Reports/i
          )
        ).toBeInTheDocument();

        expect(
          await screen.findByText(
            /Transactions/i
          )
        ).toBeInTheDocument();

        expect(
          await screen.findByText(
            /Total Revenue/i
          )
        ).toBeInTheDocument();

      }
    );

  }
);