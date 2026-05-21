import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import EditListingModal from "./EditListingModal";
import { supabase } from "@/supabase/supabaseClient";

// Mock Supabase
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe("EditListingModal Component Suite", () => {
  const mockListing = {
    id: "list-123",
    title: "Calculus Textbook",
    description: "Good condition",
    price: 350,
    condition: "good",
    status: "active",
    quantity: 2
  };

  const mockOnClose = vi.fn();
  const mockOnSaveSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    
    // Setup default chainable mock for Supabase update
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    });
  });

  test("does not render if isOpen is false", () => {
    const { container } = render(<EditListingModal isOpen={false} listingData={mockListing} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders with populated data when open", () => {
    render(<EditListingModal isOpen={true} onClose={mockOnClose} listingData={mockListing} />);
    expect(screen.getByDisplayValue("Calculus Textbook")).toBeInTheDocument();
    expect(screen.getByDisplayValue("350")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
  });

  test("Boundary Check: automatically changes status to sold when quantity is set to 0", () => {
    render(<EditListingModal isOpen={true} onClose={mockOnClose} listingData={mockListing} />);
    
    // Find the input by its default value instead of its label
    const quantityInput = screen.getByDisplayValue("2");
    // Find the status dropdown (it's the second combobox on the page)
    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects[1]; 
    
    // Change quantity to 0
    fireEvent.change(quantityInput, { target: { value: '0' } });
    
    // Status should automatically lock to 'sold'
    expect(statusSelect.value).toBe("sold");
    expect(statusSelect).toBeDisabled();
  });

  test("saves updated data to supabase and calls success callbacks", async () => {
    render(
      <EditListingModal 
        isOpen={true} 
        onClose={mockOnClose} 
        listingData={mockListing} 
        onSaveSuccess={mockOnSaveSuccess} 
      />
    );

    // Find the title input by its default value
    const titleInput = screen.getByDisplayValue("Calculus Textbook");
    fireEvent.change(titleInput, { target: { value: 'Updated Calculus Textbook' } });

    const submitButton = screen.getByRole("button", { name: /Save Listing/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("listings");
      expect(window.alert).toHaveBeenCalledWith("Listing updated successfully!");
      expect(mockOnSaveSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});