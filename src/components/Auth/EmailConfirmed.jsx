import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient"; 
import "./Auth.css";

export default function EmailConfirmed() {
  const navigate = useNavigate();

  useEffect(() => {
    const syncProfile = async () => {
      // Get the current user who just clicked the link
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        
        const { error } = await supabase.from("profiles").upsert({
          id: user.id, 
          name: user.user_metadata.name,
          gender: user.user_metadata.gender,
          role: user.user_metadata.role,
          email: user.email,
        });

        if (error) {
          console.error("Profile sync failed:", error.message);
        } else {
          console.log("Profile successfully synced to database!");
        }
      }
    };

    syncProfile();

    const timer = setTimeout(() => {
      navigate("/auth");
    }, 5000); 

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="form-box-standalone" style={{ textAlign: "center" }}>
        <h1>🎉 Account Activated!</h1>
        <p style={{ marginTop: '10px' }}>Syncing your profile with the campus database...</p>
        
        <div style={{
            margin: "20px auto",
            width: "40px",
            height: "40px",
            border: "4px solid #7494ec",
            borderTop: "4px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}></div>

        <p style={{ fontSize: "13px", color: "#888" }}>
          Redirecting to login shortly...
        </p>
      </div>
    </div>
  );
}