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

    if (!currentUser?.id) return;

    setLoading(true);

    const { data, error } =
      await supabase
        .from("trade_offers")
        .select(`
          *,
          
          sender:profiles!trade_offers_sender_id_fkey (
            id,
            name
          ),

          receiver:profiles!trade_offers_receiver_id_fkey (
            id,
            name
          ),

          requested_listing:listings!trade_offers_requested_listing_id_fkey (
            id,
            title,
            price,
            condition,

            listing_images (
              image_url
            )
          )
        `)
        .or(
          `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {

      console.log(error);

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
        })
        .eq("id", tradeId);

    if (error) {

      alert(error.message);

      return;
    }

    // ACCEPTED TRADE LOGIC

    if (status === "accepted") {

      const trade =
        tradeOffers.find(
          (t) => t.id === tradeId
        );

      if (trade) {

        // CREATE TRANSACTION

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

        // MARK LISTING AS TRADED

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
            trade offers will appear
            here.
          </p>

        </div>

      ) : (

        <div className="trade-offers-grid">

          {tradeOffers.map((trade) => {

            const isReceiver =
              currentUser?.id ===
              trade.receiver_id;

            const isSender =
              currentUser?.id ===
              trade.sender_id;

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

                {/* STATUS */}

                <div className="trade-status-row">

                  <div
                    className={`trade-status ${trade.status}`}
                  >
                    {trade.status?.toUpperCase()}
                  </div>

                </div>

                {/* USERS */}

                <div className="trade-users">

                  {isReceiver ? (

                    <p>

                      <strong>
                        {trade.sender?.name ||
                          "Someone"}
                      </strong>{" "}

                      wants to trade with
                      you

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

                {/* ITEMS */}

                <div className="trade-items-wrapper">

                  {/* OFFERED ITEM */}

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

                    <span className="trade-condition">
                      {
                        trade.offered_item_condition
                      }
                    </span>

                  </div>

                  {/* ARROW */}

                  <div className="trade-arrow">
                    ⇄
                  </div>

                  {/* REQUESTED ITEM */}

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
                        trade.requested_listing
                          ?.title
                      }
                    </h3>

                    <p>
                      Condition:{" "}
                      {
                        trade.requested_listing
                          ?.condition
                      }
                    </p>

                    <p>
                      Price: R
                      {
                        trade.requested_listing
                          ?.price
                      }
                    </p>

                  </div>

                </div>

                {/* ACTIONS */}

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
                    "pending" &&
                    isSender && (

                      <div className="waiting-status">

                        Waiting for seller
                        response...

                      </div>
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
          })}

        </div>
      )}

    </div>
  );
}