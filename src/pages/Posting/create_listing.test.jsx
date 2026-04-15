import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CreateListing from './create_listing.jsx';

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [{ id: 1, name: 'Books' }], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

describe('Posting Page', () => {
  it('should show the form to list a new item', () => {
    render(
      <BrowserRouter>
        <CreateListing />
      </BrowserRouter>
    );

    // check for the main heading of the form
    expect(screen.getByText(/Create New Listing/i)).toBeInTheDocument();
    
    // check if the price input is there
    expect(screen.getByPlaceholderText(/Condition/i)).toBeInTheDocument();
  });
});