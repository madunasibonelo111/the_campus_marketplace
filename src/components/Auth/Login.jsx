import "./Auth.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";

export default function Login({ switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Function to get user role from profiles table
  const getUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return "student"; // Default to student if role not found
      }

      return data?.role || "student";
    } catch (err) {
      console.error("Error:", err);
      return "student";
    }
  };

  // ✅ LOGIN WITH ROLE-BASED REDIRECTION
  const handleLogin = async () => {
    if (loading) return;

    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      // 🔥 IMPORTANT FIX: session-based verification
      const session = data.session;
      const user = data.user;

      if (!session || !user?.email_confirmed_at) {
        alert("Please verify your email before logging in.");
        await supabase.auth.signOut();
        return;
      }

      // Get user role from profiles table
      const userRole = await getUserRole(user.id);

      // ✅ Save user info with role
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: user.id,
          email: user.email,
          role: userRole,
        })
      );

      alert("✅ Login successful!");

      // 🚀 ROLE-BASED REDIRECTION
      switch (userRole) {
        case "staff":
          window.location.assign("/staff");
          break;
        case "admin":
          window.location.assign("/admin-dashboard");
          break;
        case "student":
        default:
          window.location.assign("/basket");
          break;
      }
    } catch (error) {
      alert("An error occurred during login");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-box login">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Login</h1>

        {/* EMAIL */}
        <div className="input-box">
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* FORGOT PASSWORD */}
        <div className="forgot-link">
          <span
            onClick={() => navigate("/forgot-password")}
            style={{ cursor: "pointer", color: "#7494ec" }}
          >
            Forgot Password?
          </span>
        </div>

        {/* LOGIN BUTTON */}
        <button
          type="button"
          className="btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* SWITCH TO REGISTER */}
        <p>
          Don't have an account?{" "}
          <a href="#" onClick={switchToRegister}>
            Register
          </a>
        </p>
      </form>
    </div>
  );
}