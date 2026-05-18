import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home.jsx'; 
import { expect, it, describe, vi } from 'vitest';

describe('Home Page stuff', () => {
  it('should show the main welcome text on the hero section', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const mainHeading = screen.getByText(/Your campus.*marketplace made.*simple/i);
    expect(mainHeading).toBeInTheDocument();
  });

  it('checks if the Get Started button actually links to the auth page', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const startLink = screen.getByRole('link', { name: /Get Started/i });
    expect(startLink).toHaveAttribute('href', '/auth');
  });

  it('makes sure the How It Works section is there', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const sectionHeader = screen.getByRole('heading', { name: /How It Works/i, level: 2 });
    expect(sectionHeader).toBeInTheDocument();
  });

  it('Coverage Boost: Triggers scroll tracking anchor safely when clicking How It Works', () => {
    const mockScrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const scrollBtn = screen.getByRole('button', { name: /How it works/i });
    fireEvent.click(scrollBtn);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });
});