import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Basket({ onSelectListing }) {
  const [items, setItems] = useState([]);
  const [basket, setBasket] = useState([]);

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("All");

  const [search, setSearch] = useState("");
  const [showBasket, setShowBasket] = useState(false);

  // ✅ FETCH CATEGORIES FROM DATABASE
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name");

    if (error) {
      console.error("❌ Error fetching categories:", error);
      return;
    }

    // Add "All" manually at the front
    setCategories([{ id: "all", name: "All" }, ...(data || [])]);
  };

  // FETCH LISTINGS
  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        title,
        price,
        category_id,
        categories (
          name
        ),
        listing_images (
          image_url,
          display_order
        )
      `);

    if (error) {
      console.error("❌ Error fetching listings:", error);
      return;
    }

    const formatted = (data || []).map((item) => {
      const sorted = item.listing_images?.sort(
        (a, b) => a.display_order - b.display_order
      );

      return {
        ...item,
        image: sorted?.[0]?.image_url || "https://via.placeholder.com/300",
        listing_images: sorted || [],
      };
    });

    setItems(formatted);
  };

  useEffect(() => {
    fetchCategories();
    fetchListings();
  }, []);

  // ADD TO BASKET
  const addToBasket = (item) => {
    setBasket((prev) => {
      const exists = prev.find((i) => i.id === item.id);

      if (exists) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // REMOVE FROM BASKET
  const removeFromBasket = (item) => {
    setBasket((prev) => {
      const exists = prev.find((i) => i.id === item.id);

      if (!exists) return prev;

      if (exists.quantity > 1) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity - 1 }
            : i
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
    alert("✅ Order placed successfully!");
    setBasket([]);
    setShowBasket(false);
  };

  // FILTER
  const filtered = items.filter((i) => {
    const matchCategory =
      category === "All" ||
      i.categories?.name === category;

    const matchSearch = (i.title || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchCategory && matchSearch;
  });

  return (
    <div>

      {/* CATEGORY FILTER (FROM DATABASE) */}
      <div className="tabs">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.name)}
            className={category === c.name ? "activeTab" : ""}
          >
            {c.name}
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

      {/* LISTINGS */}
      <div className="gridItems">

        {filtered.length === 0 ? (
          <p>No products available</p>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectListing?.(item.id)}
            >
              <img src={item.image} alt={item.title} />
              <h3>{item.title}</h3>
              <p>R{item.price}</p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToBasket(item);
                }}
              >
                Add
              </button>
            </div>
          ))
        )}

      </div>

      {/* BASKET BUTTON */}
      <div className="basketBtn">
        <button onClick={() => setShowBasket(true)}>
          🛒 ({basket.reduce((s, i) => s + i.quantity, 0)})
        </button>
      </div>

      {/* BASKET PANEL */}
      {showBasket && (
        <div className="basket">
          <button onClick={() => setShowBasket(false)}>
            Close
          </button>

          {basket.length === 0 && <p>Basket is empty</p>}

          {basket.map((i) => (
            <div key={i.id}>
              {i.title} x{i.quantity}
              <button onClick={() => addToBasket(i)}>+</button>
              <button onClick={() => removeFromBasket(i)}>-</button>
            </div>
          ))}

          <h3>Total: R{total}</h3>

          <button onClick={handleCheckout}>
            Checkout
          </button>
        </div>
      )}

    </div>
  );
}
      {showPopup && <div className="popup">Item added to basket ✅</div>}
    </div>
  );
}
