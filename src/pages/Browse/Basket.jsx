import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    fetchListings();
    fetchCats();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase.from("listings").select(`
        id, title, price, description, condition, category_id, user_id, status, listing_type, quantity,
        profiles(name), categories(name), listing_images(image_url, display_order)
      `);
      if (error) throw error;

      const formatted = (data || []).map((item) => ({
        ...item,
        seller_name: item.profiles?.name || "Unknown Seller",
        // Keep the whole array of images
        images: (item.listing_images || []).sort((a, b) => a.display_order - b.display_order).map(img => img.image_url)
      }));
      setItems(formatted);
    } catch (err) {
      console.error("Error fetching listings:", err);
      setItems([]);
    }
  };

  const fetchCats = async () => {
    const { data } = await supabase.from("categories").select("name");
    if (data) setAllCategories(data.map((c) => c.name));
  };

  const addToBasket = (item) => {
    setBasket((prev) => {
      // Find the current quantity of this item in the basket
      const existingInBasket = prev.find((i) => i.id === item.id);
      const currentBasketQty = existingInBasket ? existingInBasket.quantity : 0;

      // Check: If adding 1 more would exceed available stock, stop it
      if (currentBasketQty + 1 > (item.quantity || 0)) {
        alert(`Only ${item.quantity} unit(s) available.`);
        return prev;
      }
      if (existingInBasket) {
        return prev.map((i) => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
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
    if (basket.length === 0) return alert("Your basket is empty");

    try {
      
      const itemToBuy = basket[0];
      if (itemToBuy.quantity < basket.reduce((sum, i) => sum + i.quantity, 0)) {
          alert(`Sorry, only ${itemToBuy.quantity} unit(s) available for this item.`);
          return;
      }
      const totalAmount = basket.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
      
   

      //  Get/Create User Profile
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
      } else if (userFetchError) throw userFetchError;

      

      //  Insert Transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          listing_id: itemToBuy.id,
          buyer_id: existingUser.id,
          seller_id: itemToBuy.user_id,
          type: "purchase",
          status: "pending",
          total_amount: totalAmount,
          remaining_balance: totalAmount,
          amount_paid: 0,
        })
        .select()
        .single();

      if (transactionError) {
        console.error("Transaction Insert Error:", transactionError);
        throw transactionError;
      }
      
      console.log("Transaction created successfully:", transaction);

      //  Update Listing Inventory
      const totalPurchased = basket.reduce((sum, i) => sum + i.quantity, 0);
      const newQuantity = itemToBuy.quantity - totalPurchased;


      const { data: updatedListing, error: updateError } = await supabase
        .from('listings')
        .update({ 
          quantity: newQuantity,
          status: newQuantity <= 0 ? 'sold' : 'active'
        })
        .eq('id', itemToBuy.id)
        .select();

      if (updateError) {
        console.error("Inventory Update Error Details:", updateError);
        throw updateError;
      }
      
     

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
            {basket.length === 0 ? <p className="empty-basket">Your basket is empty</p> : basket.map((i) => (
              <div key={i.id} className="basket-row">
                <img src={i.images?.[0]} className="basket-item-thumbnail" alt={i.title} />
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
            const stockCount = item.quantity || 0;
            const isSold = item.status === "sold" || (item.quantity !== null && item.quantity <= 0);
            const isOwner = currentUser?.id === String(item.user_id);
            return (
              <div key={item.id} className="card">
                <div style={{ position: "relative" }}>
                  {/* Use the first image in the array, or a placeholder if none exist */}
                  <img 
                    src={item.images?.[0] || "https://via.placeholder.com/300"} 
                    onClick={() => onViewListing(item)} 
                    alt={item.title} 
                    className="card-image"
                  />
                  {isSold && <div className="sold-overlay">SOLD</div>}
                </div>
                <h3>{item.title}</h3>
                <p className="price-main-bold">R{parseFloat(item.price || 0).toFixed(2)}</p>
                <div className="item-actions">
                  {isSold ? <button disabled className="btn-sold">Out of Stock</button>
                  : isOwner ? <button disabled className="btn-owner">Your Listing</button>
                  : item.listing_type === "either" ? (
                    <div className="dual-action-gap">
                      <button className="btn-buy" onClick={() => addToBasket(item)}>Add to Basket</button>
                      <button className="btn-trade-outline" onClick={() => { setSelectedTradeItem(item); setShowTradeModal(true); }}>Trade</button>
                    </div>
                  ) : item.listing_type === "trade" ? (
                    <button className="btn-trade" onClick={() => { setSelectedTradeItem(item); setShowTradeModal(true); }}>Trade</button>
                  ) : (
                    <button className="btn-buy" onClick={() => addToBasket(item)}>Add to Basket</button>
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
        <button onClick={() => navigate("/history")}>HISTORY</button>
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