import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import "./Reviews.css";

export default function Reviews() {
  const [profiles, setProfiles] = useState([]);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // get all users (profiles)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name");

    //  get all ratings
    const { data: ratingsData } = await supabase
      .from("ratings")
      .select("reviewee_id, score, comment");

    if (!profilesData) return;

    //  group ratings by user
    const ratingsMap = {};
    (ratingsData || []).forEach(r => {
      if (!ratingsMap[r.reviewee_id]) {
        ratingsMap[r.reviewee_id] = [];
      }
      ratingsMap[r.reviewee_id].push(r);
    });

    //  merge into profiles
    const merged = profilesData.map(profile => {
      const userRatings = ratingsMap[profile.id] || [];

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
  };

  return (
    <div className="reviews-page">
      <h1>Seller Reviews</h1>

      <div className="reviews-grid">
        {profiles.map(user => (
          <div key={user.id} className="review-card">
            
            <h3>{user.name}</h3>

            {user.avgRating ? (
              <>
                <p className="rating">
                  ⭐ {user.avgRating} ({user.reviewCount})
                </p>

                {user.latestComment && (
                  <p className="comment">
                    “{user.latestComment}”
                  </p>
                )}
              </>
            ) : (
              <p className="no-rating">No reviews yet</p>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}