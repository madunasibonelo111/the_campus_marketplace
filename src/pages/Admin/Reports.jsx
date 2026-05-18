import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./Reports.css";

export default function Reports() {

  const [facilityReports, setFacilityReports] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showExportMenu, setShowExportMenu] = useState(false);

  const [startDate, setStartDate] =
    useState("2020-01-01");

  const [endDate, setEndDate] =
    useState("2030-12-31");

  /* FETCH */

  const fetchReports = async () => {

    setLoading(true);

    try {

      const {
        data: transactionsData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type: "transactions",
        }
      );

      const {
        data: facilityData,
      } = await supabase.rpc(
        "generate_export_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type: "facility",
        }
      );

      setTransactions(
        Array.isArray(transactionsData)
          ? transactionsData
          : []
      );

      setFacilityReports(
        Array.isArray(facilityData)
          ? facilityData
          : []
      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchReports();

  }, []);

  /* REVENUE */

  const totalRevenue =
    transactions.reduce((sum, t) => {

      return (
        sum +
        (parseFloat(t.offer_amount) || 0)
      );

    }, 0);

  /* PDF */

  const exportPDF = () => {

    const doc = new jsPDF();

    doc.setFontSize(20);

    doc.text(
      "Campus Marketplace Report",
      14,
      20
    );

    autoTable(doc, {

      startY: 35,

      head: [[
        "Transaction ID",
        "Status",
        "Amount",
        "Type",
      ]],

      body:
        transactions.length > 0

          ? transactions.map((t) => [

              t.id,

              t.status,

              t.offer_amount || 0,

              t.type,

            ])

          : [["No Data", "-", "-", "-"]],

    });

    doc.save(
      "campus_marketplace_report.pdf"
    );

    setShowExportMenu(false);

  };

  /* CSV */

  const exportCSV = () => {

    const rows = [

      [
        "Transaction ID",
        "Status",
        "Amount",
        "Type",
      ],

      ...transactions.map((t) => [

        t.id,
        t.status,
        t.offer_amount || 0,
        t.type,

      ]),

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

  /* EXCEL */

  const exportExcel = () => {

    const workbook =
      XLSX.utils.book_new();

    const sheet =
      XLSX.utils.json_to_sheet(
        transactions
      );

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      "Transactions"
    );

    XLSX.writeFile(
      workbook,
      "campus_marketplace_report.xlsx"
    );

    setShowExportMenu(false);

  };

  if (loading) {

    return (
      <div className="loading-text">
        Loading Reports...
      </div>
    );

  }

  return (

    <div className="reports-container">

      {/* HEADER */}

      <div className="reports-header">

        <div>

          <h1>
            Campus Marketplace Reports
          </h1>

          <p>
            Export analytics and reports
          </p>

        </div>

        {/* FILTERS */}

        <div className="reports-actions">

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
          />

          <button onClick={fetchReports}>
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

                <button onClick={exportPDF}>
                  Export PDF
                </button>

                <button onClick={exportCSV}>
                  Export CSV
                </button>

                <button onClick={exportExcel}>
                  Export Excel
                </button>

              </div>

            )}

          </div>

        </div>

      </div>

      {/* CARDS */}

      <div className="reports-stats">

        <div className="report-card">

          <span>
            Facility Reports
          </span>

          <h2>
            {facilityReports.length}
          </h2>

        </div>

        <div className="report-card">

          <span>
            Transactions
          </span>

          <h2>
            {transactions.length}
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
            R{totalRevenue.toFixed(2)}
          </h2>

        </div>

      </div>

    </div>

  );

}