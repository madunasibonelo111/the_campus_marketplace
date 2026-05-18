import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AnalyticsView from './AnalyticsView';
import { supabase } from '@/supabase/supabaseClient';

// Mock the core Supabase Client infrastructure layer completely
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

describe('AnalyticsView Component Test Suite (Sprint 4 - US1 API Contract)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Displays loading spinner while fetching dashboard analytics', () => {
    // Keep the promise pending to capture mounting load animation state elements safely
    supabase.rpc.mockImplementation(() => new Promise(() => {}));
    
    render(<AnalyticsView />);
    
    expect(screen.getByText(/Loading performance analytics view.../i)).toBeInTheDocument();
  });

  test('Maps API JSON contract response properties directly to the Stat Cards', async () => {
    const mockContractPayload = {
      total_transaction_volume: 12500.50,
      pending_flagged_items: 3,
      monthly_successful_handoffs: 4 
    };

    supabase.rpc.mockResolvedValueOnce({ data: mockContractPayload, error: null });

    render(<AnalyticsView />);

    // Wait until the loading placeholder clears out and stat cards render
    await waitFor(() => {
      expect(screen.getByText(/Exchange Volume/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/12500.50/i)).toBeInTheDocument();
    expect(screen.getByText(/Flagged Disputes/i)).toBeInTheDocument();
    expect(screen.getByText(/15.0\s*%\s*Capacity/i)).toBeInTheDocument(); 
    expect(screen.getByText(/Successful Handoffs/i)).toBeInTheDocument();
  });

  test('Catches non-admin RLS/Security errors gracefully inside a descriptive box', async () => {
    const mockSecurityError = {
      message: 'Administrative permissions validation failed.'
    };

    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockSecurityError });

    render(<AnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText(/Administrative permissions validation failed./i)).toBeInTheDocument();
      expect(screen.getByText(/System Error:/i)).toBeInTheDocument();
    });
  });
});