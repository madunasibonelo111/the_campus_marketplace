import { useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendReset = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("📧 Check your email for reset link");
      navigate("/auth");
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="form-box-standalone">
        <form onSubmit={(e) => e.preventDefault()}>
          <h1>Forgot Password</h1>

          <p>Enter your email to receive a reset link</p>

          <div className="input-box">
            <input
              type="email"
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleSendReset}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p style={{ marginTop: "15px" }}>
            <span
              onClick={() => navigate("/auth")}
              style={{ color: "#7494ec", cursor: "pointer", fontWeight: 600 }}
            >
              Back to Login
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}