import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';

describe('Home Page Component', () => {
  const renderComponent = async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
    });
  };

  test('renders the landing page with the hero heading', async () => {
    await renderComponent();

    // Uses regex to match the broken-up text in the <h1>
    expect(screen.getByText(/Your campus.*marketplace made.*simple/i)).toBeInTheDocument();
    
    // Specifically finds the "How It Works" text inside an <h2> role
    // This fixes the "Multiple elements found" error
    expect(screen.getByRole('heading', { name: /How It Works/i, level: 2 })).toBeInTheDocument();
  });

  test('contains navigation link to the auth page', async () => {
    await renderComponent();

    // Verifies the "Get Started" button points to the Auth page
    const link = screen.getByRole('link', { name: /Get Started/i });
    expect(link).toHaveAttribute('href', '/auth');
  });
});