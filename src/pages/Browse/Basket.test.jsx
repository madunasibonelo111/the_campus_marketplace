import { render, screen, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Basket from './Basket.jsx';

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn((table) => ({
      select: vi.fn(() => {
       
        if (table === 'categories') {
          return Promise.resolve({ 
            data: [{ id: 1, name: 'Textbooks' }, { id: 2, name: 'Electronics' }], 
            error: null 
          });
        }
        // Mock for the listings query
        return Promise.resolve({ 
          data: [{ 
            id: 1, 
            title: 'Calculus', 
            price: 350, 
            listing_images: [], 
            categories: { name: 'Textbooks' } 
          }], 
          error: null 
        });
      }),
    })),
  },
}));

describe('Browse Page UI', () => {
  it('opens sidebar and finds the specific Textbook button', async () => {
    
    await act(async () => {
      render(<BrowserRouter><Basket /></BrowserRouter>);
    });

    
    const toggleBtn = screen.getByText(/Explore Categories/i);
    fireEvent.click(toggleBtn);

    
    const categoryBtn = await screen.findByRole('button', { name: /Textbooks/i });
    expect(categoryBtn).toBeInTheDocument();
  });
});