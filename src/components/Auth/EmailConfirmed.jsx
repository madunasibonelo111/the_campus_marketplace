import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function EmailConfirmed() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="container">
      <div className="form-box" style={{ textAlign: "center" }}>
        <h1 style={{ color: "#333" }}>🎉 Email Verified!</h1>

        <p style={{ color: "#555", marginTop: "10px" }}>
          Your account has been successfully activated.
        </p>

        <div
          style={{
            margin: "20px auto",
            width: "50px",
            height: "50px",
            border: "4px solid #7494ec",
            borderTop: "4px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>

        <p style={{ fontSize: "13px", color: "#888" }}>
          Redirecting you to login...
        </p>

        <button
          className="btn"
          style={{ marginTop: "15px" }}
          onClick={() => navigate("/auth")}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}