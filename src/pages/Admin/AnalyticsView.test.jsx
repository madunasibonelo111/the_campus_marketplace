// src/pages/Admin/AnalyticsView.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AnalyticsView from './AnalyticsView';
import { supabase } from '@/supabase/supabaseClient';

// Mock the core Supabase Client infrastructure layer completely using Vitest syntax
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

describe('AnalyticsView Component Test Suite (Sprint 4 - US1 API Contract)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Displays loading spinner while fetching dashboard analytics', () => {
    // Keep the promise pending to capture mounting load animation state elements
    supabase.rpc.mockImplementation(() => new Promise(() => {}));
    
    render(<AnalyticsView />);
    
    expect(screen.getByText(/Compiling backend platform performance metrics.../i)).toBeInTheDocument();
  });

  test('Maps API JSON contract response properties directly to the Stat Cards', async () => {
    const mockContractPayload = {
      total_transaction_volume: 12500.50,
      pending_flagged_items: 3,
      weekly_facility_utilization_pct: 85.5,
      monthly_successful_handoffs: 42
    };

    // Simulate successful contract call return from backend database
    supabase.rpc.mockResolvedValueOnce({ data: mockContractPayload, error: null });

    render(<AnalyticsView />);

    // Wait until the loading placeholder clears out and numbers render
    await waitFor(() => {
      expect(screen.getByText(/Platform Performance & Metrics/i)).toBeInTheDocument();
    });

    // Use regular expressions to find substrings within split text nodes safely across locales
    expect(screen.getByText(/12.*500/)).toBeInTheDocument();
    expect(screen.getByText(/3\s*Open Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/85\.5/)).toBeInTheDocument();
    expect(screen.getByText(/42\s*Completed/i)).toBeInTheDocument();
  });

  test('Catches non-admin RLS/Security errors gracefully inside a descriptive box', async () => {
    const mockSecurityError = {
      message: 'Access Denied: Administrative permissions validation failed.'
    };

    // Simulate database access restriction denial error mapping
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockSecurityError });

    render(<AnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText(/Security Boundary Alert/i)).toBeInTheDocument();
      expect(screen.getByText(/Access Denied: Administrative permissions validation failed/i)).toBeInTheDocument();
    });
  });
});