import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabaseClient";

import ForgotPassword from "./components/Auth/ForgotPassword";
import ResetPassword from "./components/Auth/ResetPassword";
import EmailConfirmed from "./components/Auth/EmailConfirmed";
import CreateListing from "./pages/Posting/create_listing";

import Home from "./pages/Home/Home";
import AuthContainer from "./pages/Auth/AuthContainer";
import Basket from "./pages/Browse/Basket";
import Messaging from "./pages/Messaging/Messaging";
import PaymentForm from "./pages/Payments/PaymentForm";
import TransactionHistory from "./pages/Profile/TransactionHistory";
import "./App.css";
import Reviews from './pages/Profile/Reviews'; 


function ItemDetailView({ selectedItem, setSelectedItem, currentUser }) {
  const navigate = useNavigate();
  const [avgRating, setAvgRating] = useState("No ratings");

  // Fetch Seller Rating
  useEffect(() => {
    const fetchSellerRating = async () => {
      if (!selectedItem?.user_id) return;

      try {
        const { data, error } = await supabase
          .from('ratings')
          .select('score')
          .eq('reviewee_id', selectedItem.user_id);

        if (error) throw error;

        if (data && data.length > 0) {
          const total = data.reduce((sum, r) => sum + r.score, 0);
          setAvgRating((total / data.length).toFixed(1));
        } else {
          setAvgRating("No ratings");
        }
      } catch (err) {
        console.error("Error fetching rating:", err);
        setAvgRating("No ratings");
      }
    };
    fetchSellerRating();
  }, [selectedItem]);

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;

    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);
      if (error) throw error;
      
      alert("Listing removed.");
      setSelectedItem(null); 
      window.location.reload(); 
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (!selectedItem) return null;

  return (
    <div className="detail-overlay">
      <div className="detail-card">
        
        <div className="detail-header-nav">
          <button onClick={() => setSelectedItem(null)} className="back-btn-pill">
            <span>←</span> Back to Shop
          </button>
          <div className="category-chip">
            {selectedItem.categories?.name || "Campus Item"}
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-visuals">
            <div className="image-container-main">
              <img src={selectedItem.image} alt={selectedItem.title} />
              <div className="status-tag">
                {selectedItem.condition?.toUpperCase() || "GOOD"}
              </div>
            </div>
          </div>

          <div className="detail-specs">
            <div className="specs-top">
              <h1 className="item-title-hero">{selectedItem.title}</h1>
              <div className="price-badge-hero">
                {selectedItem.listing_type === 'trade' 
                  ? "🤝 Trade Only" 
                  : `R${parseFloat(selectedItem.price || 0).toFixed(2)}`}
              </div>
            </div>

            <div className="specs-body">
              <div className="description-well">
                <p>{selectedItem.description || "No description provided."}</p>
              </div>

              <div className="perks-grid">
                <div className="perk-item">
                <div className="perk-icon">👤</div>
                <div className="perk-text">
                  <small>Seller</small>
                  <span 
                    onClick={() => navigate(`/reviews/${selectedItem.user_id}`)}
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center',
                      color: '#1e3a8a', // Using your theme blue
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px'
                    }}
                    title="View seller reviews"
                  >
                    {selectedItem.profiles?.name || "Verified Student"} 
                    <b style={{ color: "#f39c12", marginLeft: "10px", textDecoration: 'none' }}>
                      ⭐ {avgRating}
                    </b>
                  </span>
                </div>
              </div>

                <div className="perk-item">
                  <div className="perk-icon">📍</div>
                  <div className="perk-text">
                    <small>Meeting Spot</small>
                    <span>On-Campus (Safe Zone)</span>
                  </div>
                </div>

                <div className="perk-item">
                  <div className="perk-icon">📦</div>
                  <div className="perk-text">
                    <small>Deal Type</small>
                    <span>{selectedItem.listing_type}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="specs-footer">
              {currentUser?.id && String(selectedItem.user_id) === String(currentUser.id) ? (
                <button className="btn-action-delete" onClick={() => handleDeleteListing(selectedItem.id)}>
                  🗑️ Remove My Listing
                </button>
              ) : (
                <button className="btn-action-contact" onClick={() => navigate(`/messages?listingId=${selectedItem.id}`)}>
                  💬 Contact {selectedItem.profiles?.name || "Seller"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthContainer />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />
        <Route path="/payment" element={<PaymentForm />} />
        <Route path="/history" element={<TransactionHistory />} />
        <Route path="/reviews/:sellerId" element={<Reviews />} />
        
        {/* Protected Browse Route */}
        <Route
          path="/basket"
          element={
            currentUser ? (
              selectedItem ? (
                <ItemDetailView 
                  selectedItem={selectedItem} 
                  setSelectedItem={setSelectedItem}
                  currentUser={currentUser} 
                />
              ) : (
                <Basket onViewListing={(item) => setSelectedItem(item)} />
              )
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />

        {/* Other protected routes */}
        <Route path="/sell" element={currentUser ? <CreateListing /> : <Navigate to="/auth" replace />} />
        <Route path="/messages" element={currentUser ? <Messaging /> : <Navigate to="/auth" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;