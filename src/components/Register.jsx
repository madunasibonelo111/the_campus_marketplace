import { useState } from "react";
import { supabase } from "../lib/supabaseClient"; // ✅ fix path if needed

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    setLoading(false);
    return;
  }

  // ✅ INSERT PROFILE AFTER USER CREATED
  if (data?.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: data.user.id,
          email,
          name,
          gender,
          role
        }
      ]);

    if (profileError) {
      console.error(profileError);
      alert("Profile not saved, but account created.");
    }
  }

  alert("✅ Registered successfully! Please login.");
  switchToLogin();

  setLoading(false);
};

  return (
    <div className="form-box register">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Register</h1>

        {/* Email */}
        <div className="input-box">
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <i className="fa-solid fa-envelope"></i>
        </div>

        {/* Username */}
        <div className="input-box">
          <input
            type="text"
            placeholder="Name"
            required
            onChange={(e) => setName(e.target.value)}
          />
          <i className="fa-solid fa-user"></i>
        </div>

        {/* Password */}
        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          <i className="fa-solid fa-lock"></i>
        </div>

        {/* Gender */}
        <div className="input-box">
          <select required onChange={(e) => setGender(e.target.value)}>
  <option value="">Select Gender</option>
  <option value="male">Male</option>
  <option value="female">Female</option>
  <option value="other">Other</option>
</select>
        </div>

        {/* Role */}
        <div className="input-box">
          <select required onChange={(e) => setRole(e.target.value)}>
  <option value="">Select Role</option>
  <option value="student">Student</option>
  <option value="staff">Staff Member</option>
</select>
        </div>

        {/* ✅ BUTTON NOW WORKS */}
       <button
  type="button"
  className="btn"
  onClick={handleRegister}
  disabled={loading}
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