import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";
import "./AuthForm.css";

export default function Login({ switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    return "";
  };

  const handleLogin = async () => {
    if (loading) return;
    if (isLocked) {
      alert("Account is temporarily locked. Please try again later.");
      return;
    }

    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password)
    };
    
    setErrors(newErrors);
    
    if (newErrors.email || newErrors.password) {
      alert("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    try {
      // Query user by email
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, password_hash, login_attempts, locked_until")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error || !data) {
        // Generic error message for security
        handleFailedAttempt();
        alert("Invalid email or password");
        setLoading(false);
        return;
      }

      // Check if account is locked
      if (data.locked_until && new Date(data.locked_until) > new Date()) {
        const waitTime = Math.ceil((new Date(data.locked_until) - new Date()) / 60000);
        alert(`Account is locked. Please try again in ${waitTime} minutes.`);
        setLoading(false);
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, data.password_hash);

      if (isValidPassword) {
        // Reset login attempts on successful login
        await supabase
          .from("users")
          .update({ login_attempts: 0, locked_until: null, last_login: new Date().toISOString() })
          .eq("id", data.id);

        // Store user session securely
        const sessionToken = btoa(JSON.stringify({
          id: data.id,
          email: data.email,
          name: data.name,
          expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        }));
        
        localStorage.setItem("session", sessionToken);
        localStorage.setItem("user", JSON.stringify({
          id: data.id,
          email: data.email,
          name: data.name
        }));
        
        alert("✅ Login successful!");
        window.location.href = "/basket";
      } else {
        handleFailedAttempt(data.id);
        alert("Invalid email or password");
      }
    } catch (error) {
      alert("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleFailedAttempt = async (userId = null) => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      setIsLocked(true);
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lock
      
      if (userId) {
        await supabase
          .from("users")
          .update({ login_attempts: newAttempts, locked_until: lockUntil.toISOString() })
          .eq("id", userId);
      }
      
      alert("Too many failed attempts. Account locked for 15 minutes.");
    } else if (userId) {
      await supabase
        .from("users")
        .update({ login_attempts: newAttempts })
        .eq("id", userId);
    }
  };

  return (
    <div className="form-box login">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Login</h1>

        <div className="input-box">
          <input
            type="email"
            placeholder="Email Address"
            required
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? "error" : ""}
          />
          <i className="fa-solid fa-envelope"></i>
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? "error" : ""}
          />
          <i className="fa-solid fa-lock"></i>
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="forgot-link">
          <a href="#" onClick={() => alert("Password reset link would be sent to your email")}>
            Forgot Password?
          </a>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleLogin}
          disabled={loading || isLocked}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>
          Don't have an account? <a href="#" onClick={switchToRegister}>Register</a>
        </p>

        {isLocked && (
          <div className="warning-message">
            Account temporarily locked. Too many failed attempts.
          </div>
        )}
      </form>
    </div>
  );
}