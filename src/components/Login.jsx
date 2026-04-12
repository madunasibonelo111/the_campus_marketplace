import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login({ switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, password_hash")
        .eq("email", email)
        .single();

      if (error || !data) {
        alert("Invalid email or password");
        setLoading(false);
        return;
      }

      if (data.password_hash === password) {
        localStorage.setItem("user", JSON.stringify({
          id: data.id,
          email: data.email,
          name: data.name
        }));
        alert("✅ Login successful!");
        window.location.assign("/basket");
      } else {
        alert("Invalid email or password");
      }
    } catch (error) {
      alert("An error occurred during login");
    } finally {
      setLoading(false);
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
          <i className="fa-solid fa-envelope"></i>
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
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>Don't have an account? <a href="#" onClick={switchToRegister}>Register</a></p>

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
