import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import "./AuthForm.css";
import { supabase } from "../lib/supabaseClient";

export default function AuthContainer() {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={`container ${isActive ? "active" : ""}`}>

      <Login />
      <Register switchToLogin={() => setIsActive(false)} />

      {/* TOGGLE */}
      <div className="toggle-box">

        <div className="toggle-panel toggle-left">
          <div className="logo"><img src="/campus-marketplace-logo.png" alt="App Logo" /></div>
          <h1>Hello, Welcome!</h1>
          <p>Don't have an account?</p>
          <button
            className="btn"
            onClick={() => setIsActive(true)}
          >
            Register
          </button>
        </div>

        <div className="toggle-panel toggle-right">
          <div className="logo"><img src="/campus-marketplace-logo.png" alt="App Logo" /></div>
          <h1>Welcome Back!</h1>
          <p>Already have an account?</p>
          <button
            className="btn"
            onClick={() => setIsActive(false)}
          >
            Login
          </button>
        </div>

      </div>
    </div>
  );
}