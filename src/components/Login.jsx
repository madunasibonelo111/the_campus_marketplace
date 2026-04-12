import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
    } else {
      alert("✅ Login successful!");
      window.location.assign("/basket"); // ✅ FIX (safe for tests)
    }
  };

  return (
    <div className="form-box login">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Login</h1>

        <div className="input-box">
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <i className="fa-solid fa-user"></i>
        </div>

        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          <i className="fa-solid fa-lock"></i>
        </div>

        <div className="forgot-link">
          <a href="#">Forgot Password?</a>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleLogin}
        >
          Login
        </button>

        <p>Or login with social platform</p>

        <div className="social-icons">
          <a href="#"><i className="fa-brands fa-google"></i></a>
          <a href="#"><i className="fa-brands fa-facebook"></i></a>
          <a href="#"><i className="fa-brands fa-instagram"></i></a>
        </div>
      </form>
    </div>
  );
}