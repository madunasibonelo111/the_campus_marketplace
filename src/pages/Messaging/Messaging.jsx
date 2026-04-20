import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Messaging.css";

export default function Messaging() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [listings, setListings] = useState([]);
  const [activeListing, setActiveListing] = useState(null);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [autoMessageSent, setAutoMessageSent] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
      setAuthLoading(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) fetchListings();
  }, [currentUser]);

  useEffect(() => {
    const listingIdFromUrl = searchParams.get("listingId");
    if (listingIdFromUrl && listings.length > 0) {
      const target = listings.find(l => l.id === listingIdFromUrl);
      if (target) openChat(target);
    }
  }, [listings, searchParams]);

  async function fetchListings() {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id, title, user_id,
        listing_images (image_url),
        profiles (name),
        conversations (buyer_id, seller_id) 
      `);

    if (!error) {
      const filtered = (data || []).filter(l => 
        l.user_id === currentUser?.id || 
        l.conversations?.some(c => c.buyer_id === currentUser?.id || c.seller_id === currentUser?.id) ||
        l.id === searchParams.get("listingId")
      );
      setListings(filtered);
    }
  }

  async function openChat(listing) {
    if (authLoading || !currentUser?.id) return;
    setActiveListing(listing);

    let { data: convo } = await supabase
      .from("conversations")
      .select(`
        *,
        buyer:profiles!buyer_id(name),
        seller:profiles!seller_id(name)
      `)
      .eq("listing_id", listing.id)
      .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
      .maybeSingle();

    if (!convo && listing.user_id !== currentUser.id) {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert([{
          listing_id: listing.id,
          buyer_id: currentUser.id,
          seller_id: listing.user_id,
        }])
        .select(`*, buyer:profiles!buyer_id(name), seller:profiles!seller_id(name)`)
        .single();

      convo = newConvo;
    }

    if (!convo && listing.user_id === currentUser.id) {
      setMessages([]);
      setConversation(null);
      return;
    }

    setConversation(convo);
    await loadMessages(convo.id);

    // ✅ UPDATED AUTO MESSAGE (WITH ITEM NAME)
    const isTradeRequest = searchParams.get("trade");

    if (isTradeRequest && !autoMessageSent) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", convo.id)
        .ilike("body", `%${listing.title}%`)
        .limit(1);

      if (!existing || existing.length === 0) {
        const autoMsg = {
          conversation_id: convo.id,
          sender_id: currentUser.id,
          body: `Hey! I want to trade for "${listing.title}" `,
          created_at: new Date().toISOString(),
        };

        await supabase.from("messages").insert(autoMsg);
        setMessages(prev => [...prev, autoMsg]);
      }

      setAutoMessageSent(true);
    }
  }

  async function loadMessages(conversationId) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  async function sendMessage() {
    if (!conversation?.id || !newMessage.trim()) return;

    const tempMessage = {
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      body: newMessage,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("messages").insert([tempMessage]);

    if (!error) {
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !conversation) return;

    try {
      const filePath = `chat-images/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("chat-images")
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("chat-images")
        .getPublicUrl(filePath);

      const msg = {
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        body: newMessage || `Trade offer for "${activeListing?.title}" 👇`,
        image_url: data.publicUrl,
        created_at: new Date().toISOString(),
      };

      await supabase.from("messages").insert(msg);
      setMessages(prev => [...prev, msg]);
      setNewMessage("");

    } catch (err) {
      alert("Upload failed: " + err.message);
    }
  }

  const formatFullDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-ZA", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit",
    });

  const groupedMessages = messages.reduce((groups, m) => {
    const key = new Date(m.created_at).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
    return groups;
  }, {});

  const renderListings = (list, type) => (
    <>
      <div className="sidebar-section-header">{type}</div>
      {list.map((l) => (
        <div
          key={l.id}
          className={`msg-listing ${activeListing?.id === l.id ? 'active-chat' : ''}`}
          onClick={() => openChat(l)}
        >
          <img src={l.listing_images?.[0]?.image_url || "https://via.placeholder.com/60"} className="msg-img" alt="" />
          <div className="msg-info">
            <div className="msg-item-title">{l.title}</div>
            <div className="msg-sub">
              {type === "Selling" ? "🏷️ My Listing" : `Seller: ${l.profiles?.name || "Student"}`}
            </div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="msg-container">
      <div className="msg-left">
        <h3 className="msg-title">Your Chats</h3>
        {renderListings(listings.filter(l => l.user_id === currentUser?.id), "Selling")}
        {renderListings(listings.filter(l => l.user_id !== currentUser?.id), "Buying")}
      </div>

      <div className="msg-right">
        <div className="msg-header">
          <div>
            <h3 style={{ margin: 0 }}>
              {activeListing && conversation ? (
                activeListing.user_id === currentUser?.id 
                  ? (conversation.buyer?.name || "Buyer")
                  : (conversation.seller?.name || "Seller")
              ) : "Messages"}
            </h3>
            {activeListing && <div className="msg-item-context">Item: {activeListing.title}</div>}
          </div>
          <button className="msg-back-btn" onClick={() => navigate("/basket")}>← Back to Shop</button>
        </div>

        <div className="msg-box">
          {conversation ? (
            Object.entries(groupedMessages).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="msg-date-divider">{formatFullDate(msgs[0].created_at)}</div>
                {msgs.map((m) => (
                  <div key={m.created_at} className={`msg-bubble-wrapper ${m.sender_id === currentUser?.id ? 'sent' : 'received'}`}>
                    <div className="msg-bubble">
                      <div className="msg-text">{m.body}</div>

                      {m.image_url && (
                        <img src={m.image_url} className="msg-image" alt="trade" />
                      )}

                      <div className="msg-timestamp">{formatTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="msg-empty-state"><p>Select a listing from the left to start chatting</p></div>
          )}
        </div>

        {conversation && (
          <div className="msg-footer">
            <div className="emoji-bar">
              {['😊', '👋', '💰', '👍', '📍', '🙌'].map(emoji => (
                <button key={emoji} onClick={() => setNewMessage(prev => prev + emoji)}>{emoji}</button>
              ))}
            </div>

           <div className="msg-input-area">
              <label className="upload-btn" title="Update in next sprint">
                    ✚
                <input
                type="file"
                hidden
                accept="image/*"
                onChange={() => {
                alert("📌 Image uploads will be added in the next sprint");
                }}
                />
              </label>

              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Write a message..."
                className="msg-input"
              />

              <button className="msg-send" onClick={sendMessage} disabled={!newMessage.trim()}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}