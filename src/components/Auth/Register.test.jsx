// src/components/Auth/Register.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Register from './Register';
import { supabase } from '@/supabase/supabaseClient';

vi.mock('@/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

describe('Register Component', () => {
  const mockSwitchToLogin = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Register switchToLogin={mockSwitchToLogin} />
      </BrowserRouter>
    );
  };

  // Helper function to fill valid form
  const fillValidForm = () => {
    const emailInput = screen.getByPlaceholderText('Email');
    const nameInput = screen.getByPlaceholderText('Name');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');
    
    const genderSelect = screen.getByText('Select Gender').closest('select');
    const roleSelect = screen.getByText('Select Role').closest('select');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(confirmInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(genderSelect, { target: { value: 'male' } });
    fireEvent.change(roleSelect, { target: { value: 'student' } });
  };

  // Helper to fill valid form except specific fields
  const fillValidFormExcept = (excludeFields) => {
    const emailInput = screen.getByPlaceholderText('Email');
    const nameInput = screen.getByPlaceholderText('Name');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');
    const genderSelect = screen.getByText('Select Gender').closest('select');
    const roleSelect = screen.getByText('Select Role').closest('select');
    
    if (!excludeFields.includes('email')) {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    }
    if (!excludeFields.includes('name')) {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
    }
    if (!excludeFields.includes('password')) {
      fireEvent.change(passwordInput, { target: { value: 'StrongP@ss123' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongP@ss123' } });
    }
    if (!excludeFields.includes('gender')) {
      fireEvent.change(genderSelect, { target: { value: 'male' } });
    }
    if (!excludeFields.includes('role')) {
      fireEvent.change(roleSelect, { target: { value: 'student' } });
    }
  };

  describe('Rendering', () => {
    test('renders registration form with all fields', () => {
      renderComponent();
      
      // Use heading role instead of generic text to avoid duplicate matches
      expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByText('Select Gender')).toBeInTheDocument();
      expect(screen.getByText('Select Role')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });

    test('renders password strength meter', () => {
      renderComponent();
      const strengthBar = document.querySelector('.strength-bar');
      expect(strengthBar).toBeInTheDocument();
    });

    test('renders password validation rules', () => {
      renderComponent();
      expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
      expect(screen.getByText(/Uppercase letter/)).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    test('updates email field on change', () => {
      renderComponent();
      const emailInput = screen.getByPlaceholderText('Email');
      fireEvent.change(emailInput, { target: { value: 'student@campus.edu' } });
      expect(emailInput.value).toBe('student@campus.edu');
    });

    test('updates name field on change', () => {
      renderComponent();
      const nameInput = screen.getByPlaceholderText('Name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      expect(nameInput.value).toBe('John Doe');
    });

    test('updates gender select on change', () => {
      renderComponent();
      const genderSelect = screen.getByText('Select Gender').closest('select');
      fireEvent.change(genderSelect, { target: { value: 'male' } });
      expect(genderSelect.value).toBe('male');
    });

    test('updates role select on change', () => {
      renderComponent();
      const roleSelect = screen.getByText('Select Role').closest('select');
      fireEvent.change(roleSelect, { target: { value: 'student' } });
      expect(roleSelect.value).toBe('student');
    });
  });

  describe('Password Validation', () => {
    test('shows password match indicator', () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText('Password');
      const confirmInput = screen.getByPlaceholderText('Confirm Password');
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
      expect(screen.getByText('✓ Passwords match')).toBeInTheDocument();
    });

    test('shows password mismatch indicator', () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText('Password');
      const confirmInput = screen.getByPlaceholderText('Confirm Password');
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'WrongPass456!' } });
      expect(screen.getByText('✗ Passwords do not match')).toBeInTheDocument();
    });
  });

  describe('Validation - Empty Fields', () => {
    test('shows alert when email is missing', async () => {
      renderComponent();
      fillValidFormExcept(['email']);
      const registerButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(registerButton);
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Please fill in all fields');
      });
    });

    test('shows alert when name is missing', async () => {
      renderComponent();
      fillValidFormExcept(['name']);
      const registerButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(registerButton);
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Please fill in all fields');
      });
    });
  });

  describe('Successful Registration', () => {
    test('successfully registers user with valid data', async () => {
      supabase.auth.signUp.mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null });
      renderComponent();
      fillValidForm();
      const registerButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(registerButton);
      
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled();
      });
      expect(global.alert).toHaveBeenCalledWith('📧 Check your email to verify your account before logging in.');
      expect(mockSwitchToLogin).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    test('calls switchToLogin when login link is clicked', () => {
      renderComponent();
      const loginLink = screen.getByText('Login');
      fireEvent.click(loginLink);
      expect(mockSwitchToLogin).toHaveBeenCalled();
    });
  });
});