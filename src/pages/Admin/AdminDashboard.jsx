import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import AnalyticsView from "./AnalyticsView";
import EnhancedReports from "./EnhancedReports"; 
import ModerationQueue from "./ModerationQueue";
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
    <div className="admin-dashboard-app-wrapper" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* 🧭 Shared Administrative Navigation Sidebar Control */}
      <aside className="admin-sidebar" style={{ width: '280px', background: '#0f172a', color: 'white', padding: '35px 24px', display: 'flex', flexDirection: 'column', gap: '40px', flexShrink: 0 }}>
        <div className="sidebar-branding">
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '0.5px', color: '#38bdf8' }}>Campus Admin</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Manager: {admin?.name || "Executive"}</span>
        </div>

        <nav className="sidebar-navigation-links" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab("analytics")} 
            style={{ 
              width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: '12px', border: 'none', 
              background: activeTab === 'analytics' ? '#1e293b' : 'transparent', 
              color: activeTab === 'analytics' ? '#38bdf8' : '#94a3b8', 
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', transition: 'all 0.2s' 
            }}
          >
            📊 Platform Analytics
          </button>

          <button 
            onClick={() => setActiveTab("facility_ops")} 
            style={{ 
              width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: '12px', border: 'none', 
              background: activeTab === 'facility_ops' ? '#1e293b' : 'transparent', 
              color: activeTab === 'facility_ops' ? '#38bdf8' : '#94a3b8', 
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', transition: 'all 0.2s' 
            }}
          >
            📋 Facility Operations
          </button>

          <button 
            onClick={() => setActiveTab("facility_config")} 
            style={{ 
              width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: '12px', border: 'none', 
              background: activeTab === 'facility_config' ? '#1e293b' : 'transparent', 
              color: activeTab === 'facility_config' ? '#38bdf8' : '#94a3b8', 
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', transition: 'all 0.2s' 
            }}
          >
            🔧 Facility Configuration
          </button>
          
          <button 
            onClick={() => setActiveTab("moderation")} 
            style={{ 
              width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: '12px', border: 'none', 
              background: activeTab === 'moderation' ? '#1e293b' : 'transparent', 
              color: activeTab === 'moderation' ? '#38bdf8' : '#94a3b8', 
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', transition: 'all 0.2s' 
            }}
          >
            🛡️ Content Moderation
          </button>
          
          <button 
            onClick={() => setActiveTab("exports")} 
            style={{ 
              width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: '12px', border: 'none', 
              background: activeTab === 'exports' ? '#1e293b' : 'transparent', 
              color: activeTab === 'exports' ? '#38bdf8' : '#94a3b8', 
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', transition: 'all 0.2s' 
            }}
          >
            📥 Export Reports
          </button>
        </nav>

        <button 
          onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }} 
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: 'transparent', color: '#f1f5f9', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
        >
          Sign Out Dashboard
        </button>
      </aside>

      {/* 🖥️ Main Dynamic Workspace Panel Viewport */}
      <main className="admin-main-viewport" style={{ flex: 1, padding: '40px 50px', overflowY: 'auto' }}>
        
        {/* User Story 1 View Component */}
        {activeTab === "analytics" && <AnalyticsView />}

        {/* Live Booking Operational Table View */}
        {activeTab === "facility_ops" && (
          <div className="bookings-card" style={{ background: 'white', padding: '30px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', color: '#1e293b', margin: '0 0 4px 0', fontWeight: '700' }}>Live Booking Verification</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Confirm student appointments and manage drop-off/collection cycles directly.</p>
            </div>
            
            <table className="bookings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Scheduled Date</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Action Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                    <td style={{ padding: '16px', textTransform: 'capitalize', fontWeight: '600' }}>
                      {b.booking_type === 'drop_off' ? '📦 Drop-off' : '🎁 Collection'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {b.profiles?.name || "Unknown Student"}
                    </td>
                    <td style={{ padding: '16px' }}>{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`status-pill ${b.status}`} style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        background: b.status === 'completed' ? '#dcfce7' : b.status === 'confirmed' ? '#e0f2fe' : '#fef3c7',
                        color: b.status === 'completed' ? '#15803d' : b.status === 'confirmed' ? '#0369a1' : '#b45309'
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {b.status === "pending" && (
                        <button className="receive-btn" onClick={() => handleReceive(b.id)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                          Confirm
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button className="complete-btn" onClick={() => handleRelease(b)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No facility transactions logged in database profiles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 🔧 FACILITY CONFIGURATIONS FORM LAYOUT WRAPPER */}
        {activeTab === "facility_config" && (
          <div className="config-card" style={{ background: 'white', padding: '35px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '22px', color: '#1e293b', margin: '0 0 4px 0', fontWeight: '700' }}>Facility Parameters & Constraints</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Modify automated calendar durations, lock hourly caps, and update campus trading window schedules.</p>
            </div>

            <form onSubmit={handleUpdateConfiguration} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Time Slot Duration (Minutes)</label>
                <input type="number" value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Max Capacity (Transactions Per Slot)</label>
                <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Opening Time</label>
                  <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Closing Time</label>
                  <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <button type="submit" disabled={savingConfig} style={{ marginTop: '10px', background: '#4f46e5', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' }}>
                {savingConfig ? "Saving System Rules..." : "Save Operational Rules"}
              </button>
            </form>
          </div>
        )}
        
        {/* User Story 2: Moderation Queue Component Rendered Here */}
        {activeTab === "moderation" && (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <ModerationQueue />
          </div>
        )}

        {/* User Story 3 */}
        {activeTab === "exports" && <EnhancedReports />}
          
      </main>
    </div>
  );
}