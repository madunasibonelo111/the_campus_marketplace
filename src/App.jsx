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
<<<<<<< HEAD
=======

import CreateListing from "./pages/Posting/create_listing";
>>>>>>> origin/main

// PAGES
import Home from "./pages/Home/Home";
import AuthContainer from "./pages/Auth/AuthContainer";
import Basket from "./pages/Browse/Basket";
import Messaging from "./pages/Messaging/Messaging";

import PaymentForm from "./pages/Payments/PaymentForm";

import TransactionHistory from "./pages/Profile/TransactionHistory";
<<<<<<< HEAD
import CreateListing from "./pages/Posting/create_listing";

// REVIEWS
import Reviews from "./pages/Profile/Reviews";
import SellerProfileReviews from "./pages/Profile/SellerProfileReviews";

// TRADE OFFERS
import TradeOffers from "./pages/Profile/TradeOffers";

=======
import Reviews from "./pages/Profile/Reviews";
import SellerProfileReviews from "./pages/Profile/SellerProfileReviews";
import TradeOffers from "./pages/Profile/TradeOffers";

import StaffDashboard from "./pages/Staff/StaffDashboard";
import CollectionManagement from "./pages/Staff/CollectionManagement";
import DropoffManagement from "./pages/Staff/DropoffManagement";

import DropoffBooking from "./pages/Booking/DropoffBooking";

import AdminDashboard from "./pages/Admin/AdminDashboard";
import FacilityConfig from "./pages/Admin/FacilityConfig";

>>>>>>> origin/main
import "./App.css";

function ItemDetailView({
  selectedItem,
  setSelectedItem,
  currentUser,
}) {
  const navigate = useNavigate();
<<<<<<< HEAD
=======

  const [avgRating, setAvgRating] =
    useState("No ratings");
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main

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
<<<<<<< HEAD
              ?.name ||
              "Campus Item"}
=======
              ?.name || "Campus Item"}
>>>>>>> origin/main
          </div>
        </div>

        <div className="detail-grid">

          {/* IMAGE */}
          <div className="detail-visuals">
            <div className="image-container-main">
              <img
<<<<<<< HEAD
                src={
                  selectedItem.image
                }
                alt={
                  selectedItem.title
                }
=======
                src={selectedItem.image}
                alt={selectedItem.title}
>>>>>>> origin/main
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
<<<<<<< HEAD
                {
                  selectedItem.title
                }
=======
                {selectedItem.title}
>>>>>>> origin/main
              </h1>

              <div className="price-badge-hero">
                {selectedItem.listing_type ===
                "trade"
                  ? "🤝 Trade Only"
                  : `R${parseFloat(
<<<<<<< HEAD
                      selectedItem.price ||
                        0
=======
                      selectedItem.price || 0
>>>>>>> origin/main
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
<<<<<<< HEAD

                {/* SELLER */}
                <div className="perk-item">
                  <div className="perk-icon">
                    👤
                  </div>

                  <div className="perk-text">
                    <small>
                      Seller
                    </small>
=======
                <div className="perk-item">
                  <div className="perk-icon">
                    👤
                  </div>

                  <div className="perk-text">
                    <small>Seller</small>
>>>>>>> origin/main

                    <span
                      onClick={() =>
                        navigate(
                          `/seller/${selectedItem.user_id}/reviews`
                        )
                      }
                      style={{
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
                    </span>
                  </div>
                </div>

                {/* LOCATION */}
                <div className="perk-item">
                  <div className="perk-icon">
                    📍
                  </div>

<<<<<<< HEAD
                  <div className="perk-text">
                    <small>
                      Meeting Spot
                    </small>

                    <span>
                      On-Campus
                      (Safe Zone)
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
                String(
                  currentUser.id
                ) ? (
=======
                String(currentUser.id) ? (
>>>>>>> origin/main
                <button
                  className="btn-action-delete"
                  onClick={() =>
                    handleDeleteListing(
                      selectedItem.id
                    )
                  }
                >
<<<<<<< HEAD
                  🗑️ Remove My
                  Listing
=======
                  🗑️ Remove My Listing
>>>>>>> origin/main
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
<<<<<<< HEAD
                  {selectedItem
                    .profiles
                    ?.name ||
                    "Seller"}
=======
                  {selectedItem.profiles
                    ?.name || "Seller"}
>>>>>>> origin/main
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
<<<<<<< HEAD
  const [
    selectedItem,
    setSelectedItem,
  ] = useState(null);

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);
=======
  const [selectedItem, setSelectedItem] =
    useState(null);

  const [currentUser, setCurrentUser] =
    useState(null);
>>>>>>> origin/main

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
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

<<<<<<< HEAD
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
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
                  onViewListing={(
                    item
                  ) =>
                    setSelectedItem(
                      item
                    )
                  }
=======
                  onViewListing={(item) =>
                    setSelectedItem(item)
                  }
                  currentUser={currentUser}
>>>>>>> origin/main
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

<<<<<<< HEAD
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
=======
        {/* OTHER PROTECTED ROUTES */}
>>>>>>> origin/main

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