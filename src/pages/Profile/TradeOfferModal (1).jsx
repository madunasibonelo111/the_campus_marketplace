// TradeOfferModal.jsx

import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import "./TradeOfferModal.css";

export default function TradeOfferModal({
  open,
  onClose,
  currentUser,
  requestedListing,
}) {

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      condition: "good",
    });

  const [selectedFiles, setSelectedFiles] =
    useState([]);

  useEffect(() => {

    if (!open) {
      resetForm();
    }

  }, [open]);

  function resetForm() {

    setFormData({
      title: "",
      description: "",
      condition: "good",
    });

    setSelectedFiles([]);
  }

  async function handleTradeOffer() {

    // VALIDATION

    if (!currentUser) {
      alert("Please log in first");
      return;
    }

    if (!requestedListing) {
      alert("Invalid trade listing");
      return;
    }

    if (!formData.title.trim()) {
      alert("Please enter your item title");
      return;
    }

    if (!formData.description.trim()) {
      alert("Please enter a description");
      return;
    }

    if (!formData.condition) {
      alert("Please select item condition");
      return;
    }

    if (selectedFiles.length === 0) {
      alert("Please upload at least one image");
      return;
    }

    setLoading(true);

    try {

      /*
        STEP 1:
        Upload Images
      */

      const uploadedImages = [];

      for (const file of selectedFiles) {

        const filePath =
          `trade-offers/${Date.now()}_${file.name}`;

        const { error: uploadError } =
          await supabase.storage
            .from("listing-images")
            .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        uploadedImages.push(publicUrl);
      }

      /*
        STEP 2:
        Create Trade Offer
      */

      const {
        data: tradeOffer,
        error: tradeError,
      } = await supabase
        .from("trade_offers")
        .insert({
          sender_id:
            currentUser.id,

          receiver_id:
            requestedListing.user_id,

          requested_listing_id:
            requestedListing.id,

          offered_item_title:
            formData.title,

          offered_item_description:
            formData.description,

          offered_item_condition:
            formData.condition,

          offered_item_images:
            uploadedImages,

          status: "pending",

          created_at:
            new Date().toISOString(),
        })
        .select()
        .single();

      if (tradeError) {
        throw tradeError;
      }

      /*
        STEP 3:
        Find Existing Conversation
      */

      let {
        data: conversation,
      } = await supabase
        .from("conversations")
        .select("*")
        .eq(
          "listing_id",
          requestedListing.id
        )
        .or(
          `buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`
        )
        .maybeSingle();

      /*
        STEP 4:
        Create Conversation If Missing
      */

      if (!conversation) {

        const {
          data: newConversation,
          error: convoError,
        } = await supabase
          .from("conversations")
          .insert([
            {
              listing_id:
                requestedListing.id,

              buyer_id:
                currentUser.id,

              seller_id:
                requestedListing.user_id,
            },
          ])
          .select()
          .single();

        if (convoError) {
          throw convoError;
        }

        conversation = newConversation;
      }

      /*
        STEP 5:
        Insert Trade Message
      */

      const { error: messageError } =
        await supabase
          .from("messages")
          .insert({
            conversation_id:
              conversation.id,

            sender_id:
              currentUser.id,

            body:
              "Sent a trade offer",

            trade_offer_id:
              tradeOffer.id,

            created_at:
              new Date().toISOString(),
          });

      if (messageError) {
        throw messageError;
      }

      alert(
        "Trade offer sent successfully!"
      );

      onClose();

    } catch (err) {

      console.error(err);

      alert(err.message);

    } finally {

      setLoading(false);

    }
  }

  if (!open) return null;

  return (
    <div className="trade-modal-overlay">

      <div className="trade-modal">

        {/* HEADER */}

        <div className="trade-modal-header">

          <h2>Trade Offer</h2>

          <button
            className="close-modal-btn"
            onClick={onClose}
          >
            ✕
          </button>

        </div>

        {/* REQUESTED ITEM */}

        <div className="requested-item-section">

          <h3>
            I Want To Trade For This
          </h3>

          <div className="requested-item-card">

            <img
              src={
                requestedListing
                  ?.listing_images?.[0]
                  ?.image_url ||
                "https://via.placeholder.com/120"
              }
              alt=""
              className="requested-item-image"
            />

            <div className="requested-item-info">

              <h4>
                {requestedListing.title}
              </h4>

              <p>
                <strong>
                  Description:
                </strong>

                <br />

                {
                  requestedListing.description
                }
              </p>

              <p>
                <strong>
                  Condition:
                </strong>{" "}
                {
                  requestedListing.condition
                }
              </p>

              {requestedListing.price && (
                <p>
                  <strong>
                    Price:
                  </strong>{" "}
                  R
                  {requestedListing.price}
                </p>
              )}

            </div>
          </div>
        </div>

        {/* YOUR TRADE ITEM */}

        <div className="trade-form-section">

          <h3>Your Trade Item</h3>

          {/* TITLE */}

          <div className="trade-input-group">

            <label>
              Item Title
            </label>

            <input
              type="text"
              placeholder="e.g. JBL Speaker"
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,

                  title:
                    e.target.value,
                })
              }
            />

          </div>

          {/* DESCRIPTION */}

          <div className="trade-input-group">

            <label>
              Description
            </label>

            <textarea
              placeholder="Describe your item..."
              value={
                formData.description
              }
              onChange={(e) =>
                setFormData({
                  ...formData,

                  description:
                    e.target.value,
                })
              }
            />

          </div>

          {/* CONDITION */}

          <div className="trade-input-group">

            <label>
              Condition
            </label>

            <select
              value={
                formData.condition
              }
              onChange={(e) =>
                setFormData({
                  ...formData,

                  condition:
                    e.target.value,
                })
              }
            >
              <option value="new">
                New
              </option>

              <option value="like_new">
                Like New
              </option>

              <option value="good">
                Good
              </option>

              <option value="fair">
                Fair
              </option>

              <option value="poor">
                Poor
              </option>
            </select>

          </div>

          {/* IMAGE UPLOAD */}

          <div className="trade-input-group">

            <label>
              Upload Images
            </label>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                setSelectedFiles(
                  Array.from(
                    e.target.files
                  )
                )
              }
            />

          </div>

          {/* IMAGE PREVIEW */}

          {selectedFiles.length > 0 && (

            <div className="trade-image-preview">

              {selectedFiles.map(
                (file, index) => (
                  <img
                    key={index}
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="preview-image"
                  />
                )
              )}

            </div>
          )}

        </div>

        {/* SUBMIT BUTTON */}

        <button
          className="send-trade-btn"
          onClick={handleTradeOffer}
          disabled={loading}
        >
          {loading
            ? "Sending Offer..."
            : "Send Trade Offer"}
        </button>

      </div>
    </div>
  );
}