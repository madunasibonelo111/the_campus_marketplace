import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import FacilityConfig from "./FacilityConfig";
import { supabase } from "@/supabase/supabaseClient";


// ✅ MOCK NAVIGATE
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {

  const actual = await vi.importActual(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => mockNavigate
  };

});


// ✅ MOCK SUPABASE
vi.mock("@/supabase/supabaseClient", () => ({

  supabase: {

    from: vi.fn(() => ({

      select: () => ({

        limit: () => ({

          single: () =>
            Promise.resolve({

              data: {
                id: 1,
                open_time: "08:00",
                close_time: "17:00",
                max_capacity_per_slot: 50,
                slot_duration_minutes: 30
              },

              error: null

            })

        })

      }),

      update: () => ({

        eq: () =>
          Promise.resolve({
            error: null
          })

      })

    }))

  }

}));


describe("FacilityConfig", () => {

  beforeEach(() => {

    vi.clearAllMocks();

  });


  // ✅ PAGE RENDERS
  it("renders facility configuration page", async () => {

    render(

      <MemoryRouter>

        <FacilityConfig />

      </MemoryRouter>

    );

    expect(

      await screen.findByText(
        /facility configuration/i
      )

    ).toBeInTheDocument();

  });


  // ✅ SHOWS CONFIG VALUES
  it("renders configuration values", async () => {

    render(

      <MemoryRouter>

        <FacilityConfig />

      </MemoryRouter>

    );

    expect(

      await screen.findByDisplayValue(
        "08:00"
      )

    ).toBeInTheDocument();

    expect(

      screen.getByDisplayValue(
        "17:00"
      )

    ).toBeInTheDocument();

    expect(

      screen.getByDisplayValue(
        "50"
      )

    ).toBeInTheDocument();

  });


  // ✅ UPDATES INPUT VALUES
  it("updates form values", async () => {

    render(

      <MemoryRouter>

        <FacilityConfig />

      </MemoryRouter>

    );

    const capacityInput =

      await screen.findByDisplayValue(
        "50"
      );

    await userEvent.clear(
      capacityInput
    );

    await userEvent.type(
      capacityInput,
      "100"
    );

    expect(
      capacityInput
    ).toHaveValue(100);

  });


  // ✅ BACK BUTTON NAVIGATION
  it("navigates back to dashboard", async () => {

    render(

      <MemoryRouter>

        <FacilityConfig />

      </MemoryRouter>

    );

    const backButton =

      await screen.findByRole(
        "button",
        {
          name: /back/i
        }
      );

    await userEvent.click(
      backButton
    );

    expect(
      mockNavigate
    ).toHaveBeenCalledWith(
      "/admin-dashboard"
    );

  });


  // ✅ SAVE CONFIGURATION
  it("saves configuration", async () => {

    window.alert = vi.fn();

    render(

      <MemoryRouter>

        <FacilityConfig />

      </MemoryRouter>

    );

    const saveButton =

      await screen.findByRole(
        "button",
        {
          name: /save changes/i
        }
      );

    await userEvent.click(
      saveButton
    );

    await waitFor(() => {

      expect(
        window.alert
      ).toHaveBeenCalledWith(
        "✅ Configuration Saved!"
      );

    });

  });

  it("shows alert when configuration save fails", async () => {
    window.alert = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Use spyOn to specifically target the update method, 
    // leaving the rest of the supabase.from chain intact
    const fromSpy = vi.spyOn(supabase, 'from');
    
    // We mock the implementation to return a chain that handles update/eq
    fromSpy.mockImplementation(() => ({
      select: () => ({
        limit: () => ({
          single: () => Promise.resolve({ data: { id: 1 }, error: null })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: new Error("DB Failure") })
      })
    }));

    render(
      <MemoryRouter>
        <FacilityConfig />
      </MemoryRouter>
    );

    const saveButton = await screen.findByRole("button", { name: /save changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Error saving configuration");
    });
    
    // Clean up spy
    fromSpy.mockRestore();
  });

  // ✅ SHOWS INPUT LABELS
  it("renders all input labels", async () => {

    render(

      <MemoryRouter>

        <FacilityConfig />

      </MemoryRouter>

    );

    expect(

      await screen.findByText(
        /opening time/i
      )

    ).toBeInTheDocument();

    expect(

      screen.getByText(
        /closing time/i
      )

    ).toBeInTheDocument();

    expect(

      screen.getByText(
        /max capacity per slot/i
      )

    ).toBeInTheDocument();

    expect(

      screen.getByText(
        /slot duration/i
      )

    ).toBeInTheDocument();

  });

});