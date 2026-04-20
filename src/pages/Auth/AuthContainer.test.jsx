import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import AuthContainer from './AuthContainer.jsx';

// mocking supabase
vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe('AuthContainer UI Logic', () => {
  
  const renderStuff = () => {
    render(
      <BrowserRouter>
        <AuthContainer />
      </BrowserRouter>
    );
  };

  it('starts on the login side by default', () => {
    renderStuff();
    
    // the container shouldn't have the active class yet
    const mainBox = screen.getByText(/Hello, Welcome!/i).closest('.container');
    expect(mainBox).not.toHaveClass('active');
  });

  it('switches to the register side when you click the toggle button', () => {
    renderStuff();

    // find the register button in the sliding panel
    const togglePanel = screen.getByText(/Hello, Welcome!/i).closest('.toggle-panel');
    const registerBtn = within(togglePanel).getByRole('button', { name: /Register/i });
    
    act(() => {
      fireEvent.click(registerBtn);
    });

    // now the container should have the .active class
    const mainBox = screen.getByText(/Hello, Welcome!/i).closest('.container');
    expect(mainBox).toHaveClass('active');
  });

  it('can toggle back to login after you clicked register', () => {
    renderStuff();

    // 1. Get the left panel to click Register
    let togglePanel = screen.getByText(/Hello, Welcome!/i).closest('.toggle-panel');
    const registerBtn = within(togglePanel).getByRole('button', { name: /Register/i });
    
    act(() => {
      fireEvent.click(registerBtn);
    });

    // 2. Now get the right panel to click Login
    togglePanel = screen.getByText(/Welcome Back!/i).closest('.toggle-panel');
    const loginToggleBtn = within(togglePanel).getByRole('button', { name: /Login/i });

    act(() => {
      fireEvent.click(loginToggleBtn);
    });

    // 3. Verify the 'active' class is removed
    const mainBox = screen.getByText(/Hello, Welcome!/i).closest('.container');
    expect(mainBox).not.toHaveClass('active');
  });
});