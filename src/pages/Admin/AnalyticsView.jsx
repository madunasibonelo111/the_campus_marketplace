
import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/supabaseClient';
import './AnalyticsView.css';

export default function AnalyticsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, []);

  const fetchDashboardAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      //API Contract Call: Fetch analytics securely from the backend RPC
      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');

      if (rpcError) throw rpcError;

      // Map payload fields cleanly to state parameters matching JSON structure
      setStats(data || {
        total_transaction_volume: 0,
        pending_flagged_items: 0,
        weekly_facility_utilization_pct: 0,
        monthly_successful_handoffs: 0
      });

    } catch (err) {
      console.error("Analytics fetch error:", err);
      // Handles 'Access Denied' error gracefully if a non-admin account attempts viewing
      setError(err.message || "Access Denied: Administrative permissions validation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div className="analytics-spinner" style={{ width: '45px', height: '45px', border: '4px solid #e2e8f0', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>Compiling backend platform performance metrics...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error-box" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '16px 20px', borderRadius: '12px', margin: '20px 0' }}>
        <h4 style={{ margin: '0 0 4px 0', color: '#991b1b', fontWeight: '700' }}>Security Boundary Alert</h4>
        <p style={{ margin: 0, color: '#b91c1c', fontSize: '14px' }}>{error}</p>
        <button onClick={fetchDashboardAnalytics} style={{ marginTop: '12px', background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
          Retry Authentication Link
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-view-container">
      <div className="analytics-view-header" style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 6px 0', fontWeight: '700' }}>Platform Performance & Metrics</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Live high-level aggregate insight data compiled directly from safe-zone logs.</p>
      </div>

      {/* Analytics Stat Cards Grid Layout Component */}
      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* Card 1: Gross Financial Transaction Volume */}
        <div className="admin-stat-metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="metric-badge-icon" style={{ width: '55px', height: '55px', background: '#e0e7ff', color: '#4f46e5', fontSize: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>💼</div>
          <div className="metric-data-block">
            <span style={{ display: 'block', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Market Volume</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', fontWeight: '700' }}>
              R{Number(stats?.total_transaction_volume || 0).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Card 2: Platform Safety & Flag Abuses */}
        <div className="admin-stat-metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="metric-badge-icon" style={{ width: '55px', height: '55px', background: '#fee2e2', color: '#ef4444', fontSize: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🚩</div>
          <div className="metric-data-block">
            <span style={{ display: 'block', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Flagged Items Queue</span>
            <strong style={{ display: 'block', fontSize: '22px', color: stats?.pending_flagged_items > 0 ? '#ef4444' : '#0f172a', fontWeight: '700' }}>
              {stats?.pending_flagged_items || 0} Open Alerts
            </strong>
          </div>
        </div>

        {/* Card 3: Facility Logistics Capacity Load */}
        <div className="admin-stat-metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="metric-badge-icon" style={{ width: '55px', height: '55px', background: '#e0f2fe', color: '#0284c7', fontSize: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📦</div>
          <div className="metric-data-block">
            <span style={{ display: 'block', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Facility Load Capacity</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', fontWeight: '700' }}>
              {Number(stats?.weekly_facility_utilization_pct || 0).toFixed(1)}% Capacity
            </strong>
          </div>
        </div>

        {/* Card 4: Monthly Exchange Volume Accomplished */}
        <div className="admin-stat-metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="metric-badge-icon" style={{ width: '55px', height: '55px', background: '#dcfce7', color: '#22c55e', fontSize: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✅</div>
          <div className="metric-data-block">
            <span style={{ display: 'block', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Monthly Handoffs</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', fontWeight: '700' }}>
              {stats?.monthly_successful_handoffs || 0} Completed
            </strong>
          </div>
        </div>

      </div>
    </div>
  );
}