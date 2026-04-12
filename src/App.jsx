import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react"; // 🟢 Add this
import CreateListing from "./components/create_listing";
import Home from "./components/Home";
import AuthContainer from "./components/AuthContainer";
import Basket from "./Dashboard/Basket";
import "./App.css"; // 🟢 Ensure styles are imported

function App() {
  const [selectedItem, setSelectedItem] = useState(null); // 🟢 Track clicked item

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthContainer />} />
        
        {/* 🟢 Update this route to handle the click logic */}
        <Route 
          path="/basket" 
          element={
            selectedItem ? (
              /* Show Details if an item is selected */
              <div className="container">
                <div className="form-card" style={{ maxWidth: '850px' }}>
                  <button 
                    onClick={() => setSelectedItem(null)} 
                    style={{ marginBottom: '15px', cursor: 'pointer', background: 'none', border: 'none', color: '#3b82f6', fontWeight: 'bold' }}
                  >
                    ← Back
                  </button>
                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                      <img src={selectedItem.image} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: '1.2' }}>
                      <h2>{selectedItem.title}</h2>
                      <h3 style={{ color: '#3b82f6' }}>R{selectedItem.price}</h3>
                      <p><strong>Condition:</strong> {selectedItem.condition}</p>
                      <p>{selectedItem.description}</p>
                      <button className="btn-post" onClick={() => alert("Messaging with seller feature coming soon!")}>Interested?</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Show the standard Basket if nothing is selected */
              <Basket onViewListing={(item) => setSelectedItem(item)} />
            )
          } 
        />

        <Route path="/sell" element={<CreateListing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;