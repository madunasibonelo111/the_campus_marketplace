import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { MemoryRouter } from "react-router-dom";

import AdminDashboard from "./AdminDashboard";


// ✅ MOCK NAVIGATE
const mockNavigate = vi.fn();


// ✅ MOCK REACT ROUTER
vi.mock("react-router-dom", async () => {

  const actual =
    await vi.importActual(
      "react-router-dom"
    );

  return {

    ...actual,

    useNavigate: () =>
      mockNavigate

  };

});


// ✅ MOCK SUPABASE
vi.mock(
  "@/supabase/supabaseClient",
  () => ({

    supabase: {

      auth: {

        // ✅ MOCK USER
        getUser: vi.fn(() =>
          Promise.resolve({
            data: {
              user: {
                id: "admin-1"
              }
            }
          })
        ),

        // ✅ MOCK LOGOUT
        signOut: vi.fn(() =>
          Promise.resolve()
        )

      },


      // ✅ MOCK TABLES
      from: vi.fn((table) => {

        // =========================
        // ✅ PROFILES TABLE
        // =========================
        if (table === "profiles") {

          return {

            select: () => ({

              eq: () => ({

                single: () =>
                  Promise.resolve({

                    data: {
                      name: "Bobo",
                      role: "admin"
                    }

                  })

              })

            })

          };

        }


        // =========================
        // ✅ FACILITY BOOKINGS
        // =========================
        if (
          table === "facility_bookings"
        ) {

          return {

            select: () => ({

              order: () =>
                Promise.resolve({

                  data: [

                    {
                      id: 1,

                      status:
                        "pending",

                      booking_date:
                        "2026-01-01",

                      profiles: {
                        name:
                          "Shikombiso Mashele"
                      }

                    },

                    {
                      id: 2,

                      status:
                        "confirmed",

                      booking_date:
                        "2026-01-02",

                      profiles: {
                        name:
                          "Bobo"
                      }

                    }

                  ]

                })

            }),

            update: () => ({

              eq: () =>
                Promise.resolve({
                  data: true
                })

            })

          };

        }


        // =========================
        // ✅ FACILITY CONFIG
        // =========================
        if (
          table === "facility_config"
        ) {

          return {

            select: () => ({

              limit: () => ({

                single: () =>
                  Promise.resolve({

                    data: {

                      open_time:
                        "08:00",

                      close_time:
                        "17:00",

                      max_capacity_per_slot:
                        20,

                      slot_duration_minutes:
                        30

                    }

                  })

              })

            })

          };

        }

        return {};

      })

    }

  })
);


// =========================
// ✅ TEST SUITE
// =========================
describe(
  "AdminDashboard",
  () => {

    beforeEach(() => {

      vi.clearAllMocks();

    });


    // =========================
    // ✅ DASHBOARD HEADING
    // =========================
    it(
      "renders dashboard heading",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        expect(

          await screen.findByText(
            /hello, bobo/i
          )

        ).toBeInTheDocument();

      }
    );


    // =========================
    // ✅ FACILITY CONFIG
    // =========================
    it(
      "shows facility configuration",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        expect(

          await screen.findByText(
            /opening time/i
          )

        ).toBeInTheDocument();

        expect(

          screen.getByText("08:00")

        ).toBeInTheDocument();

        expect(

          screen.getByText(
            /max capacity per slot/i
          )

        ).toBeInTheDocument();

      }
    );


    // =========================
    // ✅ BOOKING STATS
    // =========================
    it(
      "shows booking statistics",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        await waitFor(() => {

          expect(

            screen.getByText(
              /total bookings/i
            )

          ).toBeInTheDocument();

        });

        expect(

          screen.getByText("2")

        ).toBeInTheDocument();

      }
    );


    // =========================
    // ✅ RECENT BOOKINGS TABLE
    // =========================
    it(
      "renders recent bookings table",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        expect(

          await screen.findByText(
            /recent bookings/i
          )

        ).toBeInTheDocument();

        expect(

          screen.getByText(
            "Shikombiso Mashele"
          )

        ).toBeInTheDocument();

        expect(

          screen.getByText(
            "Bobo"
          )

        ).toBeInTheDocument();

      }
    );


    // =========================
    // ✅ CONFIRM BUTTON
    // =========================
    it(
      "shows confirm button for pending booking",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        expect(

          await screen.findByRole(
            "button",
            {
              name: /confirm/i
            }
          )

        ).toBeInTheDocument();

      }
    );


    // =========================
    // ✅ COMPLETE BUTTON
    // =========================
    it(
      "shows complete button for confirmed booking",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        expect(

          await screen.findByRole(
            "button",
            {
              name: /complete/i
            }
          )

        ).toBeInTheDocument();

      }
    );


    // =========================
    // ✅ LOGOUT
    // =========================
    it(
      "logs out admin",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        const logoutButton =

          await screen.findByRole(
            "button",
            {
              name: /logout/i
            }
          );

        await userEvent.click(
          logoutButton
        );

        expect(
          mockNavigate
        ).toHaveBeenCalledWith(
          "/auth"
        );

      }
    );


    // =========================
    // ✅ NAVIGATION
    // =========================
    it(
      "navigates to facility config",
      async () => {

        render(

          <MemoryRouter>

            <AdminDashboard />

          </MemoryRouter>

        );

        const configButton =

          screen.getByText(
            "Facility Config"
          );

        await userEvent.click(
          configButton
        );

        expect(
          mockNavigate
        ).toHaveBeenCalledWith(
          "/admin/facility-config"
        );

      }
    );

  }
);