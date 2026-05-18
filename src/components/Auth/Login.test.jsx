/*
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import Login from "./Login";
import { supabase } from "../../supabase/supabaseClient";

// Create a mock navigation tracking module
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Fluent mock setup for Supabase tracking hooks
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: "student" }, error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: { role: "student" }, error: null });

vi.mock("../../supabase/supabaseClient", () => {
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn(),
      },
      from: vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
              })),
    },
  };
});

describe("Login Component Core Validation & Security Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockMaybeSingle.mockResolvedValue({ data: { role: "student" }, error: null });
    mockSingle.mockResolvedValue({ data: { role: "student" }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  const submitLoginForm = () => {
    const loginButton = screen.getByRole("button", { name: /Login/i });
    fireEvent.click(loginButton);
  };

  it("renders login form elements correctly", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  it("successfully logs in a verified student user and redirects", async () => {
    // ✅ Fix: Provide a realistic Auth payload with both user and session objects
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { 
        user: { id: "user-abc-123", email: "student@wits.ac.za" },
        session: { user: { id: "user-abc-123", email: "student@wits.ac.za" }, access_token: "mock-token" }
      },
      error: null,
    });

    mockMaybeSingle.mockResolvedValueOnce({ data: { role: "student" }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { role: "student" }, error: null });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: "student@wits.ac.za" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: "password123" },
    });

    submitLoginForm();

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "student@wits.ac.za",
        password: "password123",
      });
      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("successfully logs in an administrative operator and handles secure redirect", async () => {
    // ✅ Fix: Provide a realistic Auth payload with both user and session objects
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { 
        user: { id: "admin-xyz", email: "admin@marketplace.com" },
        session: { user: { id: "admin-xyz", email: "admin@marketplace.com" }, access_token: "mock-token" }
      },
      error: null,
    });

    // ✅ Fix: Ensure both query resolutions return "admin" to cover any syntax variant
    mockMaybeSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: "admin@marketplace.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: "adminPass" },
    });

    submitLoginForm();

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "admin@marketplace.com",
        password: "adminPass",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });
  });

  it("disables the login execution button and shows a loading state during ongoing promises", async () => {
    supabase.auth.signInWithPassword.mockImplementationOnce(
      () => new Promise(() => {})
    );

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const loginButton = screen.getByRole("button", { name: /Login/i });

    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: "test@wits.ac.za" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: "password" },
    });

    await act(async () => {
      submitLoginForm();
    });

    expect(loginButton).toBeDisabled();
    expect(screen.getByText(/Logging In.../i)).toBeInTheDocument();
  });

  it("handles network error gracefully and triggers system alert boundaries", async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Network error" },
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: "error@wits.ac.za" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: "wrongpass" },
    });

    submitLoginForm();

    

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Network error");
    });
  });
});
*/
