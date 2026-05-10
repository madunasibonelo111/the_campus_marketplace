import { useEffect, useState } from "react";

import { supabase } from "@/supabase/supabaseClient";

import "./TradeOffers.css";

export default function TradeOffers({
  currentUser,
}) {

  const [tradeOffers, setTradeOffers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    if (currentUser?.id) {
      fetchTradeOffers();
    }

  }, [currentUser]);

  async function fetchTradeOffers() {

    setLoading(true);

    const { data, error } =
      await supabase
        .from("trade_offers")
        .select(`
          *,
          
          sender:profiles!sender_id (
            id,
            name
          ),

          receiver:profiles!receiver_id (
            id,
            name
          ),

          requested_listing:listings!requested_listing_id (
            id,
            title,
            price,
            condition,

            listing_images (
              image_url
            )
          )
        `)
        .or(`
          sender_id.eq.${currentUser.id},
          receiver_id.eq.${currentUser.id}
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {

      console.error(error);

      alert(error.message);

    } else {

      setTradeOffers(data || []);
    }

    setLoading(false);
  }

  async function updateTradeStatus(
    tradeId,
    status
  ) {

    const { error } =
      await supabase
        .from("trade_offers")
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", tradeId);

    if (error) {

      alert(error.message);

      return;
    }

    if (status === "accepted") {

      const trade =
        tradeOffers.find(
          (t) => t.id === tradeId
        );

      if (trade) {

        await supabase
          .from("transactions")
          .insert({
            buyer_id:
              trade.sender_id,

            seller_id:
              trade.receiver_id,

            listing_id:
              trade.requested_listing_id,

            type: "trade",

            status: "completed",

            created_at:
              new Date().toISOString(),

            completed_at:
              new Date().toISOString(),
          });

        await supabase
          .from("listings")
          .update({
            status: "traded",
          })
          .eq(
            "id",
            trade.requested_listing_id
          );
      }
    }

    fetchTradeOffers();
  }

  if (loading) {

    return (

      <div className="trade-offers-page">

        <h2>
          Trade Offers
        </h2>

        <p>
          Loading trade offers...
        </p>

      </div>
    );
  }

  return (

    <div className="trade-offers-page">

      <div className="trade-offers-header">

        <h2>
          Trade Offers
        </h2>

      </div>

      {tradeOffers.length === 0 ? (

        <div className="empty-trades">

          <h3>
            No trade offers yet
          </h3>

          <p>
            Your incoming and outgoing
            trade requests will appear
            here.
          </p>

        </div>

      ) : (

        <div className="trade-offers-grid">

          {tradeOffers.map(
            (trade) => {

              const isReceiver =
                currentUser?.id ===
                trade.receiver_id;

              const requestedImage =
                trade.requested_listing
                  ?.listing_images?.[0]
                  ?.image_url ||
                "https://via.placeholder.com/300";

              const offeredImage =
                trade.offered_item_images?.[0] ||
                "https://via.placeholder.com/300";

              return (

                <div
                  key={trade.id}
                  className="trade-offer-card"
                >

                  <div className="trade-status-row">

                    <div
                      className={`trade-status ${trade.status}`}
                    >
                      {trade.status?.toUpperCase()}
                    </div>

                  </div>

                  <div className="trade-users">

                    {isReceiver ? (

                      <p>

                        <strong>
                          {trade.sender?.name ||
                            "Someone"}
                        </strong>{" "}

                        wants to trade with you

                      </p>

                    ) : (

                      <p>

                        Trade offer sent to{" "}

                        <strong>
                          {trade.receiver?.name ||
                            "Seller"}
                        </strong>

                      </p>
                    )}

                  </div>

                  <div className="trade-items-wrapper">

                    {/* OFFERED */}

                    <div className="trade-side">

                      <h4>
                        Offered Item
                      </h4>

                      <img
                        src={offeredImage}
                        alt=""
                        className="trade-item-image"
                      />

                      <h3>
                        {
                          trade.offered_item_title
                        }
                      </h3>

                      <p>
                        {
                          trade.offered_item_description
                        }
                      </p>

                    </div>

                    <div className="trade-arrow">
                      ⇄
                    </div>

                    {/* REQUESTED */}

                    <div className="trade-side">

                      <h4>
                        Requested Item
                      </h4>

                      <img
                        src={requestedImage}
                        alt=""
                        className="trade-item-image"
                      />

                      <h3>
                        {
                          trade
                            .requested_listing
                            ?.title
                        }
                      </h3>

                      <p>

                        Condition:{" "}

                        {
                          trade
                            .requested_listing
                            ?.condition
                        }

                      </p>

                    </div>

                  </div>

                  <div className="trade-actions">

                    {trade.status ===
                      "pending" &&
                      isReceiver && (

                        <>

                          <button
                            className="accept-btn"
                            onClick={() =>
                              updateTradeStatus(
                                trade.id,
                                "accepted"
                              )
                            }
                          >
                            Accept
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() =>
                              updateTradeStatus(
                                trade.id,
                                "rejected"
                              )
                            }
                          >
                            Decline
                          </button>

                        </>
                      )}

                    {trade.status ===
                      "accepted" && (

                        <div className="accepted-text">
                          ✅ Trade Accepted
                        </div>
                      )}

                    {trade.status ===
                      "rejected" && (

                        <div className="rejected-text">
                          ❌ Trade Declined
                        </div>
                      )}

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}