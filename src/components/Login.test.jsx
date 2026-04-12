import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";
import { supabase } from "../lib/supabaseClient";

global.alert = jest.fn();

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe("Login Component", () => {
  const mockSwitch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    delete window.location;
    window.location = { href: "" };
  });

  test("renders login form", () => {
    render(<Login switchToRegister={mockSwitch} />);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  test("shows alert if fields are empty", () => {
    render(<Login switchToRegister={mockSwitch} />);
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(global.alert).toHaveBeenCalledWith("Please fill in all fields");
  });

  test("shows alert if email is empty", () => {
    render(<Login switchToRegister={mockSwitch} />);
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(global.alert).toHaveBeenCalledWith("Please fill in all fields");
  });

  test("shows alert if password is empty", () => {
    render(<Login switchToRegister={mockSwitch} />);
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(global.alert).toHaveBeenCalledWith("Please fill in all fields");
  });

  test("shows alert on failed login - user not found", async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "No user found" }
    });
    
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({
      select: mockSelect
    });

    render(<Login switchToRegister={mockSwitch} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Invalid email or password");
    });
  });

  test("shows alert on failed login - wrong password", async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: { id: "123", email: "test@test.com", name: "Test", password_hash: "correct123" },
      error: null
    });
    
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({
      select: mockSelect
    });

    render(<Login switchToRegister={mockSwitch} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Invalid email or password");
    });
  });

  test("successful login redirects to basket", async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: { id: "123", email: "test@test.com", name: "Test", password_hash: "123456" },
      error: null
    });
    
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    
    supabase.from.mockReturnValue({
      select: mockSelect
    });

    render(<Login switchToRegister={mockSwitch} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("✅ Login successful!");
      expect(window.location.href).toBe("/basket");
    });
  });

  test("calls switchToRegister when register link is clicked", () => {
    render(<Login switchToRegister={mockSwitch} />);
    const registerLink = screen.getByText("Register");
    fireEvent.click(registerLink);
    expect(mockSwitch).toHaveBeenCalled();
  });
});