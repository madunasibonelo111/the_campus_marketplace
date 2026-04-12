import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import AuthContainer from "./components/AuthContainer";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />          {/* Homepage */}
        <Route path="/auth" element={<AuthContainer />} /> {/* Login/Register */}
      </Routes>
    </Router>
  );
}

export default App;