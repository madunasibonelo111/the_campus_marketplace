import "./Home.css";
import { Link } from "react-router-dom";

function Home() {

  const scrollToHowItWorks = () => {
    const section = document.getElementById("how-it-works");
    section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>

     
      <nav className="navbar">
        <div className="logo-container">
          <img src="/campus-marketplace-logo.png" alt="Logo" className="logo-img" />
        </div>

        <div className="nav-links">
          <button onClick={scrollToHowItWorks} className="nav-btn secondary">
            How it works
          </button>

          <Link to="/auth">
            <button className="nav-btn primary">
              Get Started
            </button>
          </Link>
        </div>
      </nav>



      <section className="hero">

        <div className="hero-overlay"></div>

     
        <div className="hero-left">
          <h1>
            Your campus <br />
            marketplace made <br />
            simple.
          </h1>

          <p>
            Buy, sell, and connect with students on your campus easily and safely.
          </p>

         
        </div>

      </section>


      <section id="how-it-works" className="how">

        <h2>How It Works</h2>
        <p className="how-sub">
          Easy steps to start using Campus Marketplace.
        </p>

        <div className="steps">

          <div className="step">
            <div className="step-number">1</div>
            <img src="/Signing up on a sunny day.png" alt="Sign up" />
            <h3>Sign Up</h3>
            <p>Create your account.</p>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <img src="/Browsing for shoes and clothes online (1).png" alt="List items" />
            <h3>List Items</h3>
            <p>Post what you want to sell,trade or buy anything you like.</p>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <img src="/Item exchange in the park.png" alt="Connect" />
            <h3>Connect</h3>
            <p>Connect and meet safely on campus.</p>
          </div>

        </div>
      </section>

    </div>
  );
}

export default Home;