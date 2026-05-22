import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";

// Components & Pages
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
import UserProfile from "./pages/Profile/UserProfile";

import "./App.css";

function ItemDetailView({ selectedItem, setSelectedItem, currentUser }) {
  const navigate = useNavigate();
  const [avgRating, setAvgRating] = useState("No ratings");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchSellerRating = async () => {
      if (!selectedItem?.user_id) return;
      try {
        const { data, error } = await supabase
          .from("ratings")
          .select("score")
          .eq("reviewee_id", selectedItem.user_id);

        if (error) throw error;
        setAvgRating(
          data?.length > 0 
            ? (data.reduce((sum, r) => sum + Number(r.score), 0) / data.length).toFixed(1) 
            : "No ratings"
        );
      } catch (err) {
        console.error("Error fetching rating:", err);
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

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason) return alert("Please select a reason.");
    setIsSubmittingReport(true);
    try {
      const { error } = await supabase.from("flagged_content").insert({
        reporter_id: currentUser.id,
        content_type: "listing",
        content_id: selectedItem.id,
        reason: reportReason,
        status: "pending"
      });
      if (error) throw error;
      alert("Thank you. This listing has been reported to the campus admins for review.");
      setShowReportModal(false);
      setReportReason("");
    } catch (err) {
      alert("Failed to submit report: " + err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (!selectedItem) return null;

  const displayImages = selectedItem.images?.length > 0 ? selectedItem.images : [selectedItem.image];

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
          {/* UPDATED VISUALS: Full-size Slider */}
          <div className="detail-visuals">
            <div className="main-image-container" style={{ position: 'relative', width: '100%', height: '400px', background: '#f8fafc', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={displayImages[currentImageIndex]} alt="Selected" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              {displayImages.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(p => (p === 0 ? displayImages.length - 1 : p - 1))} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>◀</button>
                  <button onClick={() => setCurrentImageIndex(p => (p === displayImages.length - 1 ? 0 : p + 1))} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>▶</button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
              {displayImages.map((url, idx) => (
                <img key={idx} src={url} onClick={() => setCurrentImageIndex(idx)} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: currentImageIndex === idx ? '2px solid #1e3a8a' : 'none' }} />
              ))}
            </div>
            <div className="status-tag" style={{ marginTop: '10px' }}>{selectedItem.condition?.toUpperCase() || "GOOD"}</div>
          </div>

          <div className="detail-specs">
            <div className="specs-top">
              <h1 className="item-title-hero">{selectedItem.title}</h1>
              <div className="price-badge-hero">
                {selectedItem.listing_type === "trade" ? "🤝 Trade Only" : `R${parseFloat(selectedItem.price || 0).toFixed(2)}`}
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
                    <span onClick={() => navigate(`/seller/${selectedItem.user_id}/reviews`)} style={{ cursor: "pointer", color: "#f39c12", fontWeight: "bold" }}>
                      {selectedItem.profiles?.name || "Verified Student"}
                      <b style={{ marginLeft: "10px" }}>⭐ {avgRating}</b>
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

            <div className="specs-footer" style={{ display: "flex", gap: "15px", marginTop: "35px" }}>
              {currentUser?.id && String(selectedItem.user_id) === String(currentUser.id) ? (
                <button className="btn-action-delete" onClick={() => handleDeleteListing(selectedItem.id)} style={{ width: "100%", margin: 0 }}>
                  🗑️ Remove My Listing
                </button>
              ) : (
                <>
                  <button className="btn-action-contact" style={{ flex: 1, margin: 0 }} onClick={() => navigate(`/messages?listingId=${selectedItem.id}`)}>
                    💬 Contact {selectedItem.profiles?.name || "Seller"}
                  </button>
                  <button onClick={() => setShowReportModal(true)} style={{ background: "#fff1f2", color: "#e11d48", border: "1px solid #fecaca", padding: "0 25px", borderRadius: "15px", fontWeight: "800", cursor: "pointer" }}>
                    🚩 Report
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '18px', width: '90%', maxWidth: '420px' }}>
            <h2 style={{ color: '#e11d48' }}>🚩 Report Listing</h2>
            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} required style={{ padding: '14px', borderRadius: '10px' }}>
                <option value="" disabled>Select a reason...</option>
                <option value="Suspicious or Scam">Suspicious or Scam</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="Fake Listing / Spam">Fake Listing / Spam</option>
              </select>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowReportModal(false)} style={{ flex: 1, padding: '14px' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: '#e11d48', color: 'white' }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
        <Route path="/profile" element={currentUser ? <UserProfile /> : <Navigate to="/auth" replace />} />
        <Route path="/profile/:userId" element={currentUser ? <UserProfile /> : <Navigate to="/auth" replace />} />
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