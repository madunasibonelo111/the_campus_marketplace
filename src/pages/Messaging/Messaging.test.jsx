import { render, screen, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Messaging from './Messaging.jsx';


vi.mock('@/supabase/supabaseClient', () => {
  const mockUser = { id: 'amy-123' };
  const mockListing = { 
    id: 'l1', 
    title: 'Mirror', 
    user_id: 'amy-123', 
    listing_images: [{ image_url: 'test.jpg' }],
    profiles: { name: 'Amy' },
    conversations: [{ buyer_id: 'buyer-456', seller_id: 'amy-123' }] 
  };

  const mockConvo = { 
    id: 'convo-789', 
    listing_id: 'l1', 
    buyer_id: 'buyer-456', 
    seller_id: 'amy-123',
    buyer: { name: 'John' }, 
    seller: { name: 'Amy' }
  };

  const mockMessage = { 
    created_at: '2026-04-19T10:00:00Z', 
    body: 'Is the mirror available?', 
    sender_id: 'buyer-456' 
  };

  
  const createMockChain = (data) => {
    const chain = {
      select: () => chain,
      filter: () => chain,
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      maybeSingle: () => Promise.resolve({ data, error: null }),
      then: (resolve) => resolve({ data, error: null }),
    };
    return chain;
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn((table) => {
        if (table === 'listings') return createMockChain([mockListing]);
        if (table === 'conversations') return createMockChain(mockConvo);
        if (table === 'messages') return createMockChain([mockMessage]);
        return createMockChain([]);
      }),
    },
  };
});

describe('Messaging Final Fix', () => {
  it('displays the mock listing and renders chat messages', async () => {
    // 1. Initial render
    await act(async () => {
      render(<BrowserRouter><Messaging /></BrowserRouter>);
    });

    
    const listingItem = await screen.findByText(/Mirror/i);
    expect(listingItem).toBeInTheDocument();
    
    
    await act(async () => {
        fireEvent.click(listingItem);
    });

    // Verify message text and date grouping (Sunday, April 19)
    expect(await screen.findByText(/Is the mirror available/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunday/i)).toBeInTheDocument(); 
  });
});