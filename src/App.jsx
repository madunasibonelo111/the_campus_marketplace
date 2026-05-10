import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";

import { useState, useEffect } from "react";

import { supabase } from "@/supabase/supabaseClient";

// AUTH
import ForgotPassword from "./components/Auth/ForgotPassword";
import ResetPassword from "./components/Auth/ResetPassword";
import EmailConfirmed from "./components/Auth/EmailConfirmed";

// PAGES
import Home from "./pages/Home/Home";
import AuthContainer from "./pages/Auth/AuthContainer";
import Basket from "./pages/Browse/Basket";
import Messaging from "./pages/Messaging/Messaging";
import PaymentForm from "./pages/Payments/PaymentForm";
import TransactionHistory from "./pages/Profile/TransactionHistory";
import CreateListing from "./pages/Posting/create_listing";

// REVIEWS
import Reviews from "./pages/Profile/Reviews";
import SellerProfileReviews from "./pages/Profile/SellerProfileReviews";

// TRADE OFFERS
import TradeOffers from "./pages/Profile/TradeOffers";

import "./App.css";

function ItemDetailView({
  selectedItem,
  setSelectedItem,
  currentUser,
}) {
  const navigate = useNavigate();

  const handleDeleteListing =
    async (listingId) => {
      if (
        !window.confirm(
          "Are you sure you want to remove this listing?"
        )
      ) {
        return;
      }

      try {
        const { error } =
          await supabase
            .from("listings")
            .delete()
            .eq("id", listingId);

        if (error) throw error;

        alert("Listing removed.");

        setSelectedItem(null);

        window.location.reload();
      } catch (err) {
        alert(
          "Error: " +
            err.message
        );
      }
    };

  return (
    <div className="detail-overlay">
      <div className="detail-card">
        <div className="detail-header-nav">
          <button
            onClick={() =>
              setSelectedItem(null)
            }
            className="back-btn-pill"
          >
            <span>←</span>
            Back to Shop
          </button>

          <div className="category-chip">
            {selectedItem.categories
              ?.name ||
              "Campus Item"}
          </div>
        </div>

        <div className="detail-grid">

          {/* IMAGE */}
          <div className="detail-visuals">
            <div className="image-container-main">
              <img
                src={
                  selectedItem.image
                }
                alt={
                  selectedItem.title
                }
              />

              <div className="status-tag">
                {selectedItem.condition?.toUpperCase() ||
                  "GOOD"}
              </div>
            </div>
          </div>

          {/* INFO */}
          <div className="detail-specs">
            <div className="specs-top">
              <h1 className="item-title-hero">
                {
                  selectedItem.title
                }
              </h1>

              <div className="price-badge-hero">
                {selectedItem.listing_type ===
                "trade"
                  ? "🤝 Trade Only"
                  : `R${parseFloat(
                      selectedItem.price ||
                        0
                    ).toFixed(2)}`}
              </div>
            </div>

            <div className="specs-body">

              {/* DESCRIPTION */}
              <div className="description-well">
                <p>
                  {selectedItem.description ||
                    "No description provided."}
                </p>
              </div>

              {/* PERKS */}
              <div className="perks-grid">

                {/* SELLER */}
                <div className="perk-item">
                  <div className="perk-icon">
                    👤
                  </div>

                  <div className="perk-text">
                    <small>
                      Seller
                    </small>

                    <span
                      onClick={() =>
                        navigate(
                          `/seller/${selectedItem.user_id}/reviews`
                        )
                      }
                      style={{
                        cursor:
                          "pointer",
                        color:
                          "#f39c12",
                        fontWeight:
                          "bold",
                      }}
                    >
                      {selectedItem
                        .profiles
                        ?.name ||
                        "Verified Student"}
                    </span>
                  </div>
                </div>

                {/* LOCATION */}
                <div className="perk-item">
                  <div className="perk-icon">
                    📍
                  </div>

                  <div className="perk-text">
                    <small>
                      Meeting Spot
                    </small>

                    <span>
                      On-Campus
                      (Safe Zone)
                    </span>
                  </div>
                </div>

                {/* SAFETY */}
                <div className="perk-item">
                  <div className="perk-icon">
                    🛡️
                  </div>

                  <div className="perk-text">
                    <small>
                      Safety
                    </small>

                    <span>
                      Verified
                      listing
                    </span>
                  </div>
                </div>

                {/* DEAL TYPE */}
                <div className="perk-item">
                  <div className="perk-icon">
                    📦
                  </div>

                  <div className="perk-text">
                    <small>
                      Deal Type
                    </small>

                    <span>
                      {selectedItem.listing_type ===
                      "either"
                        ? "Sale or Trade"
                        : selectedItem.listing_type}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* FOOTER BUTTON */}
            <div className="specs-footer">
              {currentUser?.id &&
              String(
                selectedItem.user_id
              ) ===
                String(
                  currentUser.id
                ) ? (
                <button
                  className="btn-action-delete"
                  onClick={() =>
                    handleDeleteListing(
                      selectedItem.id
                    )
                  }
                >
                  🗑️ Remove My
                  Listing
                </button>
              ) : (
                <button
                  className="btn-action-contact"
                  onClick={() =>
                    navigate(
                      `/messages?listingId=${selectedItem.id}`
                    )
                  }
                >
                  💬 Contact{" "}
                  {selectedItem
                    .profiles
                    ?.name ||
                    "Seller"}
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
  const [
    selectedItem,
    setSelectedItem,
  ] = useState(null);

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const getSession =
      async () => {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        setCurrentUser(user);

        setLoading(false);
      };

    getSession();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          setCurrentUser(
            session?.user ??
              null
          );

          setLoading(false);
        }
      );

    return () =>
      authListener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* AUTH */}
        <Route
          path="/auth"
          element={
            <AuthContainer />
          }
        />

        <Route
          path="/forgot-password"
          element={
            <ForgotPassword />
          }
        />

        <Route
          path="/reset-password"
          element={
            <ResetPassword />
          }
        />

        <Route
          path="/email-confirmed"
          element={
            <EmailConfirmed />
          }
        />

        {/* PAYMENT */}
        <Route
          path="/payment"
          element={
            <PaymentForm />
          }
        />

        {/* HISTORY */}
        <Route
          path="/history"
          element={
            <TransactionHistory />
          }
        />

        {/* REVIEW SUBMISSION PAGE */}
        <Route
          path="/reviews/:sellerId"
          element={
            currentUser ? (
              <Reviews />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        {/* VIEW SELLER REVIEWS */}
        <Route
          path="/seller/:sellerId/reviews"
          element={
            <SellerProfileReviews />
          }
        />

        {/* BASKET */}
        <Route
          path="/basket"
          element={
            currentUser ? (
              selectedItem ? (
                <ItemDetailView
                  selectedItem={
                    selectedItem
                  }
                  setSelectedItem={
                    setSelectedItem
                  }
                  currentUser={
                    currentUser
                  }
                />
              ) : (
                <Basket
                  onViewListing={(
                    item
                  ) =>
                    setSelectedItem(
                      item
                    )
                  }
                />
              )
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        {/* SELL */}
        <Route
          path="/sell"
          element={
            currentUser ? (
              <CreateListing />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        {/* MESSAGES */}
        <Route
          path="/messages"
          element={
            currentUser ? (
              <Messaging />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        {/* TRADE OFFERS */}
        <Route
          path="/tradeoffers"
          element={
            currentUser ? (
              <TradeOffers
                currentUser={
                  currentUser
                }
              />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;