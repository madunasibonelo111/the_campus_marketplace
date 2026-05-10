import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";

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
import Reviews from "./pages/Profile/Reviews";
import SellerProfileReviews from "./pages/Profile/SellerProfileReviews";
import TradeOffers from "./pages/Profile/TradeOffers";

import StaffDashboard from "./pages/Staff/StaffDashboard";
import CollectionManagement from "./pages/Staff/CollectionManagement";
import DropoffManagement from "./pages/Staff/DropoffManagement";

import DropoffBooking from "./pages/Booking/DropoffBooking";

import AdminDashboard from "./pages/Admin/AdminDashboard";
import FacilityConfig from "./pages/Admin/FacilityConfig";

import "./App.css";

function ItemDetailView({
  selectedItem,
  setSelectedItem,
  currentUser,
}) {
  const navigate = useNavigate();

  const [avgRating, setAvgRating] =
    useState("No ratings");

  // Fetch Seller Rating
  useEffect(() => {
    const fetchSellerRating = async () => {
      if (!selectedItem?.user_id) return;

      try {
        const { data, error } =
          await supabase
            .from("ratings")
            .select("score")
            .eq(
              "reviewee_id",
              selectedItem.user_id
            );

        if (error) throw error;

        if (data && data.length > 0) {
          const total = data.reduce(
            (sum, r) =>
              sum + Number(r.score),
            0
          );

          setAvgRating(
            (
              total / data.length
            ).toFixed(1)
          );
        } else {
          setAvgRating("No ratings");
        }
      } catch (err) {
        console.error(
          "Error fetching rating:",
          err
        );

        setAvgRating("No ratings");
      }
    };

    fetchSellerRating();
  }, [selectedItem]);

  const handleDeleteListing =
    async (listingId) => {
      if (
        !window.confirm(
          "Are you sure you want to remove this listing?"
        )
      )
        return;

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
        alert("Error: " + err.message);
      }
    };

  if (!selectedItem) return null;

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
              ?.name || "Campus Item"}
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-visuals">
            <div className="image-container-main">
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
              />

              <div className="status-tag">
                {selectedItem.condition?.toUpperCase() ||
                  "GOOD"}
              </div>
            </div>
          </div>

          <div className="detail-specs">
            <div className="specs-top">
              <h1 className="item-title-hero">
                {selectedItem.title}
              </h1>

              <div className="price-badge-hero">
                {selectedItem.listing_type ===
                "trade"
                  ? "🤝 Trade Only"
                  : `R${parseFloat(
                      selectedItem.price || 0
                    ).toFixed(2)}`}
              </div>
            </div>

            <div className="specs-body">
              <div className="description-well">
                <p>
                  {selectedItem.description ||
                    "No description provided."}
                </p>
              </div>

              <div className="perks-grid">
                <div className="perk-item">
                  <div className="perk-icon">
                    👤
                  </div>

                  <div className="perk-text">
                    <small>Seller</small>

                    <span
                      onClick={() =>
                        navigate(
                          `/seller/${selectedItem.user_id}/reviews`
                        )
                      }
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        color: "#f39c12",
                        fontWeight: "bold",
                      }}
                      title="View seller reviews"
                    >
                      {selectedItem.profiles
                        ?.name ||
                        "Verified Student"}

                      <b
                        style={{
                          color: "#f39c12",
                          marginLeft: "10px",
                        }}
                      >
                        ⭐ {avgRating}
                      </b>
                    </span>
                  </div>
                </div>

                <div className="perk-item">
                  <div className="perk-icon">
                    📍
                  </div>

                  <div className="perk-text">
                    <small>
                      Meeting Spot
                    </small>

                    <span>
                      On-Campus (Safe Zone)
                    </span>
                  </div>
                </div>

                <div className="perk-item">
                  <div className="perk-icon">
                    📦
                  </div>

                  <div className="perk-text">
                    <small>Deal Type</small>

                    <span>
                      {
                        selectedItem.listing_type
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="specs-footer">
              {currentUser?.id &&
              String(
                selectedItem.user_id
              ) ===
                String(currentUser.id) ? (
                <button
                  className="btn-action-delete"
                  onClick={() =>
                    handleDeleteListing(
                      selectedItem.id
                    )
                  }
                >
                  🗑️ Remove My Listing
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
                  {selectedItem.profiles
                    ?.name || "Seller"}
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
  const [selectedItem, setSelectedItem] =
    useState(null);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user);

      setLoading(false);
    };

    getSession();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setCurrentUser(
            session?.user ?? null
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
        {/* PUBLIC ROUTES */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/auth"
          element={<AuthContainer />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/email-confirmed"
          element={<EmailConfirmed />}
        />

        {/* PROTECTED ROUTES */}

        <Route
          path="/payment"
          element={
            currentUser ? (
              <PaymentForm />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        <Route
          path="/history"
          element={
            currentUser ? (
              <TransactionHistory />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
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

        {/* VIEW SELLER REVIEWS PAGE */}
        <Route
          path="/seller/:sellerId/reviews"
          element={<SellerProfileReviews />}
        />

        {/* STAFF ROUTES */}

        <Route
          path="/staff"
          element={
            currentUser ? (
              <StaffDashboard />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        <Route
          path="/staff/collections"
          element={
            currentUser ? (
              <CollectionManagement />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        <Route
          path="/staff/dropoffs"
          element={
            currentUser ? (
              <DropoffManagement />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        <Route
          path="/booking/dropoff"
          element={
            currentUser ? (
              <DropoffBooking />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
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
                  onViewListing={(item) =>
                    setSelectedItem(item)
                  }
                  currentUser={currentUser}
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

        {/* OTHER PROTECTED ROUTES */}

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
              <TradeOffers currentUser={currentUser} />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        {/* ADMIN ROUTES */}

        <Route
          path="/admin-dashboard"
          element={
            currentUser ? (
              <AdminDashboard />
            ) : (
              <Navigate
                to="/auth"
                replace
              />
            )
          }
        />

        <Route
          path="/admin"
          element={
            <Navigate
              to="/admin-dashboard"
              replace
            />
          }
        />

        <Route
          path="/admin/facility-config"
          element={
            currentUser ? (
              <FacilityConfig />
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