import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";
import "./AuthForm.css";

export default function Register({ switchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    
    // Check for educational institution emails (optional)
    const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'students.wits.ac.za', 'wits.ac.za'];
    const domain = email.split('@')[1];
    if (!validDomains.some(validDomain => domain === validDomain)) {
      return "Please use a valid email domain";
    }
    return "";
  };

  // Password strength validation
  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character";
    return "";
  };

  // Name validation
  const validateName = (name) => {
    if (!name) return "Name is required";
    if (name.length < 2) return "Name must be at least 2 characters long";
    if (name.length > 50) return "Name must be less than 50 characters";
    return "";
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      name: validateName(name),
      gender: !gender ? "Gender is required" : "",
      role: !role ? "Role is required" : "",
      confirmPassword: password !== confirmPassword ? "Passwords do not match" : ""
    };
    
    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === "");
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    if (strength <= 2) return "Weak";
    if (strength <= 4) return "Medium";
    return "Strong";
  };

  const handleRegister = async () => {
    if (loading) return;
    
    if (!validateForm()) {
      alert("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .single();

      if (existingUser) {
        alert("Email already registered. Please use a different email or login.");
        setLoading(false);
        return;
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert into users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([
          {
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password_hash: hashedPassword,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (userError) {
        alert("Registration error: " + userError.message);
        setLoading(false);
        return;
      }

      const userId = userData[0].id;

      // Insert into profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            user_id: userId,
            name: name.trim(),
            gender: gender,
            role: role,
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error("Profile error:", profileError);
        alert("Account created but profile not saved. Please contact support.");
      } else {
        alert("✅ Registration successful! Please login.");
        switchToLogin();
      }
    } catch (error) {
      alert("An error occurred during registration: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="form-box register">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>Register</h1>

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
            type="text"
            placeholder="Full Name"
            required
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "error" : ""}
          />
          <i className="fa-solid fa-user"></i>
          {errors.name && <span className="error-text">{errors.name}</span>}
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
          {password && (
            <div className={`password-strength strength-${passwordStrength.toLowerCase()}`}>
              Password Strength: {passwordStrength}
            </div>
          )}
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="input-box">
          <input
            type="password"
            placeholder="Confirm Password"
            required
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={errors.confirmPassword ? "error" : ""}
          />
          <i className="fa-solid fa-lock"></i>
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>

        <div className="input-box">
          <select required onChange={(e) => setGender(e.target.value)} className={errors.gender ? "error" : ""}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <span className="error-text">{errors.gender}</span>}
        </div>

        <div className="input-box">
          <select required onChange={(e) => setRole(e.target.value)} className={errors.role ? "error" : ""}>
            <option value="">Select Role</option>
            <option value="Student">Student</option>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
          {errors.role && <span className="error-text">{errors.role}</span>}
        </div>

        <div className="password-requirements">
          <small>Password must contain:</small>
          <ul>
            <li className={password.length >= 8 ? "valid" : ""}>At least 8 characters</li>
            <li className={/[A-Z]/.test(password) ? "valid" : ""}>One uppercase letter</li>
            <li className={/[a-z]/.test(password) ? "valid" : ""}>One lowercase letter</li>
            <li className={/[0-9]/.test(password) ? "valid" : ""}>One number</li>
            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "valid" : ""}>One special character</li>
          </ul>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p>
          Already have an account? <a href="#" onClick={switchToLogin}>Login</a>
        </p>
      </form>
    </div>
  );
}