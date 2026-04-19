import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CreateListing from './create_listing.jsx';

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'amy-123' } } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Textbooks' }], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [{ id: '101' }], error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/img.jpg' } })),
      })),
    }
  },
}));

describe('Create Listing Full Coverage', () => {
  it('executes full form submission with image upload', async () => {
    await act(async () => {
      render(<BrowserRouter><CreateListing /></BrowserRouter>);
    });

 
    fireEvent.change(screen.getByPlaceholderText(/e.g. Engineering Maths/i), { target: { value: 'Calculus' } });
    fireEvent.change(screen.getByPlaceholderText(/Condition, edition/i), { target: { value: 'Good condition' } });
    
    // Find the dropdown by its default text "Select Category"
    const categorySelect = await screen.findByDisplayValue(/Select Category/i);
    fireEvent.change(categorySelect, { target: { value: '1' } });

    // Handle File upload by finding the input type directly
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Post Listing/i }));

    
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /Post Listing/i })).toBeEnabled();
    });
  });
});