import { render, screen, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Messaging from './Messaging.jsx';

// MOCK SUPABASE
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
    id: 'convo-1',
    listing_id: 'l1',
    buyer_id: 'buyer-456',
    seller_id: 'amy-123',
    buyer: { name: 'John' },
    seller: { name: 'Amy' }
  };

  const mockMessages = [
    {
      created_at: '2026-04-19T10:00:00Z',
      body: 'Is the mirror available?',
      sender_id: 'buyer-456'
    }
  ];

  //  Flexible chain mock
  const chain = (data) => ({
    select: () => chain(data),
    eq: () => chain(data),
    or: () => chain(data),
    order: () => chain(data),
    ilike: () => chain([]),
    limit: () => chain([]),
    maybeSingle: () => Promise.resolve({ data, error: null }),
    single: () => Promise.resolve({ data, error: null }),
    insert: () => Promise.resolve({ data, error: null }),
    then: (resolve) => resolve({ data, error: null }),
  });

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
      },
      from: vi.fn((table) => {
        if (table === 'listings') return chain([mockListing]);
        if (table === 'conversations') return chain(mockConvo);
        if (table === 'messages') return chain(mockMessages);
        return chain([]);
      }),
    },
  };
});

describe('Messaging Page', () => {

  it('renders listing and opens chat with messages', async () => {

    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    // ✅ Listing appears
    const listing = await screen.findByText(/Mirror/i);
    expect(listing).toBeInTheDocument();

    // ✅ Click listing
    await act(async () => {
      fireEvent.click(listing);
    });

    // ✅ Message appears
    const message = await screen.findByText(/Is the mirror available/i);
    expect(message).toBeInTheDocument();

    // ✅ Date grouping appears
    const date = await screen.findByText(/Sunday/i);
    expect(date).toBeInTheDocument();
  });

  it('allows sending a message', async () => {

    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    const listing = await screen.findByText(/Mirror/i);

    await act(async () => {
      fireEvent.click(listing);
    });

    const input = await screen.findByPlaceholderText(/Write a message/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hello!' } });
    });

    const sendBtn = screen.getByText(/Send/i);

    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(await screen.findByText(/Hello!/i)).toBeInTheDocument();
  });

});
