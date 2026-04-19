import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Messaging.css";

export default function Messaging() {
  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================
  const [currentUser, setCurrentUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // 🔥 track listings already chatted
  const [chatListingIds, setChatListingIds] = useState([]);

  // =========================
  // LOAD USER
  // =========================
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) setCurrentUser(JSON.parse(user));
  }, []);

  // =========================
  // LOAD CHATS
  // =========================
  useEffect(() => {
    if (!currentUser?.id) return;
    loadChats();
  }, [currentUser?.id]);

  async function loadChats() {
    const { data } = await supabase
      .from("conversations")
      .select(`
        id,
        listing_id,
        buyer_id,
        seller_id,
        listings (title),
        buyer:buyer_id(name),
        seller:seller_id(name)
      `)
      .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`);

    setChats(data || []);

    // 🔥 IMPORTANT: update listing IDs
    const ids = (data || []).map((c) => c.listing_id);
    setChatListingIds(ids);
  }

  // =========================
  // FETCH LISTINGS (FILTERED)
  // =========================
  async function fetchListings(idsOverride = null) {
    const idsToUse = idsOverride || chatListingIds;

    const { data } = await supabase.from("listings").select(`
      id,
      title,
      user_id,
      status,
      profiles ( name ),
      listing_images ( image_url )
    `);

    const formatted = (data || [])
      .filter((l) => l.status === "active")
      .filter((l) => l.user_id !== currentUser?.id)
      .filter((l) => !idsToUse.includes(l.id)) // ✅ correct filtering
      .map((l) => ({
        ...l,
        image: l.listing_images?.[0]?.image_url || "/wits.png",
      }));

    setListings(formatted);
  }

  // reload listings when chat IDs change
  useEffect(() => {
    if (currentUser?.id) {
      fetchListings();
    }
  }, [chatListingIds]);

  // =========================
  // REAL-TIME MESSAGES
  // =========================
  useEffect(() => {
    if (!activeChat?.id) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeChat.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeChat?.id]);

  // =========================
  // OPEN CHAT
  // =========================
  function openChat(chat) {
    setActiveChat(chat);
    loadMessages(chat.id);
  }

  // =========================
  // START CHAT FROM LISTING
  // =========================
  async function openFromListing(listing) {
    const buyerId = currentUser.id;
    const sellerId = listing.user_id;

    let { data: convo } = await supabase
      .from("conversations")
      .select("*")
      .eq("listing_id", listing.id)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (!convo) {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert([
          {
            listing_id: listing.id,
            buyer_id: buyerId,
            seller_id: sellerId,
          },
        ])
        .select()
        .single();

      convo = newConvo;
    }

    // 🔥 FIX: update IDs immediately AND refetch listings with new IDs
    const updatedIds = [...chatListingIds, listing.id];
    setChatListingIds(updatedIds);
    fetchListings(updatedIds); // 🔥 force correct filtering immediately

    setActiveChat({
      ...convo,
      listings: { title: listing.title },
      seller: listing.profiles || null,
    });

    loadMessages(convo.id);
    loadChats();
  }

  // =========================
  // LOAD MESSAGES
  // =========================
  async function loadMessages(conversationId) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  // =========================
  // SEND MESSAGE
  // =========================
  async function sendMessage() {
    if (!newMessage.trim() || !activeChat?.id) return;

    await supabase.from("messages").insert([
      {
        conversation_id: activeChat.id,
        sender_id: currentUser.id,
        body: newMessage,
      },
    ]);

    setNewMessage("");
  }

  // =========================
  // GROUP BY DATE
  // =========================
  function groupMessagesByDate(messages) {
    const groups = {};

    messages.forEach((msg) => {
      const date = new Date(msg.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });

    return groups;
  }

  function formatDateHeader(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="msg-container">

      {/* LEFT PANEL */}
      <div className="msg-left">

        {/* CHATS */}
        <div className="msg-section">
          <h3 className="msg-title">Chats</h3>

          {chats.map((c) => (
            <div
              key={c.id}
              className="msg-listing chat-item"
              onClick={() => openChat(c)}
            >
              💬 {c.listings?.title}
            </div>
          ))}
        </div>

        <div className="section-gap"></div>

        {/* LISTINGS */}
        <div className="msg-section">
          <h3 className="msg-title">Listings</h3>

          {listings.map((l) => (
            <div
              key={l.id}
              className="msg-listing listing-item"
              onClick={() => openFromListing(l)}
            >
              <div className="msg-img-square">
                <img src={l.image} alt="" />
              </div>

              <div>
                <div className="msg-item-title">{l.title}</div>
                <div className="msg-sub">{l.profiles?.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="msg-right">

        {/* HEADER */}
        <div className="msg-header">
          <div className="chat-header-title">
            <div className="chat-title-main">
              {activeChat?.listings?.title || "Messages"}
            </div>

            {activeChat?.seller?.name && (
              <div className="chat-title-sub">
                Sold by: {activeChat.seller.name}
              </div>
            )}
          </div>

          <button className="blue-btn" onClick={() => navigate("/basket")}>
            Back
          </button>
        </div>

        {/* MESSAGES */}
        <div className="msg-box">
          {activeChat ? (
            Object.entries(groupMessagesByDate(messages)).map(
              ([dateKey, msgs]) => (
                <div key={dateKey}>
                  <div className="chat-date">
                    <span>{formatDateHeader(dateKey)}</span>
                  </div>

                  {msgs.map((m) => {
                    const isMe = m.sender_id === currentUser?.id;

                    const time = new Date(m.created_at).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    );

                    return (
                      <div
                        key={m.id}
                        className={`msg-row ${isMe ? "me" : "them"}`}
                      >
                        <div className={`msg-bubble ${isMe ? "me" : "them"}`}>
                          {m.body}
                          <div className="msg-time">{time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )
          ) : (
            <p>Select a chat or listing</p>
          )}
        </div>

        {/* INPUT */}
        {activeChat && (
          <div className="msg-input-area">
            <input
              className="msg-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />

            <button className="msg-send" onClick={sendMessage}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}