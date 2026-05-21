import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import ProfileSettingsModal from "./ProfileSettingsModal";
import { supabase } from "@/supabase/supabaseClient";

vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: { updateUser: vi.fn() },
    storage: { from: vi.fn() },
    from: vi.fn()
  }
}));

describe("ProfileSettingsModal Component Suite", () => {
  const mockUser = {
    id: "user-123",
    name: "John Doe",
    bio: "Test Bio",
    avatar_url: "https://example.com/avatar.jpg"
  };

  const mockOnClose = vi.fn();
  const mockOnSaveSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    
    supabase.auth.updateUser.mockResolvedValue({ error: null });
  });

  test("renders existing user data", () => {
    render(<ProfileSettingsModal isOpen={true} currentUserData={mockUser} />);
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Bio")).toBeInTheDocument();
  });

  test("throws error alert if passwords do not match", async () => {
    render(<ProfileSettingsModal isOpen={true} currentUserData={mockUser} />);
    
    const newPassInput = screen.getByPlaceholderText(/Minimum 6 characters/i);
    const confirmPassInput = screen.getByPlaceholderText(/Repeat new password/i);
    
    fireEvent.change(newPassInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'password456' } });
    
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Passwords do not match"));
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  test("saves profile successfully when valid inputs are provided", async () => {
    render(
      <ProfileSettingsModal 
        isOpen={true} 
        onClose={mockOnClose} 
        currentUserData={mockUser} 
        onSaveSuccess={mockOnSaveSuccess} 
      />
    );

    // Find the input by the mock user's name
    const nameInput = screen.getByDisplayValue("John Doe");
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(window.alert).toHaveBeenCalledWith("Settings updated successfully!");
      expect(mockOnSaveSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  test("throws error alert if new password is too short", async () => {
    render(<ProfileSettingsModal isOpen={true} currentUserData={mockUser} />);
    
    const newPassInput = screen.getByPlaceholderText(/Minimum 6 characters/i);
    const confirmPassInput = screen.getByPlaceholderText(/Repeat new password/i);
    
    // Simulate a user entering a password that is less than 6 characters
    fireEvent.change(newPassInput, { target: { value: '123' } });
    fireEvent.change(confirmPassInput, { target: { value: '123' } });
    
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    
    // The component should catch this and throw our custom error
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("at least 6 characters"));
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  test("handles avatar upload successfully", async () => {
    // We need to mock the getPublicUrl return value just for this test
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'mock-url.png' } })
    });

    const { container } = render(
      <ProfileSettingsModal 
        isOpen={true} 
        onClose={mockOnClose} 
        currentUserData={mockUser} 
        onSaveSuccess={mockOnSaveSuccess} 
      />
    );

    // Simulate selecting a file
    // Grab the input by its role/type
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Trigger save
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    // Wait for the simulated upload and database update
    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(window.alert).toHaveBeenCalledWith("Settings updated successfully!");
    });
  });
});