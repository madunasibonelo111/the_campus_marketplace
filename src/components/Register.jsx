export default function Register() {
  return (
    <div className="form-box register">
      <form>
        <h1>Register</h1>

        {/* Email */}
        <div className="input-box">
          <input type="email" placeholder="Email" required />
          <i className="fa-solid fa-envelope"></i>
        </div>

        {/* Username */}
        <div className="input-box">
          <input type="text" placeholder="Username" required />
          <i className="fa-solid fa-user"></i>
        </div>

        {/* Password */}
        <div className="input-box">
          <input type="password" placeholder="Password" required />
          <i className="fa-solid fa-lock"></i>
        </div>

        {/* NEW: Gender */}
        <div className="input-box">
          <select required>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* NEW: Role */}
        <div className="input-box">
          <select required>
            <option value="">Select Role</option>
            <option value="student">Student</option>
            <option value="staff">Staff Member</option>
          </select>
        </div>

        <button type="button" className="btn">Register</button>

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