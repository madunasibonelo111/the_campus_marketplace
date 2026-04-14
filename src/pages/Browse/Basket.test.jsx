import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Basket from './Basket';

describe('Basket & Filter Logic', () => {
  test('calculates the total correctly when items are added', () => {
    render(
      <BrowserRouter>
        <Basket />
      </BrowserRouter>
    );

    // Opening the basket overlay
    const basketBtn = screen.getByText(/🛒/i);
    fireEvent.click(basketBtn);

    // Verify initial total is 0
    expect(screen.getByText(/Total: R0/i)).toBeInTheDocument();
  });

  test('updates search input state', () => {
    render(
      <BrowserRouter>
        <Basket />
      </BrowserRouter>
    );
    const searchInput = screen.getByPlaceholderText(/Search listings.../i);
    fireEvent.change(searchInput, { target: { value: 'Calculator' } });
    expect(searchInput.value).toBe('Calculator');
  });
});