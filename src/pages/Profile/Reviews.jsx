import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./Reviews.css";

export default function Reviews() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sellerId: urlSellerId } = useParams();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, user_id, name");

      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("reviewee_id, score, comment");

      if (!profilesData) return;

      const ratingsMap = {};
      (ratingsData || []).forEach(r => {
        if (!ratingsMap[r.reviewee_id]) {
          ratingsMap[r.reviewee_id] = [];
        }
        ratingsMap[r.reviewee_id].push(r);
      });

      const merged = profilesData.map(profile => {
        const userRatings = ratingsMap[profile.user_id] || [];
        const scores = userRatings.map(r => r.score);
        const avgRating = scores.length
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : null;

        return {
          ...profile,
          avgRating,
          reviewCount: scores.length,
          latestComment: userRatings[userRatings.length - 1]?.comment || null
        };
      });

      setProfiles(merged);
    } catch (err) {
      console.error("Error fetching ratings:", err);
    } finally {
      setLoading(false);
    } 
  };

  const submitRating = async (clickedId) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to leave a review.");
      return;
    }

    const targetId = urlSellerId || clickedId;

    if (user.id === targetId) {
      alert("You cannot rate your own listing! Please test with a transaction from a different seller.");
      return;
    }

    const scoreInput = prompt("Enter rating (1-5):");
    const comment = prompt("Enter a comment:");
    
    const queryParams = new URLSearchParams(location.search);
    const transactionId = queryParams.get('tid')?.toString();

    const score = parseInt(scoreInput);
    if (isNaN(score) || score < 1 || score > 5) {
      alert("Please enter a valid rating between 1 and 5.");
      return;
    }

    if (!targetId || !transactionId || !user.id) {
      alert("Error: Missing transaction or user data. Please try again from the History page.");
      return;
    }

    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          reviewee_id: targetId,
          reviewer_id: user.id,
          score: score,
          comment: comment,
          transaction_id: transactionId
        });

      if (error) throw error;
      
      alert("Rating submitted!");
      fetchData(); 
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  if (loading) return <div className="reviews-loading">Loading testimonials...</div>;

  return (
    <div className="reviews-page">
      <div className="reviews-header-section">
        
        <button onClick={() => navigate('/basket')} className="back-to-shop-btn">
          ← Back to Shop
        </button>
        <p className="testimonials-label">TESTIMONIALS</p>
        <h1 className="reviews-main-title">What Our <span>Students</span> Have to Say</h1>
      </div>

      <div className="reviews-grid">
        {profiles.map(profile => (
          <div 
            key={profile.id} 
            className="review-card-modern"
            onClick={() => submitRating(profile.user_id)}
          >
            <div className="card-stars">
              {"⭐".repeat(Math.round(profile.avgRating || 0)) || "⭐"}
              <span className="avg-num">{profile.avgRating || "0.0"}</span>
            </div>

            <h3 className="review-title">
              {profile.avgRating >= 4 ? "Highly Recommended!" : "Campus Seller"}
            </h3>

            <p className="review-text-body">
              {profile.latestComment ? `"${profile.latestComment}"` : "No specific feedback left for this student yet."}
            </p>

            <div className="reviewer-info">
              <div className="reviewer-avatar">
                {profile.name?.charAt(0) || "S"}
              </div>
              <div className="reviewer-details">
                <span className="reviewer-name">{profile.name || "Verified Student"}</span>
                <span className="reviewer-status">Satisfied Peer • {profile.reviewCount} reviews</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}