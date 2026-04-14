import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthContainer from './AuthContainer';

describe('Auth Transition Logic', () => {
  test('switches between Login and Register panels', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthContainer />
      </BrowserRouter>
    );

    const registerBtn = screen.getAllByText(/Register/i)[1]; // The toggle panel button
    fireEvent.click(registerBtn);

    // Check if the container now has the "active" class
    expect(container.firstChild).toHaveClass('active');
  });
});