import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";

import Home from "./components/Home";
import AuthContainer from "./components/AuthContainer";
import Basket from "./Dashboard/Basket";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />          {/* Homepage */}
        <Route path="/auth" element={<AuthContainer />} /> {/* Login/Register */}
        <Route path="/basket" element={<Basket />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;