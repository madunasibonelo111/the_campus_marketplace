// src/components/Auth/EmailConfirmed.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';
import EmailConfirmed from './EmailConfirmed';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('EmailConfirmed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <EmailConfirmed />
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    test('renders success message correctly', () => {
      renderComponent();
      
      expect(screen.getByText('🎉 Email Verified!')).toBeInTheDocument();
      expect(screen.getByText('Your account has been successfully activated.')).toBeInTheDocument();
    });

    test('renders loading spinner', () => {
      renderComponent();
      
      // The spinner is a div with animation style
      const spinner = document.querySelector('[style*="animation: spin"]');
      expect(spinner).toBeTruthy();
    });

    test('renders redirect message', () => {
      renderComponent();
      
      expect(screen.getByText('Redirecting you to login...')).toBeInTheDocument();
    });

    test('renders manual login button', () => {
      renderComponent();
      
      expect(screen.getByRole('button', { name: 'Go to Login' })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('automatically navigates to auth after 3 seconds', () => {
      renderComponent();
      
      expect(mockNavigate).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(3000);
      
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    test('navigates immediately when button is clicked', () => {
      renderComponent();
      
      const button = screen.getByRole('button', { name: 'Go to Login' });
      fireEvent.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });

    test('cleans up timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const { unmount } = renderComponent();
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('button is clickable and interactive', () => {
      renderComponent();
      
      const button = screen.getByRole('button', { name: 'Go to Login' });
      expect(button).toBeEnabled();
      expect(button.tagName).toBe('BUTTON');
    });

    test('has proper heading structure', () => {
      renderComponent();
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('🎉 Email Verified!');
    });
  });
});