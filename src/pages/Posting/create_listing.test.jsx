import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

import { BrowserRouter } from 'react-router-dom';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import CreateListing from './create_listing.jsx';



// Mocking Supabase

vi.mock('@/supabase/supabaseClient', () => ({

  supabase: {

    auth: {

      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-student-123' } } } })),

      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),

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



  it('calculates and displays a price suggestion based on Stats SA logic', async () => {

    await act(async () => {

      render(<BrowserRouter><CreateListing /></BrowserRouter>);

    });



    const titleInput = screen.getByPlaceholderText(/e.g. Engineering Maths/i);

    fireEvent.change(titleInput, { target: { value: 'Macbook Pro' } });



    // FIX: Using getAllByRole and picking the last one (Category is the 3rd select)

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



    // FIX: Bypass broken label link by using querySelector for the file input

    const file = new File(['test'], 'test.png', { type: 'image/png' });

    const fileInput = document.querySelector('input[type="file"]');

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

    fireEvent.change(selects[1], { target: { value: 'trade' } }); // Listing Type is 2nd select



    const priceInput = screen.getByPlaceholderText(/No price for swaps/i);

    expect(priceInput).toBeDisabled();

  });

});