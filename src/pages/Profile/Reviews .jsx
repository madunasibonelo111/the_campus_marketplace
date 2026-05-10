import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";

export default function SellerReviewsPage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we are here to leave a review
  const queryParams = new URLSearchParams(location.search);
  const isRatingAction = queryParams.get("action") === "rate";

  // Data State
  const [reviews, setReviews] = useState([]);
  const [sellerName, setSellerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Review Form State
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user);

      await fetchSellerAndReviews();

      setLoading(false);
    };

    initPage();
  }, [sellerId]);

  const fetchSellerAndReviews = async () => {
    try {
      // Fetch seller profile
      const { data: sellerProfile, error: sellerError } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", sellerId)
        .single();

      if (sellerError) throw sellerError;

      if (sellerProfile) {
        setSellerName(sellerProfile.name);
      }

      // Fetch ratings
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("reviewee_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (err) {
      console.error("Error fetching reviews:", err.message);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      alert("Please select a star rating");
      return;
    }

    if (!currentUser) {
      navigate("/auth");
      return;
    }

    setSubmitting(true);

    try {
      // Prevent duplicate review
      const { data: existingReview } = await supabase
        .from("ratings")
        .select("id")
        .eq("reviewer_id", currentUser.id)
        .eq("reviewee_id", sellerId)
        .maybeSingle();

      if (existingReview) {
        alert("You have already reviewed this seller.");
        navigate(`/reviews/${sellerId}`);
        return;
      }

      // Insert rating
      const { error } = await supabase.from("ratings").insert([
        {
          reviewer_id: currentUser.id,
          reviewee_id: sellerId,
          score: rating,
          comment: comment.trim(),
        },
      ]);

      if (error) throw error;

      alert("Review submitted!");

      // Reset form
      setRating(0);
      setComment("");

      // Refresh reviews instantly
      await fetchSellerAndReviews();

      // Return to normal view mode
      navigate(`/reviews/${sellerId}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Average Rating
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, r) => sum + Number(r.score || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";

  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        ← Back
      </button>

      {/* Seller Header */}
      <div style={styles.card}>
        <h1>{sellerName || "Seller"} Reviews</h1>

        <div style={styles.statsRow}>
          <div style={styles.avgScore}>{averageRating}★</div>

          <div>
            <div style={{ fontWeight: "bold" }}>
              {reviews.length} Total Reviews
            </div>

            <div style={{ color: "#666" }}>
              Verified marketplace feedback
            </div>
          </div>
        </div>

        {/* Leave Review Button */}
        {!isRatingAction && currentUser && (
          <button
            style={styles.leaveReviewBtn}
            onClick={() =>
              navigate(`/reviews/${sellerId}?action=rate`)
            }
          >
            Leave a Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {isRatingAction && (
        <div
          style={{
            ...styles.card,
            border: "2px solid #f39c12",
          }}
        >
          <h3>Leave a Review</h3>

          <div style={{ marginBottom: "15px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => setRating(star)}
                style={{
                  ...styles.star,
                  color: star <= rating ? "#f39c12" : "#ccc",
                }}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            style={styles.textarea}
            placeholder="Describe your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />

          <button
            onClick={handleSubmitReview}
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              background: submitting ? "#ccc" : "#f39c12",
            }}
          >
            {submitting ? "Submitting..." : "Post Review"}
          </button>
        </div>
      )}

      {/* Reviews List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {reviews.length === 0 ? (
          <div style={{ ...styles.card, textAlign: "center" }}>
            No reviews yet.
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    color: "#f39c12",
                    fontSize: "20px",
                  }}
                >
                  {"★".repeat(r.score)}
                </div>

                <div
                  style={{
                    color: "#888",
                    fontSize: "12px",
                  }}
                >
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>

              <p
                style={{
                  marginTop: "10px",
                  lineHeight: "1.5",
                }}
              >
                {r.comment || "No comment provided."}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #ddd",
    marginBottom: "20px",
  },

  backBtn: {
    marginBottom: "20px",
    border: "none",
    background: "#eee",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  avgScore: {
    fontSize: "42px",
    fontWeight: "bold",
    color: "#f39c12",
  },

  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginTop: "10px",
  },

  leaveReviewBtn: {
    marginTop: "20px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#f39c12",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  star: {
    fontSize: "32px",
    cursor: "pointer",
    marginRight: "5px",
  },

  textarea: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },

  submitBtn: {
    marginTop: "15px",
    width: "100%",
    padding: "12px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};