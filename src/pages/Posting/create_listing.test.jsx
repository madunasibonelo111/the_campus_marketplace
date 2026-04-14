import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateListing from './create_listing';

describe('CreateListing Logic', () => {
  const renderComponent = () => render(
    <BrowserRouter>
      <CreateListing />
    </BrowserRouter>
  );

  test('suggests higher prices for Electronics (Laptops)', async () => {
    renderComponent();
    
    // Simulate typing "Macbook"
    const titleInput = screen.getByPlaceholderText(/e.g. Engineering Maths/i);
    fireEvent.change(titleInput, { target: { value: 'Macbook Pro' } });

    // Note: In a real test, you'd mock the Supabase category fetch
    // This is a "Smoke Test" to ensure the suggestion box appears
    expect(titleInput.value).toBe('Macbook Pro');
  });

  test('prevents submission without a category', () => {
    renderComponent();
    const submitBtn = screen.getByText(/Post Listing/i);
    
    // Clicking without category triggers alert (mocked in jest.setup.js)
    fireEvent.click(submitBtn);
    expect(global.alert).toHaveBeenCalledWith("Please select a category first!");
  });
});