import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Register from "./Register";
import { supabase } from "../lib/supabaseClient";

global.alert = jest.fn();

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe("Register Component", () => {
  const mockSwitch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders register form", () => {
    render(<Register switchToLogin={mockSwitch} />);
    expect(screen.getByRole("heading", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  test("shows alert if fields are empty", () => {
    render(<Register switchToLogin={mockSwitch} />);
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(global.alert).toHaveBeenCalledWith("Please fill in all fields");
  });

  test("registers user successfully", async () => {
    const mockSelect = jest.fn().mockResolvedValue({ 
      data: [{ id: "123" }], 
      error: null 
    });
    
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
    
    supabase.from.mockImplementation(() => ({
      insert: mockInsert
    }));

    render(<Register switchToLogin={mockSwitch} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByDisplayValue("Select Gender"), {
      target: { value: "male" },
    });
    fireEvent.change(screen.getByDisplayValue("Select Role"), {
      target: { value: "Student" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("✅ Registered successfully! Please login.");
    });
    expect(mockSwitch).toHaveBeenCalled();
  });

  test("handles user insertion error", async () => {
    const mockSelect = jest.fn().mockResolvedValue({ 
      data: null, 
      error: { message: "Duplicate email" } 
    });
    
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    
    supabase.from.mockReturnValue({
      insert: mockInsert
    });

    render(<Register switchToLogin={mockSwitch} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByDisplayValue("Select Gender"), {
      target: { value: "male" },
    });
    fireEvent.change(screen.getByDisplayValue("Select Role"), {
      target: { value: "Student" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("User error: Duplicate email");
    });
  });
});