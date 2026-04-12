export default function Login() {
  return (
    <div className="form-box login">
      <form>
        <h1>Login</h1>

        <div className="input-box">
          <input type="text" placeholder="Username" required />
          <i className="fa-solid fa-user"></i>
        </div>

        <div className="input-box">
          <input type="password" placeholder="Password" required />
          <i className="fa-solid fa-lock"></i>
        </div>

        <div className="forgot-link">
          <a href="#">Forgot Password?</a>
        </div>

        <button type="button" className="btn">Login</button>

        <p>Or login with social platform</p>

        <div className="social-icons">
          <a href="#"><i className="fa-brands fa-google"></i></a>
          <a href="#"><i className="fa-brands fa-facebook"></i></a>
          <a href="#"><i className="fa-brands fa-instagram"></i></a>
        </div>
      </form>
    </div>
  );
}