import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import AnalyticsView from "./AnalyticsView";
import Reports from "./Reports"; 
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("analytics");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Facility Config State
  const [slotDuration, setSlotDuration] = useState(30);
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [savingConfig, setSavingConfig] = useState(false);

  // Admin Authentication
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", user.id)
          .single();

        if (error || data?.role !== "admin") {
          navigate("/");
          return;
        }

        setAdmin(data);

        await fetchOriginalBookings();
        await fetchFacilityConfiguration();
      } catch (err) {
        console.error("Admin auth error:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  }, [navigate]);

  // Fetch Bookings
  const fetchOriginalBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("facility_bookings")
        .select(`
          id,
          booking_date,
          booking_type,
          status,
          user_id,
          profiles ( name )
        `)
        .order("booking_date", { ascending: true });

      if (error) throw error;

      setBookings(data || []);
    } catch (err) {
      console.error("Bookings fetch error:", err);
    }
  };

  // Fetch Config
  const fetchFacilityConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from("facility_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSlotDuration(data.slot_duration_minutes || 30);
        setMaxCapacity(data.max_capacity_per_slot || 5);
        setOpenTime(data.open_time || "09:00");
        setCloseTime(data.close_time || "17:00");
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    }
  };

  // Save Config
  const handleUpdateConfiguration = async (e) => {
    e.preventDefault();

    setSavingConfig(true);

    try {
      const { data: existing } = await supabase
        .from("facility_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        slot_duration_minutes: Number(slotDuration),
        max_capacity_per_slot: Number(maxCapacity),
        open_time: openTime,
        close_time: closeTime,
      };

      let configErr;

      if (existing?.id) {
        const { error } = await supabase
          .from("facility_config")
          .update(payload)
          .eq("id", existing.id);

        configErr = error;
      } else {
        const { error } = await supabase
          .from("facility_config")
          .insert(payload);

        configErr = error;
      }

      if (configErr) throw configErr;

      await fetchFacilityConfiguration();

      alert("Facility configuration updated!");
    } catch (err) {
      console.error("Config update error:", err);
      alert("Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Confirm Booking
  const handleReceive = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("facility_bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      if (error) throw error;

      await fetchOriginalBookings();
    } catch (err) {
      console.error("Confirm booking error:", err);
    }
  };

  // Complete Booking
  const handleRelease = async (booking) => {
    try {
      const { error } = await supabase
        .from("facility_bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      if (error) throw error;

      await fetchOriginalBookings();
    } catch (err) {
      console.error("Complete booking error:", err);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div
        className="admin-global-spinner"
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <div
          className="spinner"
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e2e8f0",
            borderTop: "4px solid #4f46e5",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="admin-dashboard-app-wrapper"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      {/* Sidebar */}
      <aside
        className="admin-sidebar"
        style={{
          width: "280px",
          background: "#0f172a",
          color: "white",
          padding: "35px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "40px",
          flexShrink: 0,
        }}
      >
        <div className="sidebar-branding">
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "800",
              margin: 0,
              color: "#38bdf8",
            }}
          >
            Campus Admin
          </h2>

          <span
            style={{
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            Manager: {admin?.name || "Executive"}
          </span>
        </div>

        {/* Navigation */}
        <nav
          className="sidebar-navigation-links"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flex: 1,
          }}
        >
          <button
            onClick={() => setActiveTab("analytics")}
            className={activeTab === "analytics" ? "active-admin-tab" : ""}
          >
            📊 Platform Analytics
          </button>

          <button
            onClick={() => setActiveTab("facility_ops")}
            className={activeTab === "facility_ops" ? "active-admin-tab" : ""}
          >
            📋 Facility Operations
          </button>

          <button
            onClick={() => setActiveTab("facility_config")}
            className={activeTab === "facility_config" ? "active-admin-tab" : ""}
          >
            🔧 Facility Configuration
          </button>

          <button
            onClick={() => setActiveTab("moderation")}
            className={activeTab === "moderation" ? "active-admin-tab" : ""}
          >
            🛡️ Content Moderation
          </button>

          <button
            onClick={() => setActiveTab("exports")}
            className={activeTab === "exports" ? "active-admin-tab" : ""}
          >
            📥 Export Reports
          </button>
        </nav>

        {/* Logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/auth");
          }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #334155",
            background: "transparent",
            color: "#f1f5f9",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Sign Out Dashboard
        </button>
      </aside>

      {/* Main Content */}
      <main
        className="admin-main-viewport"
        style={{
          flex: 1,
          padding: "40px 50px",
          overflowY: "auto",
        }}
      >
        {/* Analytics */}
        {activeTab === "analytics" && <AnalyticsView />}

        {/* Facility Operations */}
        {activeTab === "facility_ops" && (
          <div className="bookings-card">
            <h2>Live Booking Verification</h2>

            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.booking_type === "drop_off"
                        ? "📦 Drop-Off"
                        : "🎁 Collection"}
                    </td>

                    <td>{b.profiles?.name || "Unknown Student"}</td>

                    <td>
                      {new Date(b.booking_date).toLocaleDateString()}
                    </td>

                    <td>{b.status}</td>

                    <td>
                      {b.status === "pending" && (
                        <button onClick={() => handleReceive(b.id)}>
                          Confirm
                        </button>
                      )}

                      {b.status === "confirmed" && (
                        <button onClick={() => handleRelease(b)}>
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {bookings.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      No facility transactions available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Facility Config */}
        {activeTab === "facility_config" && (
          <div className="config-card">
            <h2>Facility Parameters & Constraints</h2>

            <form onSubmit={handleUpdateConfiguration}>
              <input
                type="number"
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                placeholder="Slot Duration"
              />

              <input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="Max Capacity"
              />

              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />

              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />

              <button type="submit" disabled={savingConfig}>
                {savingConfig ? "Saving..." : "Save Configuration"}
              </button>
            </form>
          </div>
        )}

        {/* Moderation */}
        {activeTab === "moderation" && (
          <div className="placeholder-card">
            <h3>🛡️ Content Moderation Workspace</h3>

            <p>
              Queue processing view will populate immediately when
              moderation tools are connected.
            </p>
          </div>
        )}

        {/* EXPORT REPORTS */}
        {activeTab === "exports" && <Reports />}
      </main>
    </div>
  );
}