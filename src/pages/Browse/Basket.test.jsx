import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Basket from './Basket.jsx';

// mocking the listings and the categories table in the db
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn(() => {
        if (table === 'categories') {
         
          return Promise.resolve({ 
            data: [
              { id: 1, name: 'Textbooks' },
              { id: 2, name: 'Electronics' },
              { id: 3, name: 'Clothing' }
            ], 
            error: null 
          });
        }
        // Mocking the items
        return {
          order: vi.fn(() => Promise.resolve({ 
            data: [{ id: 1, name: 'Calculus Textbook', price: 350 }], 
            error: null 
          }))
        };
      }),
    })),
  },
}));

describe('Browse Page UI', () => {
  it('shows the search bar and the filter buttons from the screenshot', async () => {
    
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket />
        </BrowserRouter>
      );
    });

    // checking the search bar
    expect(screen.getByPlaceholderText(/Search listings.../i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Textbooks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Electronics/i })).toBeInTheDocument();
  });

  it('renders the navigation buttons at the bottom', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Basket />
        </BrowserRouter>
      );
    });

    expect(screen.getByRole('button', { name: /SHOP/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SELL/i })).toBeInTheDocument();
  });
});