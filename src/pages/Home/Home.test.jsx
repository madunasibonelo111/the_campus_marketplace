import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home.jsx'; 
import { expect, it, describe } from 'vitest';

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

    // finding the link to make sure the user goes to login/register
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
});