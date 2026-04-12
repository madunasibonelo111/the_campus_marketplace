import React, { useEffect, useState } from "react";
import {supabase} from "../lib/supabaseClient";
import "./Basket.css";

export default function Basket({ onViewListing }) {
  const [items, setItems] = useState([]);
  const [basket, setBasket] = useState([]);

  const [allCategories, setAllCategories] = useState([]); //To store everything from the DB
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showBasket, setShowBasket] = useState(false);

  // get listings
  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        title,
        price,
        description,
        condition,
        category_id,
        user_id,
        users ( name ),
        categories ( name ),
        listing_images (
          image_url,
          display_order
        )
      `);

    if (error) {
      console.error("Supabase Error:", error.message);
      return;
    }

    const formatted = (data || []).map((item) => {
      const sorted = item.listing_images?.sort(
        (a, b) => a.display_order - b.display_order
      );

      return {
        ...item,
        image: sorted?.[0]?.image_url || "https://via.placeholder.com/300",
      };
    });

    setItems(formatted);
  };

  useEffect(() => {
  fetchListings();

  // Fetch the actual category names from the db categories table
  const fetchCategoryNames = async () => {
    const { data } = await supabase.from('categories').select('name');
    if (data) setAllCategories(data.map(c => c.name));
  };
  
  fetchCategoryNames();
}, []);

  // basket logic
  const addToBasket = (item) => {
    setBasket((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
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
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== item.id);
    });
  };

  const total = basket.reduce(
    (sum, i) => sum + (i.price || 0) * i.quantity,
    0
  );

  const handleCheckout = () => {
    alert("🚀 This feature will be available in the next sprint!");
    setBasket([]);
    setShowBasket(false);
  };

  // filter logic
  const filtered = items.filter((i) => {
    const matchCategory =
      category === "All" || i.categories?.name === category;

    const matchSearch = (i.title || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchCategory && matchSearch;
  });

  return (
  <div>
    {/*welcome to site banner ..*/}
    <div style={{ 
      textAlign: 'left', 
      marginBottom: '40px', 
      padding: '30px', 
      background: 'white', 
      borderRadius: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
      borderLeft: '6px solid #D4AF37' 
    }}>
      <h2 style={{ margin: 0, color: '#0b1f3a', fontSize: '32px' }}>
        Find what you need, <span style={{ color: '#3b82f6' }}>instantly.</span>
      </h2>
      <p style={{ color: '#666', marginTop: '10px', fontSize: '16px' }}>
        The official campus hub for textbooks, tech, and style.
      </p>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold', background: '#f0f7ff', padding: '5px 12px', borderRadius: '15px' }}>
          ✨ {items.length} Active Listings
        </div>
        <div style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 'bold', background: '#fffdf0', padding: '5px 12px', borderRadius: '15px' }}>
          🛡️ Verified Student Sellers
        </div>
      </div>
    </div>

    {/* category filters that show everything in the DB */}
    <div className="tabs">
      <button
        onClick={() => setCategory("All")}
        className={category === "All" ? "activeTab" : ""}
      >
        All
      </button>
      
      {allCategories.map((catName) => (
        <button
          key={catName}
          onClick={() => setCategory(catName)}
          className={category === catName ? "activeTab" : ""}
        >
          {catName}
        </button>
      ))}
    </div>

    {/* SEARCH */}
    <div className="searchBox">
      <input
        placeholder="Search listings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* the items grid*/}
    <div className="gridItems">
      {filtered.map((item) => (
        <div key={item.id} className="card">
          {/*Click trigger for the image */}
          <img 
            src={item.image} 
            onClick={() => onViewListing(item)} 
            style={{ cursor: 'pointer' }}
            alt={item.title}
          />
          
          {/* Click trigger for the title */}
          <h3 
            onClick={() => onViewListing(item)} 
            style={{ cursor: 'pointer', color: '#0b1f3a' }}
          >
            {item.title}
          </h3>
          
          <p>R{item.price}</p>

          <button onClick={() => addToBasket(item)}>
            Add
          </button>
        </div>
      ))}
    </div>

    {/* 🛒 BASKET BUTTON */}
    <div className="basketBtn">
      <button onClick={() => setShowBasket(true)}>
        🛒 ({basket.reduce((s, i) => s + i.quantity, 0)})
      </button>
    </div>

    {/* BASKET OVERLAY */}
    {showBasket && (
      <div className="basket">
        <button onClick={() => setShowBasket(false)}>Close</button>
        {basket.map((i) => (
          <div key={i.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee' }}>
            {i.title} x{i.quantity}
            <button onClick={() => addToBasket(i)}>+</button>
            <button onClick={() => removeFromBasket(i)}>-</button>
          </div>
        ))}
        <h3>Total: R{total}</h3>
        <button onClick={handleCheckout}>Checkout</button>
      </div>
    )}
  </div>
);
}