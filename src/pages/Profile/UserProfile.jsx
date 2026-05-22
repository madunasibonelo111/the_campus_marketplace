import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "../Browse/Basket.css"; 
import ProfileSettingsModal from "./ProfileSettingsModal";
import EditListingModal from "./EditListingModal";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [targetUser, setTargetUser] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [ratingInfo, setRatingInfo] = useState({ average: "0.0", count: 0 });
  const [completedTrades, setCompletedTrades] = useState(0);
  
  const [activeTab, setActiveTab] = useState("active"); 
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingListing, setEditingListing] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        navigate("/auth");
        return;
      }

      const profileIdToFetch = userId || currentUser.id;
      setIsOwnProfile(profileIdToFetch === currentUser.id);

      // Fetch Profile Details
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileIdToFetch)
        .single();
      if (profileData) setTargetUser(profileData);

      // Fetch Listings
        // 2. Fetch Listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select(`id, title, price, description, condition, status, quantity, listing_type, listing_images (image_url)`)
        .eq("user_id", profileIdToFetch)
        .order("created_at", { ascending: false });

      if (listingsData) {
        const formattedListings = listingsData.map((item) => ({
          ...item,
          image: item.listing_images?.[0]?.image_url || "https://via.placeholder.com/300",
        }));
        setUserListings(formattedListings);
      }

      // Fetch Ratings
      const { data: ratingData } = await supabase
        .from("ratings")
        .select("score")
        .eq("reviewee_id", profileIdToFetch);

      if (ratingData && ratingData.length > 0) {
        const totalScore = ratingData.reduce((sum, r) => sum + Number(r.score), 0);
        setRatingInfo({ average: (totalScore / ratingData.length).toFixed(1), count: ratingData.length });
      }

      // Fetch Completed Transactions
      const { count: txCount } = await supabase
        .from("transactions")
        .select("*", { count: 'exact', head: true })
        .or(`seller_id.eq.${profileIdToFetch},buyer_id.eq.${profileIdToFetch}`)
        .eq("status", "completed");
        
      setCompletedTrades(txCount || 0);
      setLoading(false);
    };

    fetchProfileData();
  }, [userId, navigate]);

  if (loading) return <div style={{ padding: "50px", textAlign: "center", color: "#0b1f3a" }}>Loading Profile...</div>;
  if (!targetUser) return <div style={{ padding: "50px", textAlign: "center", color: "#0b1f3a" }}>User not found.</div>;

  const activeListings = userListings.filter(l => l.status !== 'sold');
  const soldListings = userListings.filter(l => l.status === 'sold');
  const joinDate = new Date(targetUser.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
    return (
    <div className="browse-wrapper">
      
      {/* ------------------------------------------------ */}
      {/* TOP NAVIGATION: Back (Left) & Actions (Right)    */}
      {/* ------------------------------------------------ */}
      <div style={{ padding: "30px 40px 0 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => navigate('/basket')} className="back-btn-pill" style={{ margin: 0, width: "fit-content" }}>
          <span>←</span> Back to Shop
        </button>
        {isOwnProfile && (
            <button 
              onClick={handleLogout} 
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", padding: "10px 20px", borderRadius: "50px", cursor: "pointer", fontWeight: "bold" }}
            >
              🚪 Logout
            </button>
          )}
       
        {/* ROW 2: Action Buttons (Conditional) */}
        
          {isOwnProfile ? (
            <button onClick={() => setShowSettings(true)} style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#334155" }}>
              ✏️ Edit Profile Settings
            </button>
          ) : (
            <button onClick={() => navigate(`/messages?userId=${targetUser.id}`)} style={{ background: "#1e3a8a", border: "none", padding: "10px 25px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "white" }}>
              💬 Message Seller
            </button>
          )}
        
      </div>

      {/* ------------------------------------------------ */}
      {/* TOP SECTION: Identity, Bio, Stats                */}
      {/* ------------------------------------------------ */}
      <div className="designer-banner" style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* ROW 1: Identity */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: "bold", overflow: "hidden" }}>
            {targetUser.avatar_url ? (
              <img src={targetUser.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              targetUser.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 style={{ margin: "0 0 5px 0", display: "flex", alignItems: "center", gap: "10px" }}>
              {targetUser.name}
              {targetUser.role === 'student' && (
                <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '50px', fontSize: '11px', border: '1px solid #bbf7d0' }}>✓ Verified Student</span>
              )}
            </h2>
            <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "14px" }}>{targetUser.role.toUpperCase()} | Joined {joinDate}</p>
            <p style={{ margin: 0, fontWeight: "bold", color: "#f39c12", fontSize: "15px" }}>⭐ {ratingInfo.average} ({ratingInfo.count} Reviews)</p>
          </div>
        </div>

       

        {/* ROW 3: Bio */}
        <div style={{ fontStyle: "italic", color: "#334155", borderLeft: "4px solid #e2e8f0", paddingLeft: "15px", maxWidth: "800px" }}>
          "{targetUser.bio || "Buying and selling campus essentials."}"
        </div>
    {/* ROW 4: Modern Stats Blocks */}
        <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
          <div style={{ background: "white", padding: "15px 25px", borderRadius: "16px", textAlign: "center", minWidth: "110px", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "#1e3a8a" }}>{activeListings.length}</div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>Active</div>
          </div>
          <div style={{ background: "white", padding: "15px 25px", borderRadius: "16px", textAlign: "center", minWidth: "110px", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "#1e3a8a" }}>{soldListings.length}</div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>Sold</div>
          </div>
          <div style={{ background: "white", padding: "15px 25px", borderRadius: "16px", textAlign: "center", minWidth: "110px", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "#1e3a8a" }}>{completedTrades}</div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>Trades</div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------ */}
      {/* TABS                                             */}
      {/* ------------------------------------------------ */}
      <div style={{ display: "flex", gap: "30px", padding: "0 40px", borderBottom: "2px solid #e2e8f0", marginTop: "20px" }}>
        <button onClick={() => setActiveTab("active")} style={{ background: "none", border: "none", padding: "15px 0", fontSize: "16px", fontWeight: "bold", cursor: "pointer", color: activeTab === "active" ? "#1e3a8a" : "#94a3b8", borderBottom: activeTab === "active" ? "3px solid #1e3a8a" : "3px solid transparent" }}>
          Listings
        </button>
        <button onClick={() => setActiveTab("sold")} style={{ background: "none", border: "none", padding: "15px 0", fontSize: "16px", fontWeight: "bold", cursor: "pointer", color: activeTab === "sold" ? "#1e3a8a" : "#94a3b8", borderBottom: activeTab === "sold" ? "3px solid #1e3a8a" : "3px solid transparent" }}>
          Sold Items
        </button>
        <button onClick={() => setActiveTab("activity")} style={{ background: "none", border: "none", padding: "15px 0", fontSize: "16px", fontWeight: "bold", cursor: "pointer", color: activeTab === "activity" ? "#1e3a8a" : "#94a3b8", borderBottom: activeTab === "activity" ? "3px solid #1e3a8a" : "3px solid transparent" }}>
          Activity
        </button>
      </div>

      {/* ------------------------------------------------ */}
      {/* RECENT LISTINGS / CONTENT                        */}
      {/* ------------------------------------------------ */}
      <div className="scroll-area">
        
        {(activeTab === "active" || activeTab === "sold") && (
          <div className="gridItems">
            {(activeTab === "active" ? activeListings : soldListings).map((item) => (
              <div key={item.id} className="card">
                <div style={{ position: "relative" }}>
                  <img src={item.image} alt={item.title} />
                  {item.status === 'sold' && <div className="sold-overlay">SOLD</div>}
                </div>
                <h3>{item.title}</h3>
      <p className="price-main-bold">R{parseFloat(item.price || 0).toFixed(2)}</p>
      
      {/* Shows quantity in stock (with a fallback to 1 if it's null/undefined) */}
      <p style={{ margin: "-5px 0 15px 0", fontSize: "13px", fontWeight: "bold", color: (item.quantity ?? 1) > 0 ? "#059669" : "#ef4444" }}>
        {(item.quantity ?? 1) > 0 ? `📦 ${item.quantity ?? 1} in stock` : "🚫 Out of Stock"}
      </p>

      <div className="item-actions">
        {isOwnProfile ? (
          <button className="btn-trade-outline" onClick={() => setEditingListing(item)}>✏️ Edit Listing</button>
                  ) : item.status === 'sold' ? (
                    <button disabled className="btn-sold">Out of Stock</button>
                  ) : (
                    <button className="btn-buy" onClick={() => navigate(`/messages?listingId=${item.id}`)}>💬 Message Seller</button>
                  )}
                </div>
              </div>
            ))}
            {(activeTab === "active" && activeListings.length === 0) && <p style={{color: "#64748b"}}>No active listings.</p>}
            {(activeTab === "sold" && soldListings.length === 0) && <p style={{color: "#64748b"}}>No sold items yet.</p>}
          </div>
        )}

        {activeTab === "activity" && (
          <div style={{ background: "white", padding: "30px", borderRadius: "18px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ marginTop: 0, color: "#0b1f3a" }}>Marketplace History</h3>
            <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
              {completedTrades > 0 ? (
                <li style={{ padding: "15px 0", borderBottom: "1px solid #f1f5f9", color: "#475569" }}>✅ Completed a secure campus handoff.</li>
              ) : (
                <li style={{ color: "#94a3b8" }}>No recent marketplace activity to display.</li>
              )}
            </ul>
          </div>
        )}

      </div>
      
      {showSettings && (
        <ProfileSettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
          currentUserData={targetUser}
          onSaveSuccess={() => window.location.reload()} 
        />
      )}
      {editingListing && (
        <EditListingModal 
          isOpen={!!editingListing} 
          onClose={() => setEditingListing(null)} 
          listingData={editingListing}
          onSaveSuccess={() => window.location.reload()} 
        />
      )}
      
    </div>
  );
}