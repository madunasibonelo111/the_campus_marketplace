import { useState } from "react";
import { supabase } from "@/supabase/supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = password === confirmPassword;

  // strength logic (keep yours if already exists)
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

  const isStrongPassword =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[@$!%*?&]/.test(password);

  // ✅ THIS IS WHERE YOUR FUNCTION GOES
  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("✅ Password updated successfully!");
      window.location.href = "/auth";
    }
  };

  return (
    <div className="form-box login">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Reset Password</h1>

        <div className="input-box">
          <input
            type="password"
            placeholder="New Password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="input-box">
          <input
            type="password"
            placeholder="Confirm Password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {confirmPassword && (
          <p style={{ color: passwordsMatch ? "green" : "red" }}>
            {passwordsMatch ? "✓ Match" : "✗ No match"}
          </p>
        )}

        <button
          className="btn"
          onClick={handleUpdatePassword}
          disabled={!isStrongPassword || !passwordsMatch}
        >
          Update Password
        </button>
      </form>
    </div>
  );
}