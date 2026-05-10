import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

export default function FacilityConfig() {

  const navigate = useNavigate();

  const [config, setConfig] = useState(null);

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    open_time: "",
    close_time: "",
    max_capacity_per_slot: "",
    slot_duration_minutes: ""
  });


  // ✅ FETCH CONFIG
  useEffect(() => {

    const fetchConfig = async () => {

      setLoading(true);

      const { data, error } = await supabase
        .from("facility_config")
        .select("*")
        .limit(1)
        .single();

      if (error) {

        console.error(error);

        setLoading(false);

        return;

      }

      if (data) {

        setConfig(data);

        setForm({
          open_time: data.open_time || "",
          close_time: data.close_time || "",
          max_capacity_per_slot:
            data.max_capacity_per_slot || "",
          slot_duration_minutes:
            data.slot_duration_minutes || ""
        });

      }

      setLoading(false);

    };

    fetchConfig();

  }, []);


  // ✅ HANDLE INPUT CHANGE
  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };


  // ✅ SAVE CONFIG TO DATABASE
  const handleSave = async () => {

    if (!config?.id) {

      alert("Config not loaded");

      return;

    }

    const { error } = await supabase
      .from("facility_config")
      .update({
        open_time: form.open_time,
        close_time: form.close_time,
        max_capacity_per_slot: Number(
          form.max_capacity_per_slot
        ),
        slot_duration_minutes: Number(
          form.slot_duration_minutes
        )
      })
      .eq("id", config.id);

    if (error) {

      console.error(error);

      alert("Error saving configuration");

      return;

    }

    alert("✅ Configuration Saved!");

    navigate("/admin-dashboard");

  };


  // ✅ LOADING
  if (loading) {

    return (

      <div className="admin-layout">

        <p style={{ padding: "20px" }}>
          Loading...
        </p>

      </div>

    );

  }


  return (

    <div className="admin-layout">

      <div className="facility-config-page">

        {/* HEADER */}
        <div className="facility-header">

          <button
            className="back-btn"
            onClick={() =>
              navigate("/admin-dashboard")
            }
          >
            ← Back
          </button>

          <h2>
            Facility Configuration
          </h2>

        </div>


        {/* OPENING TIME */}
        <div className="config-item">

          <span>
            Opening Time
          </span>

          <input
            type="time"
            name="open_time"
            value={form.open_time}
            onChange={handleChange}
          />

        </div>


        {/* CLOSING TIME */}
        <div className="config-item">

          <span>
            Closing Time
          </span>

          <input
            type="time"
            name="close_time"
            value={form.close_time}
            onChange={handleChange}
          />

        </div>


        {/* MAX CAPACITY */}
        <div className="config-item">

          <span>
            Max Capacity Per Slot
          </span>

          <input
            type="number"
            name="max_capacity_per_slot"
            value={form.max_capacity_per_slot}
            onChange={handleChange}
          />

        </div>


        {/* SLOT DURATION */}
        <div className="config-item">

          <span>
            Slot Duration (Minutes)
          </span>

          <input
            type="number"
            name="slot_duration_minutes"
            value={form.slot_duration_minutes}
            onChange={handleChange}
          />

        </div>


        {/* SAVE BUTTON */}
        <button
          className="save-btn"
          onClick={handleSave}
        >
          Save Changes
        </button>

      </div>

    </div>

  );

}