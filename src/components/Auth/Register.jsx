import { useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import "./Auth.css";

export default function Register({ switchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;

  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const isStrongPassword = Object.values(passwordChecks).every(Boolean);

  const handleRegister = async () => {
  if (loading) return;

  if (!email || !password || !confirmPassword || !name || !gender || !role) {
    alert("Please fill in all fields");
    return;
  }

  if (!isStrongPassword) {
    alert("Password is not strong enough");
    return;
  }

  if (!passwordsMatch) {
    alert("Passwords do not match");
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          gender,
          role,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    // 🚨 IMPORTANT FIX:
    // DO NOT insert profile here anymore (prevents unverified users)
    alert("📧 Check your email to verify your account before logging in.");

    switchToLogin();

  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="form-box register">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Register</h1>

        {/* EMAIL */}
        <div className="input-box">
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* NAME */}
        <div className="input-box">
          <input
            type="text"
            placeholder="Name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* STRENGTH BAR */}
        <div className="strength-bar-container">
          <div className={`strength-bar strength-${strength}`}></div>
        </div>

        <p className="strength-text">
          {strength <= 2 && "Weak"}
          {strength === 3 && "Medium"}
          {strength >= 4 && "Strong"}
        </p>

        {/* RULES */}
        <div style={{ fontSize: "12px", marginBottom: "10px" }}>
          <p style={{ color: passwordChecks.length ? "green" : "red" }}>
            • At least 8 characters
          </p>
          <p style={{ color: passwordChecks.uppercase ? "green" : "red" }}>
            • Uppercase letter
          </p>
          <p style={{ color: passwordChecks.lowercase ? "green" : "red" }}>
            • Lowercase letter
          </p>
          <p style={{ color: passwordChecks.number ? "green" : "red" }}>
            • Number
          </p>
          <p style={{ color: passwordChecks.special ? "green" : "red" }}>
            • Special character
          </p>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="input-box">
          <input
            type="password"
            placeholder="Confirm Password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {confirmPassword && (
          <p style={{ color: passwordsMatch ? "green" : "red", fontSize: "12px" }}>
            {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
          </p>
        )}

        {/* GENDER */}
        <div className="input-box">
          <select onChange={(e) => setGender(e.target.value)}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* ROLE */}
        <div className="input-box">
          <select onChange={(e) => setRole(e.target.value)}>
            <option value="">Select Role</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {/* BUTTON */}
        <button
          type="button"
          className="btn"
          onClick={handleRegister}
          disabled={loading || !isStrongPassword || !passwordsMatch}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p>
          Already have an account?{" "}
          <a href="#" onClick={switchToLogin}>
            Login
          </a>
        </p>
      </form>
    </div>
  );
}