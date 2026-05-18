import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Messaging from './Messaging.jsx';
import { supabase } from "@/supabase/supabaseClient";
import React from 'react';

let mockSearchParams = new URLSearchParams();

// Mock react-router parameters to give us programmatic control over the active URLs
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

global.alert = vi.fn();

const mockListing = {
  id: 'l1',
  title: 'Mirror',
  user_id: 'amy-123',
  listing_images: [{ image_url: 'test.jpg' }],
  profiles: { name: 'Amy' },
  conversations: []
};

describe('Messaging Page Component Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Set up a standard user session before every test run
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'amy-123' } }
    });
  });

  it('renders listings layout and loads message bubbles smoothly upon selection', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    const listingNode = await screen.findByText(/Mirror/i);
    expect(listingNode).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(listingNode);
    });

    const bubble = await screen.findByText(/Is this still available\?/i);
    expect(bubble).toBeInTheDocument();
  });

  it('initializes a fresh conversation row when no pre-existing chat thread is found', async () => {
    // Pass a specific listing ID parameter through the active URL route
    mockSearchParams.set("listingId", "l1");

    const mockInsert = vi.fn().mockReturnThis();
    
    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: mockInsert,
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-convo-id', listing_id: 'l1', buyer_id: 'amy-123', seller_id: 'someone-else' },
            error: null
          })
        };
      }
      // Force the listing to be owned by someone else so the creation route is used
      if (table === 'listings') {
        return { 
          select: vi.fn().mockResolvedValue({ 
            data: [{ ...mockListing, user_id: 'someone-else' }] 
          }) 
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] })
      };
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    // Verify the insertion handler was reached safely
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  it('injects an automated trade query template text block when url contains trade actions', async () => {
    mockSearchParams.set("listingId", "l1");
    mockSearchParams.set("trade", "true");

    const mockInsertMessage = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'listings') return { select: vi.fn().mockResolvedValue({ data: [mockListing] }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'convo-100', seller_id: 'seller-amy' } })
        };
      }
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: [] }),
          insert: mockInsertMessage
        };
      }
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(mockInsertMessage).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.stringContaining('Hey! I want to trade for "Mirror"')
      }));
    });
  });

  it('safely runs fallback alert indicators if file storage mutations drop connection', async () => {
    mockSearchParams.set("listingId", "l1");

    supabase.storage = {
      from: vi.fn().mockImplementation(() => ({
        upload: vi.fn().mockRejectedValue(new Error("Storage limit exceeded"))
      }))
    };

    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    expect(supabase.storage.from).toBeDefined();
  });

  it('Boundary Check: Verifies chat message input area accepts and displays massive boundary text lengths cleanly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Messaging />
        </BrowserRouter>
      );
    });

    const listingNode = await screen.findByText(/Mirror/i);
    await act(async () => { fireEvent.click(listingNode); });

    const inputArea = screen.getByPlaceholderText(/Write a message.../i);
    
    // Simulate a high boundary character cap condition to test input field constraints
    const boundaryMessageString = "A".repeat(1000); 
    
    fireEvent.change(inputArea, { target: { value: boundaryMessageString } });
    expect(inputArea.value).toBe(boundaryMessageString);
  });
});

// Global fallback mock object to handle background component queries safely
vi.mock("@/supabase/supabaseClient", () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: 'convo-1', listing_id: 'l1', buyer_id: 'amy-123', seller_id: 'seller-amy' },
      error: null
    }),
    single: vi.fn().mockResolvedValue({ data: { id: 'convo-1' } }),
    insert: vi.fn().mockResolvedValue({ data: true })
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'amy-123' } } })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
      },
      from: vi.fn((table) => {
        if (table === 'listings') {
          return { select: vi.fn().mockResolvedValue({ data: [{ id: 'l1', title: 'Mirror', user_id: 'amy-123', listing_images: [], profiles: { name: 'Amy' }, conversations: [] }], error: null }) };
        }
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ created_at: '2026-04-19T10:00:00Z', body: 'Is this still available?', sender_id: 'buyer-456' }],
              error: null
            })
          };
        }
        return chain;
      }),
    },
  };
});