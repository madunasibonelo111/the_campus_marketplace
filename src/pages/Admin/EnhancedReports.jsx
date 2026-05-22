import React, {
  useEffect,
  useState,
} from "react";

import { supabase }
from "@/supabase/supabaseClient";

import jsPDF from "jspdf";

import autoTable
from "jspdf-autotable";

import * as XLSX from "xlsx";

import "./EnhancedReports.css";

export default function EnhancedReports() {

  /* =========================
     STATES
  ========================== */

  const [
    facilityReports,
    setFacilityReports,
  ] = useState([]);

  const [
    transactions,
    setTransactions,
  ] = useState([]);

  const [
    listings,
    setListings,
  ] = useState([]);

  const [
    payments,
    setPayments,
  ] = useState([]);

  const [
    flaggedContent,
    setFlaggedContent,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    showExportMenu,
    setShowExportMenu,
  ] = useState(false);

  const [startDate, setStartDate] =
    useState("2024-01-01");

  const [endDate, setEndDate] =
    useState("2030-12-31");

  /* =========================
     DATE VALIDATION
  ========================== */

  const validateDates = () => {

    if (!startDate || !endDate) {

      alert(
        "Please select both dates."
      );

      return false;
    }

    if (
      new Date(startDate) >
      new Date(endDate)
    ) {

      alert(
        "Invalid date range."
      );

      return false;
    }

    return true;
  };

  /* =========================
     FETCH REPORTS
  ========================== */

  const fetchReports = async () => {

    if (!validateDates()) return;

    setLoading(true);

    try {

      /* TRANSACTIONS */

      const {
        data: transactionsData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type:
            "transactions",
        }
      );

      /* LISTINGS */

      const {
        data: listingsData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type:
            "listings",
        }
      );

      /* PAYMENTS */

      const {
        data: paymentsData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type:
            "payments",
        }
      );

      /* FLAGGED CONTENT */

      const {
        data: flaggedData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type:
            "flagged_content",
        }
      );

      /* FACILITY */

      const {
        data: facilityData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type:
            "facility",
        }
      );

      setTransactions(
        Array.isArray(
          transactionsData
        )
          ? transactionsData
          : []
      );

      setListings(
        Array.isArray(
          listingsData
        )
          ? listingsData
          : []
      );

      setPayments(
        Array.isArray(
          paymentsData
        )
          ? paymentsData
          : []
      );

      setFlaggedContent(
        Array.isArray(
          flaggedData
        )
          ? flaggedData
          : []
      );

      setFacilityReports(
        Array.isArray(
          facilityData
        )
          ? facilityData
          : []
      );

    } catch (err) {

      console.error(err);

      alert(err.message);

    } finally {

      setLoading(false);

    }

  };

  /* =========================
     AUTO REFRESH
  ========================== */

  useEffect(() => {

    fetchReports();

  }, [startDate, endDate]);

  /* =========================
     REVENUE
  ========================== */

  const totalRevenue =
    payments.reduce((sum, p) => {

      if (
        p.status === "completed"
      ) {

        return (
          sum +
          Number(p.amount || 0)
        );
      }

      return sum;

    }, 0);

  /* =========================
     ACTIVE LISTINGS
  ========================== */

  const activeListings =
    listings.filter(
      (l) =>
        l.status === "active"
    ).length;

  /* =========================
     PDF EXPORT
  ========================== */

  const exportPDF = () => {

    const doc = new jsPDF();

    doc.setFontSize(22);

    doc.text(
      "Campus Marketplace Report",
      14,
      20
    );

    doc.setFontSize(11);

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      30
    );

    doc.text(
      `Date Range: ${startDate} to ${endDate}`,
      14,
      37
    );

    /* SUMMARY */

    doc.setFontSize(15);

    doc.text(
      "Report Summary",
      14,
      50
    );

    autoTable(doc, {

      startY: 55,

      head: [[
        "Metric",
        "Value",
      ]],

      body: [

        [
          "Transactions",
          transactions.length,
        ],

        [
          "Listings",
          listings.length,
        ],

        [
          "Active Listings",
          activeListings,
        ],

        [
          "Payments",
          payments.length,
        ],

        [
          "Flagged Content",
          flaggedContent.length,
        ],

        [
          "Revenue",
          `R${totalRevenue.toFixed(2)}`,
        ],

      ],

    });

    /* TRANSACTIONS */

    doc.text(
      "Transactions",
      14,
      doc.lastAutoTable.finalY + 15
    );

    autoTable(doc, {

      startY:
        doc.lastAutoTable.finalY + 20,

      head: [[
        "Listing",
        "Status",
        "Total",
        "Paid",
      ]],

      body:
        transactions.map((t) => {

          const listing =
            listings.find(
              (l) =>
                l.id ===
                t.listing_id
            );

          return [

            listing?.title ||
            "Unknown Item",

            t.status,

            `R${Number(
              t.total_amount || 0
            ).toFixed(2)}`,

            `R${Number(
              t.amount_paid || 0
            ).toFixed(2)}`,

          ];

        }),

    });

    /* PAYMENTS */

    doc.text(
      "Payments",
      14,
      doc.lastAutoTable.finalY + 15
    );

    autoTable(doc, {

      startY:
        doc.lastAutoTable.finalY + 20,

      head: [[
        "Method",
        "Status",
        "Amount",
      ]],

      body:
        payments.map((p) => [

          p.method,

          p.status,

          `R${Number(
            p.amount || 0
          ).toFixed(2)}`,

        ]),

    });

    /* FLAGGED */

    doc.text(
      "Flagged Content",
      14,
      doc.lastAutoTable.finalY + 15
    );

    autoTable(doc, {

      startY:
        doc.lastAutoTable.finalY + 20,

      head: [[
        "Type",
        "Reason",
        "Status",
      ]],

      body:
        flaggedContent.map((f) => [

          f.content_type,

          f.reason,

          f.status,

        ]),

    });

    doc.save(
      "campus_marketplace_report.pdf"
    );

    setShowExportMenu(false);

  };

  /* =========================
     EXCEL EXPORT
  ========================== */

  const exportExcel = () => {

    const workbook =
      XLSX.utils.book_new();

    /* TRANSACTIONS */

    const transactionsData =
      transactions.map((t) => {

        const listing =
          listings.find(
            (l) =>
              l.id ===
              t.listing_id
          );

        return {

          Listing:
            listing?.title ||
            "Unknown Item",

          Status: t.status,

          Total:
            t.total_amount,

          Paid:
            t.amount_paid,

          Remaining:
            t.remaining_balance,

        };

      });

    XLSX.utils.book_append_sheet(
      workbook,

      XLSX.utils.json_to_sheet(
        transactionsData
      ),

      "Transactions"
    );

    /* PAYMENTS */

    XLSX.utils.book_append_sheet(
      workbook,

      XLSX.utils.json_to_sheet(
        payments
      ),

      "Payments"
    );

    /* LISTINGS */

    XLSX.utils.book_append_sheet(
      workbook,

      XLSX.utils.json_to_sheet(
        listings
      ),

      "Listings"
    );

    /* FLAGGED */

    XLSX.utils.book_append_sheet(
      workbook,

      XLSX.utils.json_to_sheet(
        flaggedContent
      ),

      "Flagged Content"
    );

    /* FACILITY */

    XLSX.utils.book_append_sheet(
      workbook,

      XLSX.utils.json_to_sheet(
        facilityReports
      ),

      "Facility"
    );

    XLSX.writeFile(
      workbook,
      "campus_marketplace_report.xlsx"
    );

    setShowExportMenu(false);

  };

  /* =========================
     CSV EXPORT
  ========================== */

  const exportCSV = () => {

    const rows = [

      [
        "Listing",
        "Transaction Status",
        "Total Amount",
        "Amount Paid",
        "Remaining Balance",
      ],

      ...transactions.map((t) => {

        const listing =
          listings.find(
            (l) =>
              l.id ===
              t.listing_id
          );

        return [

          listing?.title ||
          "Unknown Item",

          t.status,

          t.total_amount,

          t.amount_paid,

          t.remaining_balance,

        ];

      }),

      [],

      ["TOTAL REVENUE"],

      [
        `R${totalRevenue.toFixed(2)}`
      ],

    ];

    const csvContent = rows
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "campus_marketplace_report.csv";

    link.click();

    URL.revokeObjectURL(url);

    setShowExportMenu(false);

  };

  /* =========================
     LOADING
  ========================== */

  if (loading) {

    return (
      <div className="loading-text">
        Loading Reports...
      </div>
    );

  }

  /* =========================
     UI
  ========================== */

  return (

    <div className="reports-container">

      <div className="reports-header">

        <div>

          <h1>
            Campus Marketplace Reports
          </h1>

          <p>
            Export analytics
            and reports
          </p>

        </div>

        <div className="reports-actions">

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(
                e.target.value
              )
            }
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(
                e.target.value
              )
            }
          />

          <button
            onClick={fetchReports}
          >
            Generate Report
          </button>

          <div className="export-dropdown">

            <button
              onClick={() =>
                setShowExportMenu(
                  !showExportMenu
                )
              }
            >
              Export
            </button>

            {showExportMenu && (

              <div className="export-menu">

                <button
                  onClick={exportPDF}
                >
                  Export PDF
                </button>

                <button
                  onClick={exportCSV}
                >
                  Export CSV
                </button>

                <button
                  onClick={exportExcel}
                >
                  Export Excel
                </button>

              </div>

            )}

          </div>

        </div>

      </div>

      <div className="reports-stats">

        <div className="report-card">

          <span>
            Transactions
          </span>

          <h2>
            {transactions.length}
          </h2>

        </div>

        <div className="report-card">

          <span>
            Listings
          </span>

          <h2>
            {listings.length}
          </h2>

          <p className="report-subtext">
            {activeListings}
            {" "}
            active listings remaining
          </p>

        </div>

        <div className="report-card">

          <span>
            Payments
          </span>

          <h2>
            {payments.length}
          </h2>

        </div>

        <div className="report-card">

          <span>
            Flagged Content
          </span>

          <h2>
            {flaggedContent.length}
          </h2>

        </div>

        <div className="report-card">

          <span>
            Facility Reports
          </span>

          <h2>
            {facilityReports.length}
          </h2>

        </div>

        <div className="
          report-card
          revenue-card
        ">

          <span>
            Total Revenue
          </span>

          <h2>
            R
            {totalRevenue.toFixed(2)}
          </h2>

        </div>

      </div>

    </div>

  );

}