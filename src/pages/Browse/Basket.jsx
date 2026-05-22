import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import TradeOfferModal from "../Profile/TradeOfferModal";

import "./Basket.css";

export default function Basket({ onViewListing }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [items, setItems] = useState([]);
  const [basket, setBasket] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showBasket, setShowBasket] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedTradeItem, setSelectedTradeItem] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
    };
    fetchSession();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id, title, price, description, condition, category_id, user_id, status, listing_type, quantity,
          profiles (name), 
          categories (name), 
          listing_images (image_url, display_order)
        `);
      if (error) throw error;

      const formatted = (data || []).map((item) => {
        // Sort images by display_order just in case
        const sortedImages = (item.listing_images || []).sort((a, b) => a.display_order - b.display_order);
        
        return {
          ...item,
          seller_name: item.profiles?.name || "Unknown Seller",
          // Map all images if you want to use them later, or keep the first one as primary
          images: sortedImages.map(img => img.image_url),
          image: sortedImages[0]?.image_url || "https://via.placeholder.com/300",
        };
      });
      setItems(formatted);
    } catch (err) {
      console.error("Error fetching listings:", err);
      setItems([]);
    }
  };

  useEffect(() => {
    fetchListings();
    const fetchCats = async () => {
      const { data } = await supabase.from("categories").select("name");
      if (data) setAllCategories(data.map((c) => c.name));
    };
    fetchCats();
  }, []);

  const addToBasket = (item) => {
    setBasket((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromBasket = (item) => {
    setBasket((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (!exists) return prev;
      if (exists.quantity > 1) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter((i) => i.id !== item.id);
    });
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      alert("Please login to checkout");
      navigate("/auth");
      return;
    }
    if (basket.length === 0) {
      alert("Your basket is empty");
      return;
    }
    try {
      const totalAmount = basket.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
      if (totalAmount <= 0) {
        alert("Invalid total amount");
        return;
      }

      let { data: existingUser, error: userFetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUser.id)
        .single();

      if (userFetchError && userFetchError.code === "PGRST116") {
        const { data: newUser, error: createUserError } = await supabase
          .from("profiles")
          .insert({
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "User",
            email: currentUser.email,
            role: "student",
          })
          .select()
          .single();
        if (createUserError) throw createUserError;
        existingUser = newUser;
      } else if (userFetchError) {
        throw userFetchError;
      }

      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          listing_id: basket[0].id,
          buyer_id: existingUser.id,
          seller_id: basket[0].user_id,
          type: "purchase",
          status: "pending",
          total_amount: totalAmount,
          amount_paid: 0,
          remaining_balance: totalAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (transactionError) throw transactionError;
      setShowBasket(false);
      navigate("/payment", { state: { basket, totalAmount, transaction } });
    } catch (error) {
      console.error("Checkout error:", error);
      alert(`Error processing checkout: ${error.message}`);
    }
  };

  
  const filtered = items.filter((i) => {
    const matchCat = category === "All" || i.categories?.name === category;
    const matchSearch = (i.title || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  
  return (
    <div className="browse-wrapper">
      <aside className={`filter-sidebar ${isFilterOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">Filters</h3>
          <button className="close-sidebar" onClick={() => setIsFilterOpen(false)}>×</button>
        </div>
        <div className="sidebar-links">
          <button onClick={() => { setCategory("All"); setIsFilterOpen(false); }} className={category === "All" ? "active" : ""}>All Items</button>
          {allCategories.map((name) => (
            <button key={name} onClick={() => { setCategory(name); setIsFilterOpen(false); }} className={category === name ? "active" : ""}>{name}</button>
          ))}
        </div>
      </aside>

      <div className="sticky-top">
        <div className="designer-banner">
          <div className="banner-content">
            <h2>Find what you need, <span>instantly.</span></h2>
            <p>The official campus hub for textbooks, tech, and style.</p>
          </div>
          <div className="basketBtn">
            <button onClick={() => setShowBasket(!showBasket)} aria-label="Open basket">
              🛒 Basket ({basket.reduce((s, i) => s + i.quantity, 0)})
            </button>
          </div>
        </div>
        <div className="filter-bar">
          <button className="filter-toggle-btn" onClick={() => setIsFilterOpen(true)}><span>☰</span> Explore Categories</button>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="results-count">Showing {filtered.length} results</div>
          </div>
        </div>
      </div>

      {showBasket && (
        <div className="basket">
          <button className="close-basket" onClick={() => setShowBasket(false)}>Close</button>
          <h2>Your Basket</h2>
          <div className="basket-items">
            {basket.length === 0 ? <p className="empty-basket">Your basket is empty</p> : 
              basket.map((i) => (
                <div key={i.id} className="basket-row">
                  <div className="basket-item-info">
                    <span className="basket-item-name">{i.title}</span>
                    <span className="basket-item-qty">Qty: {i.quantity}</span>
                  </div>
                  <div className="basket-item-actions">
                    <span className="basket-item-price">R{(i.price * i.quantity).toFixed(2)}</span>
                    <div className="basket-controls">
                      <button onClick={() => removeFromBasket(i)}>−</button>
                      <button onClick={() => addToBasket(i)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {basket.length > 0 && (
            <div className="basket-total-container">
              <div className="basket-total-row">
                <span>Total Amount</span>
                <strong className="final-total">R{basket.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0).toFixed(2)}</strong>
              </div>
              <button className="checkout-btn" onClick={handleCheckout}>Proceed to Checkout</button>
            </div>
          )}
        </div>
      )}

      <div className="scroll-area">
        <div className="gridItems">
          {filtered.map((item) => {
            const isSold = item.status === "sold";
            const isOwner = currentUser?.id === String(item.user_id);
            return (
              <div key={item.id} className="card">
                <div style={{ position: "relative" }}>
                  <img src={item.image} onClick={() => onViewListing(item)} alt={item.title} />
                  {item.images?.length > 1 && (
                    <div className="image-count-badge">
                      {item.images.length} 📸
                    </div>
                  )}
                  {isSold && <div className="sold-overlay">SOLD</div>}
                </div>
                <h3>{item.title}</h3>
                <p className="price-main-bold">R{parseFloat(item.price || 0).toFixed(2)}</p>
                <p style={{ margin: "-5px 0 10px 0", fontSize: "13px", fontWeight: "bold", color: (item.quantity ?? 1) > 0 ? "#059669" : "#ef4444" }}>{(item.quantity ?? 1) > 0 ? `📦 ${item.quantity ?? 1} in stock` : "🚫 Out of Stock"}</p>
                <div className="item-actions">
                  {isSold ? (
                    <button disabled className="btn-sold">Out of Stock</button>
                  ) : isOwner ? (
                    <button disabled className="btn-owner">Your Listing</button>
                  ) : (
                    <div className="dual-action-gap">
                       <button className="btn-buy" onClick={() => addToBasket(item)}>Add to Basket</button>
                       {item.listing_type !== "sale" && (
                         <button className="btn-trade-outline" onClick={() => { setSelectedTradeItem(item); setShowTradeModal(true); }}>Trade</button>
                       )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bottomNav">
        <button className="activeBottom">SHOP</button>
        <button onClick={() => navigate("/sell")}>SELL</button>
        <button onClick={() => navigate("/messages")}>MESSAGES</button>
        <button onClick={() => navigate("/tradeoffers")}>TRADE OFFERS</button>
        <button onClick={() => navigate("/profile")}>PROFILE</button>
        <button onClick={() => navigate("/history")}>HISTORY</button>
        <button onClick={async () => {await supabase.auth.signOut();navigate("/auth");}} style={{ color: "#ef4444" }}>LOGOUT</button>
      </div>

      <TradeOfferModal
        open={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        currentUser={currentUser}
        requestedListing={selectedTradeItem}
      />
    </div>
  );
}