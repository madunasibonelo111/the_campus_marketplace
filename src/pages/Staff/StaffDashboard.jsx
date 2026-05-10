import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./StaffDashboard.css";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Awaiting Receipt");
  const [staffName, setStaffName] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [stats, setStats] = useState({
    pendingDropoffs: 0,
    pendingCollections: 0,
    pendingReceipts: 0
  });

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch staff name
  useEffect(() => {
    const fetchStaffName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          setStaffName(profile?.name || 'Staff Member');
        }
      } catch (err) {
        console.error("Error fetching staff name:", err);
        setStaffName('Staff Member');
      }
    };
    fetchStaffName();
  }, []);

  // Fetch facility data
  useEffect(() => {
    fetchFacilityData();
  }, [activeTab]);

  // Fetch stats for dashboard
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Count pending drop-offs
      const { count: dropoffCount } = await supabase
        .from('facility_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('booking_type', 'drop_off')
        .eq('status', 'pending');

      // Count pending collections (confirmed and ready for pickup)
      const { count: collectionCount } = await supabase
        .from('facility_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('booking_type', 'collection')
        .eq('status', 'confirmed');

      // Count confirmed bookings
      const { count: receiptCount } = await supabase
        .from('facility_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

      setStats({
        pendingDropoffs: dropoffCount || 0,
        pendingCollections: collectionCount || 0,
        pendingReceipts: receiptCount || 0
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchFacilityData = async () => {
    setLoading(true);
    try {
      // First, get all facility bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('facility_bookings')
        .select('*')
        .order('booking_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Get all unique transaction IDs
      const transactionIds = [...new Set(bookingsData.map(b => b.transaction_id).filter(id => id))];
      
      // Fetch all transactions in one go
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          listing_id,
          buyer_id,
          seller_id,
          status
        `)
        .in('id', transactionIds);

      if (transactionsError) throw transactionsError;

      // Get all listing IDs
      const listingIds = [...new Set(transactionsData?.map(t => t.listing_id).filter(id => id) || [])];
      
      // Fetch all listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, price')
        .in('id', listingIds);

      if (listingsError) throw listingsError;

      // Get all profile IDs (sellers and buyers)
      const profileIds = [];
      transactionsData?.forEach(t => {
        if (t.seller_id) profileIds.push(t.seller_id);
        if (t.buyer_id) profileIds.push(t.buyer_id);
      });
      const uniqueProfileIds = [...new Set(profileIds)];
      
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uniqueProfileIds);

      if (profilesError) throw profilesError;

      // Create lookup maps
      const listingMap = new Map();
      listingsData?.forEach(l => listingMap.set(l.id, l));

      const profileMap = new Map();
      profilesData?.forEach(p => profileMap.set(p.id, p));

      const transactionMap = new Map();
      transactionsData?.forEach(t => transactionMap.set(t.id, t));

      // Build enriched bookings
      const enrichedBookings = bookingsData.map(booking => {
        const transaction = transactionMap.get(booking.transaction_id);
        if (!transaction) return null;

        const listing = listingMap.get(transaction.listing_id);
        const seller = profileMap.get(transaction.seller_id);
        const buyer = profileMap.get(transaction.buyer_id);

        return {
          ...booking,
          transactions: {
            id: transaction.id,
            status: transaction.status,
            total_amount: transaction.total_amount,
            listings: listing || { title: 'Unknown Item', price: 0 },
            seller: seller || { name: 'Unknown Seller' },
            buyer: buyer || { name: 'Unknown Buyer' }
          }
        };
      }).filter(b => b !== null);

      // Apply tab filtering
      const filtered = enrichedBookings.filter(b => {
        if (activeTab === "Awaiting Receipt") {
          return b.status === 'pending' && b.booking_type === 'drop_off';
        }
        if (activeTab === "Ready for Release") {
          return b.transactions?.status === 'accepted' && b.status === 'confirmed';
        }
        if (activeTab === "Ready for Collection") {
          return b.status === 'confirmed' && b.booking_type === 'collection';
        }
        if (activeTab === "Completed") {
          return b.status === 'completed';
        }
        return true;
      });

      setBookings(filtered);
    } catch (err) {
      console.error("Staff fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, nextStatus, transactionId, nextTxStatus, buyerId, itemName) => {
    try {
      // Update the booking status
      const { error: bookingError } = await supabase
        .from('facility_bookings')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);
        
      if (bookingError) throw bookingError;

      // Update transaction status if applicable
      if (nextTxStatus) {
        const { error: txError } = await supabase
          .from('transactions')
          .update({ status: nextTxStatus, updated_at: new Date().toISOString() })
          .eq('id', transactionId);
          
        if (txError) throw txError;
      }

      // Auto-generate notification for the buyer when item is ready
      if (nextTxStatus === 'item_received' && buyerId) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert({
            user_id: buyerId,
            type: 'facility_update',
            title: 'Item Ready for Collection! 🎁',
            message: `Good news! The seller has dropped off "${itemName}" at the Trade Facility. It has been verified by our staff and is ready for you to collect.`,
            is_read: false,
            created_at: new Date().toISOString()
          });
          
        if (notifyError) console.error("Failed to send notification:", notifyError);
      }

      // If confirming receipt (drop_off), create a collection booking automatically
      if (nextStatus === 'confirmed' && nextTxStatus === 'item_received') {
        const collectionDate = new Date();
        collectionDate.setDate(collectionDate.getDate() + 1);
        
        await supabase
          .from('facility_bookings')
          .insert({
            transaction_id: transactionId,
            user_id: buyerId,
            booking_type: 'collection',
            booking_date: collectionDate.toISOString(),
            status: 'confirmed',
            amount_due: 0,
            created_at: new Date().toISOString()
          });
      }

      alert(`Status updated to ${nextStatus}`);
      fetchFacilityData();
      fetchStats();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Error updating status: " + err.message);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="staff-dashboard">
      {/* Welcome Header */}
      <header className="staff-header">
        <div className="header-content">
          <div>
            <h1>Campus Marketplace</h1>
            <p>Staff Management Portal</p>
          </div>
          <div className="header-right">
            <div className="current-time">{currentTime}</div>
          </div>
        </div>
        <div className="greeting-section">
          <h2>{getGreeting()}, {staffName}! 👋</h2>
          <p>Manage drop-offs, collections, and transaction confirmations</p>
        </div>
      </header>

      {/* Quick Action Cards for US12 */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-cards">
          <div className="action-card dropoff" onClick={() => navigate('/staff/dropoffs')}>
            <div className="action-icon">📦</div>
            <div className="action-info">
              <h4>Manage Drop-offs</h4>
              <p>Schedule & confirm seller drop-offs</p>
            </div>
            <div className="action-badge">{stats.pendingDropoffs} pending</div>
          </div>
          <div className="action-card collection" onClick={() => navigate('/staff/collections')}>
            <div className="action-icon">🎁</div>
            <div className="action-info">
              <h4>Manage Collections</h4>
              <p>Schedule & confirm buyer collections</p>
            </div>
            <div className="action-badge">{stats.pendingCollections} pending</div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-details">
            <span>Pending Drop-offs</span>
            <strong>{stats.pendingDropoffs}</strong>
            <small>Awaiting seller drop-off</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎁</div>
          <div className="stat-details">
            <span>Pending Collections</span>
            <strong>{stats.pendingCollections}</strong>
            <small>Ready for buyer pickup</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-details">
            <span>Pending Receipts</span>
            <strong>{stats.pendingReceipts}</strong>
            <small>Awaiting confirmation</small>
          </div>
        </div>
      </div>

      <div className="management-section">
        <div className="tab-navigation">
          {["Awaiting Receipt", "Ready for Release", "Ready for Collection", "Completed"].map(tab => (
            <button 
              key={tab} 
              className={activeTab === tab ? "active-tab" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Awaiting Receipt" && stats.pendingDropoffs > 0 && (
                <span className="tab-badge">{stats.pendingDropoffs}</span>
              )}
              {tab === "Ready for Collection" && stats.pendingCollections > 0 && (
                <span className="tab-badge">{stats.pendingCollections}</span>
              )}
            </button>
          ))}
        </div>

        <div className="booking-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : (
            bookings.length > 0 ? bookings.map(b => (
              <div key={b.id} className="booking-row">
                <div className="item-info">
                  <strong>{b.transactions?.listings?.title || 'Unknown Item'}</strong>
                  <span className="transaction-id">ID: {b.transactions?.id?.slice(0,8)}</span>
                  {b.transactions?.total_amount && (
                    <span className="amount">R{b.transactions.total_amount.toFixed(2)}</span>
                  )}
                </div>
                <div className="party-info">
                  <div className="seller">📤 Seller: {b.transactions?.seller?.name || 'Unknown'}</div>
                  <div className="buyer">📥 Buyer: {b.transactions?.buyer?.name || 'Unknown'}</div>
                </div>
                <div className="booking-time">
                  📅 {new Date(b.booking_date).toLocaleString()}
                </div>
                
                <div className="actions">
                  {activeTab === "Awaiting Receipt" && (
                    <button 
                      className="btn-confirm-receipt"
                      onClick={() => updateStatus(
                        b.id, 
                        'confirmed', 
                        b.transactions?.id, 
                        'item_received',
                        b.transactions?.buyer?.id,
                        b.transactions?.listings?.title
                      )}
                    >
                      ✓ Confirm Receipt
                    </button>
                  )}
                  {activeTab === "Ready for Release" && (
                    <button 
                      className="btn-confirm-release"
                      onClick={() => updateStatus(
                        b.id, 
                        'completed', 
                        b.transactions?.id, 
                        'completed',
                        null,
                        null
                      )}
                    >
                      ✓ Confirm Release
                    </button>
                  )}
                  {activeTab === "Ready for Collection" && (
                    <button 
                      className="btn-collection"
                      onClick={() => updateStatus(
                        b.id, 
                        'completed', 
                        b.transactions?.id, 
                        'completed',
                        null,
                        null
                      )}
                    >
                      ✓ Mark as Collected
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="no-data">
                <div className="empty-icon">📋</div>
                <p>No transactions found for {activeTab.toLowerCase()}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}