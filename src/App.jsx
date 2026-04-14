import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import CreateListing from "./pages/Posting/create_listing";
import Home from "./pages/Home/Home";
import AuthContainer from "./pages/Auth/AuthContainer";
import Basket from "./pages/Browse/Basket";
import "./App.css";

function App() {
  const [selectedItem, setSelectedItem] = useState(null); // Tracks clicked item for details view

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthContainer />} />
        
        <Route 
          path="/basket" 
          element={
            selectedItem ? (
              /* --- Detailed Item View --- */
              <div className="container">
                <div className="form-card" style={{ maxWidth: '900px', margin: '40px auto' }}>
                  <button 
                    onClick={() => setSelectedItem(null)} 
                    style={{ 
                      marginBottom: '20px', 
                      cursor: 'pointer', 
                      background: 'none', 
                      border: 'none', 
                      color: '#3b82f6', 
                      fontWeight: 'bold',
                      fontSize: '16px' 
                    }}
                  >
                    ← Back to Browse
                  </button>

                  <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'start' }}>
                    {/* Left: Product Image */}
                    <div style={{ flex: '1', minWidth: '320px' }}>
                      <img 
                        src={selectedItem.image} 
                        style={{ width: '100%', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                        alt={selectedItem.title}
                      />
                    </div>

                    {/* Right: Product & Seller Details */}
                    <div style={{ flex: '1.2', textAlign: 'left' }}>
                      <h1 style={{ color: '#0b1f3a', margin: '0 0 10px 0' }}>{selectedItem.title}</h1>
                      <h2 style={{ color: '#3b82f6', margin: '0' }}>R{selectedItem.price}</h2>
                      
                      <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

                      <p><strong>Condition:</strong> <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{selectedItem.condition?.toUpperCase()}</span></p>
                      
                      {/* Seller name pulled from the users join query in Basket.jsx */}
                      <p><strong>Seller:</strong> {selectedItem.users?.name || "Verified Student"}</p>
                      
                      <div style={{ marginTop: '20px' }}>
                        <strong>Description:</strong>
                        <p style={{ lineHeight: '1.6', color: '#555', marginTop: '8px' }}>
                          {selectedItem.description}
                        </p>
                      </div>

                      <button 
                        className="btn-post" 
                        style={{ marginTop: '30px' }}
                        onClick={() => alert(`Messaging seller function coming soon !`)}
                      >
                        📧 Contact Seller
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Marketplace Grid */
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