import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateListing from './create_listing';

// The alert mock is defined in jest.setup.js
describe('CreateListing Logic', () => {
  
  // Reset mocks before each test to ensure fresh call counts
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to render with Router context
  const renderComponent = async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateListing />
        </BrowserRouter>
      );
    });
  };

  test('updates input fields correctly', async () => {
    await renderComponent();
    
    const titleInput = screen.getByPlaceholderText(/e.g. Engineering Maths/i);
    fireEvent.change(titleInput, { target: { value: 'Macbook Pro' } });
    
    // Verify state update via input value
    expect(titleInput.value).toBe('Macbook Pro');
  });

  test('prevents submission without a category', async () => {
    await renderComponent();
    
    // Find the submit button
    const submitBtn = screen.getByText(/🚀 Post Listing/i);
    
    // In JSDOM, HTML5 'required' attributes can block fireEvent.click()
    // We target the closest form and trigger a submit event directly
    const form = submitBtn.closest('form');
    
    await act(async () => {
      fireEvent.submit(form);
    });

    // waitFor is necessary because the alert is triggered after an async check
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Please select a category first!");
    }, { timeout: 2000 });
  });

  test('switches price input to disabled when listing type is Swap', async () => {
    await renderComponent();
    
    const typeSelect = screen.getAllByRole('combobox')[1]; // Listing Type select
    const priceInput = screen.getByPlaceholderText(/e.g. 250/i);

    fireEvent.change(typeSelect, { target: { value: 'trade' } });

    // Verify UI updates based on listing type
    expect(priceInput).toBeDisabled();
    expect(priceInput).toHaveStyle('background-color: rgb(243, 244, 246)');
  });
});