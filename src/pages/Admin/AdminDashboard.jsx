import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import "./AdminDashboard.css";

export default function AdminDashboard() {

  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);

  const [bookings, setBookings] = useState([]);

  const [facilityConfig, setFacilityConfig] = useState(null);


  // ✅ GET ADMIN
  useEffect(() => {

    const getAdmin = async () => {

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {

        navigate("/auth");

        return;

      }

      const { data, error } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

      if (error) {

        console.error(
          "Admin fetch error:",
          error
        );

        navigate("/");

        return;

      }

      if (data?.role !== "admin") {

        navigate("/");

        return;

      }

      setAdmin(data);

    };

    getAdmin();

  }, [navigate]);


  // ✅ FETCH BOOKINGS
  const fetchBookings = async () => {

    const { data, error } = await supabase
      .from("facility_bookings")
      .select(`
        id,
        status,
        booking_date,
        booking_type,
        amount_due,
        user_id,
        profiles:user_id (
          name,
          email
        )
      `)
      .order("booking_date", {
        ascending: false
      });

    if (error) {

      console.error(
        "Booking error:",
        error
      );

      return;

    }

    setBookings(data || []);

  };


  // ✅ FETCH FACILITY CONFIG
  const fetchFacilityConfig = async () => {

    const { data, error } = await supabase
      .from("facility_config")
      .select("*")
      .limit(1)
      .single();

    if (error) {

      console.error(
        "Facility config error:",
        error
      );

      return;

    }

    setFacilityConfig(data);

  };


  useEffect(() => {

    fetchBookings();

    fetchFacilityConfig();

  }, []);


  // ✅ CONFIRM BOOKING
  const handleReceive = async (id) => {

    const { error } = await supabase
      .from("facility_bookings")
      .update({
        status: "confirmed"
      })
      .eq("id", id);

    if (error) {

      console.error(error);

      return;

    }

    fetchBookings();

  };


  // ✅ COMPLETE BOOKING
  const handleRelease = async (id) => {

    const { error } = await supabase
      .from("facility_bookings")
      .update({
        status: "completed"
      })
      .eq("id", id);

    if (error) {

      console.error(error);

      return;

    }

    fetchBookings();

  };


  // ✅ LOGOUT
  const handleLogout = async () => {

    await supabase.auth.signOut();

    navigate("/auth");

  };


  return (

    <div className="admin-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <h2 className="logo">
          Admin Dashboard
        </h2>

        <p
          className="nav-item active"
          onClick={() =>
            navigate("/admin-dashboard")
          }
        >
          Dashboard
        </p>

        <p
          className="nav-item"
          onClick={() =>
            navigate("/admin/facility-config")
          }
        >
          Facility Config
        </p>

      </aside>


      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOPBAR */}
        <div className="topbar">

          <h1>
            Hello, {admin?.name || "Admin"}
          </h1>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>


        {/* ✅ FACILITY CONFIGURATION */}
        <div
          className="bookings"
          style={{
            marginBottom: "60px",
            padding: "35px"
          }}
        >

          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "35px"
            }}
          >

            <h2
              style={{
                fontSize: "34px",
                fontWeight: "700"
              }}
            >
              Facility Configuration
            </h2>

            <button
              className="logout-btn"
              onClick={() =>
                navigate("/admin/facility-config")
              }
            >
              Edit Config
            </button>

          </div>


          {/* CONFIG ITEMS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "22px",
              maxWidth: "700px",
              margin: "0 auto"
            }}
          >

            {/* OPENING TIME */}
            <div
              className="card"
              style={{
                padding: "25px",
                borderRadius: "20px"
              }}
            >

              <h3
                style={{
                  marginBottom: "10px",
                  fontSize: "22px"
                }}
              >
                Opening Time
              </h3>

              <p
                style={{
                  fontSize: "18px",
                  color: "#555"
                }}
              >
                {facilityConfig?.open_time || "--"}
              </p>

            </div>


            {/* CLOSING TIME */}
            <div
              className="card"
              style={{
                padding: "25px",
                borderRadius: "20px"
              }}
            >

              <h3
                style={{
                  marginBottom: "10px",
                  fontSize: "22px"
                }}
              >
                Closing Time
              </h3>

              <p
                style={{
                  fontSize: "18px",
                  color: "#555"
                }}
              >
                {facilityConfig?.close_time || "--"}
              </p>

            </div>


            {/* CAPACITY */}
            <div
              className="card"
              style={{
                padding: "25px",
                borderRadius: "20px"
              }}
            >

              <h3
                style={{
                  marginBottom: "10px",
                  fontSize: "22px"
                }}
              >
                Max Capacity Per Slot
              </h3>

              <p
                style={{
                  fontSize: "18px",
                  color: "#555"
                }}
              >
                {
                  facilityConfig?.max_capacity_per_slot || "--"
                }
              </p>

            </div>


            {/* SLOT DURATION */}
            <div
              className="card"
              style={{
                padding: "25px",
                borderRadius: "20px"
              }}
            >

              <h3
                style={{
                  marginBottom: "10px",
                  fontSize: "22px"
                }}
              >
                Slot Duration
              </h3>

              <p
                style={{
                  fontSize: "18px",
                  color: "#555"
                }}
              >
                {
                  facilityConfig?.slot_duration_minutes || "--"
                } mins
              </p>

            </div>

          </div>

        </div>


        {/* ✅ BOOKING STATS */}
        <div
          className="stats"
          style={{
            marginBottom: "45px"
          }}
        >

          <div className="card">

            <h3>Total Bookings</h3>

            <p>
              {bookings.length}
            </p>

          </div>


          <div className="card">

            <h3>Pending</h3>

            <p>
              {
                bookings.filter(
                  (b) => b.status === "pending"
                ).length
              }
            </p>

          </div>


          <div className="card">

            <h3>Completed</h3>

            <p>
              {
                bookings.filter(
                  (b) => b.status === "completed"
                ).length
              }
            </p>

          </div>

        </div>


        {/* ✅ BOOKINGS TABLE */}
        <div className="bookings">

          <h2>
            Recent Bookings
          </h2>

          <table>

            <thead>

              <tr>

                <th>Student Name</th>

                <th>Booking Date</th>

                <th>Status</th>

                <th>Action</th>

              </tr>

            </thead>


            <tbody>

              {bookings.map((b) => (

                <tr key={b.id}>

                  {/* STUDENT NAME */}
                  <td>
                    {b.profiles?.name || "Unknown"}
                  </td>

                  {/* DATE */}
                  <td>
                    {
                      new Date(
                        b.booking_date
                      ).toLocaleDateString()
                    }
                  </td>

                  {/* STATUS */}
                  <td>

                    <span
                      className={`status ${b.status}`}
                    >
                      {b.status}
                    </span>

                  </td>

                  {/* ACTION */}
                  <td>

                    {b.status === "pending" && (

                      <button
                        className="receive-btn"
                        onClick={() =>
                          handleReceive(b.id)
                        }
                      >
                        Confirm
                      </button>

                    )}


                    {b.status === "confirmed" && (

                      <button
                        className="complete-btn"
                        onClick={() =>
                          handleRelease(b.id)
                        }
                      >
                        Complete
                      </button>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </main>

    </div>

  );

}