import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";

export default function SellerProfileReviews() {
  const { sellerId } = useParams();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [sellerName, setSellerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewers, setReviewers] = useState({});

  useEffect(() => {
    fetchSellerReviews();
  }, [sellerId]);

  async function fetchSellerReviews() {
    try {
      setLoading(true);

      // Fetch seller profile from profiles table
      const { data: seller, error: sellerError } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", sellerId)
        .single();

      if (sellerError) {
        console.error("Seller fetch error:", sellerError);
      } else {
        setSellerName(seller?.name || "Seller");
      }

      // Fetch ratings from ratings table (NOT reviews table)
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("reviewee_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Ratings fetch error:", error);
        throw error;
      }

      console.log("Fetched ratings:", data); // Debug log
      setReviews(data || []);

      // Fetch reviewer names for each rating
      if (data && data.length > 0) {
        const reviewerIds = [...new Set(data.map(r => r.reviewer_id).filter(id => id))];
        
        if (reviewerIds.length > 0) {
          const { data: reviewerProfiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", reviewerIds);
          
          const reviewersMap = {};
          reviewerProfiles?.forEach(profile => {
            reviewersMap[profile.id] = profile.name;
          });
          setReviewers(reviewersMap);
        }
      }

    } catch (err) {
      console.error("Error fetching reviews:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate average rating using score column
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.score || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading reviews...
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
      <button
        onClick={() => navigate(-1)}
        style={styles.backBtn}
      >
        ← Back
      </button>

      <div style={styles.card}>
        <h1>{sellerName} Reviews</h1>

        <div style={styles.statsRow}>
          <div style={styles.avgScore}>
            {averageRating}★
          </div>

          <div>
            <div style={{ fontWeight: "bold" }}>
              {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
            </div>

            <div style={{ color: "#666" }}>
              Verified student feedback
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {reviews.length === 0 ? (
          <div style={{ ...styles.card, textAlign: "center" }}>
            <p>No reviews yet</p>
            <p style={{ color: "#666", fontSize: "14px" }}>
              This seller hasn't received any reviews.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div>
                  {/* Display stars based on score */}
                  <div style={{ color: "#f39c12", fontSize: "20px" }}>
                    {"★".repeat(review.score)}
                    {"☆".repeat(5 - review.score)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "5px" }}>
                    By: {reviewers[review.reviewer_id] || "Anonymous"}
                  </div>
                </div>

                <div style={{ color: "#888", fontSize: "12px" }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>

              <p style={{ marginTop: "10px", lineHeight: "1.5", color: "#333" }}>
                {review.comment || "No comment provided."}
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
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },

  backBtn: {
    marginBottom: "20px",
    border: "none",
    background: "#eee",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
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
};