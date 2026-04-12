import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Register({ switchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    if (!email || !password || !name || !gender || !role) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([
          {
            email: email,
            name: name,
            password_hash: password
          }
        ])
        .select();

      if (userError) {
        alert("User error: " + userError.message);
        setLoading(false);
        return;
      }

      if (userData && userData.length > 0) {
        const userId = userData[0].id;

        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              user_id: userId,
              name: name,
              gender: gender,
              role: role
            }
          ]);

        if (profileError) {
          console.error("Profile error:", profileError);
          alert("User created but profile not saved: " + profileError.message);
        } else {
          alert("✅ Registered successfully! Please login.");
          switchToLogin();
        }
      } else {
        alert("No user data returned");
      }
    } catch (error) {
      alert("An error occurred during registration: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-box register">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Register</h1>

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
            type="text"
            placeholder="Name"
            required
            onChange={(e) => setName(e.target.value)}
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

        <div className="input-box">
          <select required onChange={(e) => setGender(e.target.value)}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="input-box">
          <select required onChange={(e) => setRole(e.target.value)}>
            <option value="">Select Role</option>
            <option value="Student">Student</option>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleRegister}
          disabled={loading}
          data-testid="register-button"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p>Or register with social platform</p>

        <div className="social-icons">
          <a href="#"><i className="fa-brands fa-google"></i></a>
          <a href="#"><i className="fa-brands fa-facebook"></i></a>
          <a href="#"><i className="fa-brands fa-instagram"></i></a>
        </div>
      </form>
    </div>
  );
}