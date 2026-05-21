import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";

import ForgotPassword from "./components/Auth/ForgotPassword";
import ResetPassword from "./components/Auth/ResetPassword";
import EmailConfirmed from "./components/Auth/EmailConfirmed";

import Home from "./pages/Home/Home";
import AuthContainer from "./pages/Auth/AuthContainer";
import Basket from "./pages/Browse/Basket";
import Messaging from "./pages/Messaging/Messaging";
import PaymentForm from "./pages/Payments/PaymentForm";
import TransactionHistory from "./pages/Profile/TransactionHistory";
import CreateListing from "./pages/Posting/create_listing";

import Reviews from "./pages/Profile/Reviews";
import SellerProfileReviews from "./pages/Profile/SellerProfileReviews";
import TradeOffers from "./pages/Profile/TradeOffers";

import StaffDashboard from "./pages/Staff/StaffDashboard";
import CollectionManagement from "./pages/Staff/CollectionManagement";
import DropoffManagement from "./pages/Staff/DropoffManagement";

import DropoffBooking from "./pages/Booking/DropoffBooking";
import CollectionBooking from "./pages/Booking/CollectionBooking";

import AdminDashboard from "./pages/Admin/AdminDashboard";
import FacilityConfig from "./pages/Admin/FacilityConfig";

import "./App.css";

function ItemDetailView({ selectedItem, setSelectedItem, currentUser }) {
  const navigate = useNavigate();
  const [avgRating, setAvgRating] = useState("No ratings");

  useEffect(() => {
    const fetchSellerRating = async () => {
      if (!selectedItem?.user_id) return;
      try {
        const { data, error } = await supabase
          .from("ratings")
          .select("score")
          .eq("reviewee_id", selectedItem.user_id);

        if (error) throw error;
        if (data?.length > 0) {
          const total = data.reduce((sum, r) => sum + Number(r.score), 0);
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
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
      alert("Listing removed.");
      setSelectedItem(null);
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleRestock = async () => {
  const newQty = prompt("Enter the new total quantity in stock:");
  if (newQty && !isNaN(newQty)) {
    const { error } = await supabase
      .from('listings')
      .update({ 
        quantity: parseInt(newQty),
        status: 'active' // Automatically re-activate the listing
      })
      .eq('id', selectedItem.id);

    if (error) alert("Error updating stock: " + error.message);
    else {
      alert("Stock updated successfully!");
      window.location.reload(); // Refresh to show the updated status
    }
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
          <div className="category-chip">{selectedItem.categories?.name || "Campus Item"}</div>
        </div>

        <div className="detail-grid">
          {/* Consolidated Image Container */}
          <div className="detail-visuals">
            <div className="image-container-main" style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
              {selectedItem.images?.length > 0 ? (
                selectedItem.images.map((url, idx) => (
                  <img 
                    key={idx} 
                    src={url} 
                    alt={`${selectedItem.title} ${idx + 1}`} 
                    style={{ minWidth: '200px', height: '300px', objectFit: 'cover', borderRadius: '12px' }} 
                  />
                ))
              ) : (
                <img src={selectedItem.image} alt={selectedItem.title} />
              )}
            </div>
            <div className="status-tag">{selectedItem.condition?.toUpperCase() || "GOOD"}</div>
          </div>


          <div className="detail-specs">
            <div className="specs-top">
              <h1 className="item-title-hero">{selectedItem.title}</h1>
              <div className="price-badge-hero">
                {selectedItem.listing_type === "trade"
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
                      onClick={() => navigate(`/seller/${selectedItem.user_id}/reviews`)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", color: "#f39c12", fontWeight: "bold" }}
                      title="View seller reviews"
                    >
                      {selectedItem.profiles?.name || "Verified Student"}
                      <b style={{ color: "#f39c12", marginLeft: "10px" }}>⭐ {avgRating}</b>
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
                  <div className="perk-icon">🏷️</div>
                  <div className="perk-text">
                    <small>Deal Type</small>
                    <span>{selectedItem.listing_type}</span>
                  </div>
                </div>

                <div className="perk-item">
                  <div className="perk-icon">📦</div>
                  <div className="perk-text">
                    <small>Available Stock</small>
                    <span style={{ color: selectedItem.quantity > 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                      {selectedItem.quantity > 0 ? `${selectedItem.quantity} units left` : "Out of Stock"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="specs-footer">
              {currentUser?.id && String(selectedItem.user_id) === String(currentUser.id) ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn-action-restock" 
                    onClick={handleRestock}
                    style={{ flex: 1, padding: '10px 0', fontSize: '14px', borderRadius: '20px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ➕ Restock Item
                  </button>
                  <button 
                    className="btn-action-delete" 
                    onClick={() => handleDeleteListing(selectedItem.id)}
                    style={{ flex: 1 }}
                  >
                    🗑️ Remove Listing
                  </button>
                </div>
              ) : selectedItem.quantity <= 0 ? (
                <button className="btn-action-disabled" disabled>🚫 Out of Stock</button>
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

        <Route path="/payment" element={currentUser ? <PaymentForm /> : <Navigate to="/auth" replace />} />
        <Route path="/history" element={currentUser ? <TransactionHistory /> : <Navigate to="/auth" replace />} />
        <Route path="/reviews/:sellerId" element={currentUser ? <Reviews /> : <Navigate to="/auth" replace />} />
        <Route path="/seller/:sellerId/reviews" element={<SellerProfileReviews />} />

        <Route path="/staff" element={currentUser ? <StaffDashboard /> : <Navigate to="/auth" replace />} />
        <Route path="/staff/collections" element={currentUser ? <CollectionManagement /> : <Navigate to="/auth" replace />} />
        <Route path="/staff/dropoffs" element={currentUser ? <DropoffManagement /> : <Navigate to="/auth" replace />} />
        <Route path="/booking/dropoff" element={currentUser ? <DropoffBooking /> : <Navigate to="/auth" replace />} />
        <Route path="/booking/collection" element={currentUser ? <CollectionBooking /> : <Navigate to="/auth" replace />} />

        <Route path="/basket" element={
          currentUser ? (
            selectedItem ? (
              <ItemDetailView selectedItem={selectedItem} setSelectedItem={setSelectedItem} currentUser={currentUser} />
            ) : (
              <Basket onViewListing={(item) => setSelectedItem(item)} currentUser={currentUser} />
            )
          ) : <Navigate to="/auth" replace />
        } />

        <Route path="/sell" element={currentUser ? <CreateListing /> : <Navigate to="/auth" replace />} />
        <Route path="/messages" element={currentUser ? <Messaging /> : <Navigate to="/auth" replace />} />
        <Route path="/tradeoffers" element={currentUser ? <TradeOffers currentUser={currentUser} /> : <Navigate to="/auth" replace />} />
        
        <Route path="/admin-dashboard" element={currentUser ? <AdminDashboard /> : <Navigate to="/auth" replace />} />
        <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="/admin/facility-config" element={currentUser ? <FacilityConfig /> : <Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;