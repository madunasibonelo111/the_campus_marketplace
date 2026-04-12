import React, { useState } from "react";
import "./Basket.css";

export default function Basket() {
  const [basket, setBasket] = useState([]);
  const [showBasket, setShowBasket] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showPopup, setShowPopup] = useState(false);

  const categories = ["All", "Clothing", "Stationery", "Electronics", "Sports"];

  const [items] = useState([
    { id: 1, title: "Wits Hoodie", price: 400, category: "Clothing" },
    { id: 2, title: "Jeans", price: 600, category: "Clothing" },
    { id: 3, title: "Notebook", price: 100, category: "Stationery" },
    { id: 4, title: "Calculator", price: 250, category: "Stationery" },
    { id: 5, title: "Laptop", price: 8000, category: "Electronics" },
    { id: 6, title: "Headphones", price: 300, category: "Electronics" },
    { id: 7, title: "Soccer Ball", price: 250, category: "Sports" }
  ]);

  // FILTER
  let filteredItems = items.filter((item) => {
    return (
      item.title.toLowerCase().includes(search.toLowerCase()) &&
      (selectedCategory === "All" || item.category === selectedCategory)
    );
  });

  // SORT
  if (sortOrder === "low") {
    filteredItems.sort((a, b) => a.price - b.price);
  } else if (sortOrder === "high") {
    filteredItems.sort((a, b) => b.price - a.price);
  }

  // ADD
  const addToBasket = (item) => {
    const existing = basket.find((i) => i.id === item.id);

    if (existing) {
      setBasket(
        basket.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setBasket([...basket, { ...item, quantity: 1 }]);
    }

    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000);
  };

  // REMOVE
  const removeFromBasket = (item) => {
    const existing = basket.find((i) => i.id === item.id);
    if (existing.quantity > 1) {
      setBasket(
        basket.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
        )
      );
    } else {
      setBasket(basket.filter((i) => i.id !== item.id));
    }
  };

  return (
    <div className="page">
      {/* MAIN CONTENT */}
      <div className="main">
        <div className="header">
          <img src="/campus-marketplace-logo.png" alt="logo" className="logo" />

          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar"
          />

          <select onChange={(e) => setSortOrder(e.target.value)}>
            <option value="">Sort</option>
            <option value="low">Price: Low → High</option>
            <option value="high">Price: High → Low</option>
          </select>

          <button onClick={() => setShowBasket(!showBasket)} className="basket-btn">
            🛒 {basket.reduce((sum, i) => sum + i.quantity, 0)}
          </button>
        </div>

        <div className="category-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={selectedCategory === cat ? "active" : ""}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="items-grid">
          {filteredItems.length === 0 ? (
            <p className="no-items">No items available 😢</p>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="item-card">
                <div className="image-placeholder"></div>

                <h3>{item.title}</h3>
                <p className="price">R{item.price}</p>

                <button onClick={() => addToBasket(item)}>
                  Add to Basket
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BASKET */}
      {showBasket && (
        <div className="basket-panel">
          <button className="close-btn" onClick={() => setShowBasket(false)}>
            ✖
          </button>

          <h2>My Basket</h2>

          {basket.length === 0 && <p>Basket is empty</p>}

          {basket.map((item) => (
            <div key={item.id} className="basket-item">
              <div>
                {item.title} x{item.quantity}
              </div>

              <div>
                <button onClick={() => addToBasket(item)}>➕</button>
                <button onClick={() => removeFromBasket(item)}>➖</button>
              </div>
            </div>
          ))}

          <h3>
            Total: R
            {basket.reduce(
              (total, item) => total + item.price * item.quantity,
              0
            )}
          </h3>
        </div>
      )}

      {showPopup && <div className="popup">Item added to basket ✅</div>}
    </div>
  );
}