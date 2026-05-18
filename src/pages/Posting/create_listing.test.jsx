import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateListing from './create_listing.jsx';
import { supabase } from '@/supabase/supabaseClient';
import React from 'react';

// Mocking Supabase
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-student-123' } } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    },
    from: vi.fn((table) => ({
      select: vi.fn().mockImplementation(() => {
        if (table === 'categories') {
          return Promise.resolve({ 
            data: [
              { id: '101', name: 'Electronics' },
              { id: '102', name: 'Textbooks' }
            ], 
            error: null 
          });
        }
        return Promise.resolve({ data: [{ id: 'listing-999' }], error: null });
      }),
      insert: vi.fn().mockReturnThis(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/img.jpg' } })),
      })),
    }
  },
}));

describe('Create Listing - Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ================= Existing Baseline Tests ================= */

  it('calculates and displays a price suggestion based on Stats SA logic', async () => {
    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

    const titleInput = screen.getByPlaceholderText(/e.g. Engineering Maths/i);
    fireEvent.change(titleInput, { target: { value: 'Macbook Pro' } });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByText(/💡 Suggested: R/i)).toBeInTheDocument();
      expect(screen.getByText(/Stats SA Electronics Index/i)).toBeInTheDocument();
    });
  });

  it('handles the full listing submission process', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

    fireEvent.change(screen.getByPlaceholderText(/e.g. Engineering Maths/i), { target: { value: 'Calculus 1' } });
    fireEvent.change(screen.getByPlaceholderText(/Condition, edition/i), { target: { value: 'Good condition' } });
    fireEvent.change(screen.getByPlaceholderText(/0.00/i), { target: { value: '450.00' } });
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: '102' } });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type=\"file\"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByText(/🚀 Post Listing/i);
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Listing posted successfully!");
    });
  });

  it('disables price input when Swap is selected as listing type', async () => {
    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'trade' } });

    const priceInput = screen.getByPlaceholderText(/No price for swaps/i);
    expect(priceInput).toBeDisabled();
  });

  it('Branch Coverage: triggers logout sequence and clears application session state parameters cleanly', async () => {
    // Spy directly on localStorage window bindings safely
    const localStorageSpy = vi.spyOn(window.localStorage.__proto__, 'removeItem');

    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

    const logoutBtn = screen.getByRole('button', { name: /LOGOUT/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(localStorageSpy).toHaveBeenCalledWith('user');
    });
  });

  it('Branch Coverage: captures database upload faults inside the media storage controller seamlessly', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Globally rewrite the storage reference context wrapper on the mock module itself
    supabase.storage.from = vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: new Error("File cluster disconnect") }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } }))
    }));

    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

    fireEvent.change(screen.getByPlaceholderText(/e.g. Engineering Maths/i), { target: { value: 'Notebook' } });
    fireEvent.change(screen.getByPlaceholderText(/Condition, edition/i), { target: { value: 'Good condition' } });
    
    fireEvent.change(screen.getByPlaceholderText(/0.00/i), { target: { value: '50.00' } });
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: '102' } });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByText(/🚀 Post Listing/i);
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Error: File cluster disconnect");
    });
  });

  it('Branch Coverage: calculates price suggestion using alternative Stats SA categories like Furniture and high-value keyword rules', async () => {
    vi.spyOn(supabase, 'from').mockImplementation((table) => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: '201', name: 'Furniture' },
          { id: '202', name: 'Clothing' }
        ],
        error: null
      })
    }));

    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

    const titleInput = screen.getByPlaceholderText(/e.g. Engineering Maths/i);
    fireEvent.change(titleInput, { target: { value: 'Ergonomic Desk Chair' } });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: '201' } });

    await waitFor(() => {
      expect(screen.getByText(/Suggested: R/i)).toBeInTheDocument();
      expect(screen.getByText(/furniture manufacturing and transport trends/i)).toBeInTheDocument();
    });
  });

  
});