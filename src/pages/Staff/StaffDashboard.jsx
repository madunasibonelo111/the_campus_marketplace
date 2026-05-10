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
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [pendingReleases, setPendingReleases] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

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

  // Fetch staff name and dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          // Get staff name from profiles
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          
          if (!profileError && profile) {
            setStaffName(profile.name || 'Staff Member');
          } else {
            setStaffName('Staff Member');
          }
        }

        // Load drop-off appointments
        const { data: dropoffs, error: dropoffError } = await supabase
          .from('facility_bookings')
          .select(`
            id,
            transaction_id,
            booking_date,
            status,
            transactions:transaction_id (
              id,
              total_amount,
              listings:listing_id (
                title
              ),
              seller:seller_id (
                name
              ),
              buyer:buyer_id (
                name
              )
            )
          `)
          .eq('booking_type', 'drop_off')
          .eq('status', 'pending')
          .order('booking_date', { ascending: true });

        if (!dropoffError && dropoffs && dropoffs.length > 0) {
          const formattedDropoffs = dropoffs.map(booking => ({
            id: booking.id,
            transaction_id: booking.transaction_id,
            item_name: booking.transactions?.listings?.title || 'Unknown Item',
            seller_name: booking.transactions?.seller?.name || 'Unknown Seller',
            buyer_name: booking.transactions?.buyer?.name || 'Unknown Buyer',
            amount: booking.transactions?.total_amount || 0,
            booking_time: booking.booking_date,
            booking_id: booking.id,
            status: booking.status
          }));
          setPendingReceipts(formattedDropoffs);
          setStats(prev => ({ ...prev, pendingDropoffs: formattedDropoffs.length }));
        }

        // Load collection appointments
        const { data: collections, error: collectionError } = await supabase
          .from('facility_bookings')
          .select(`
            id,
            transaction_id,
            booking_date,
            status,
            transactions:transaction_id (
              id,
              total_amount,
              listings:listing_id (
                title
              ),
              seller:seller_id (
                name
              ),
              buyer:buyer_id (
                name
              )
            ),
            facility_handoffs (
              item_condition_notes
            )
          `)
          .eq('booking_type', 'collection')
          .eq('status', 'pending')
          .order('booking_date', { ascending: true });

        if (!collectionError && collections && collections.length > 0) {
          const formattedCollections = collections.map(booking => ({
            id: booking.id,
            transaction_id: booking.transaction_id,
            item_name: booking.transactions?.listings?.title || 'Unknown Item',
            seller_name: booking.transactions?.seller?.name || 'Unknown Seller',
            buyer_name: booking.transactions?.buyer?.name || 'Unknown Buyer',
            amount: booking.transactions?.total_amount || 0,
            booking_time: booking.booking_date,
            booking_id: booking.id,
            condition: booking.facility_handoffs?.[0]?.item_condition_notes || 'Not yet received',
            status: booking.status
          }));
          setPendingReleases(formattedCollections);
          setStats(prev => ({ ...prev, pendingCollections: formattedCollections.length }));
        }

        // Also fetch stats for receipts
        const { count: receiptCount } = await supabase
          .from('facility_bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'confirmed');

        setStats(prev => ({ ...prev, pendingReceipts: receiptCount || 0 }));

      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback mock data for demo/error state
        setPendingReceipts([
          {
            id: '1',
            transaction_id: 'TXN-001',
            item_name: 'Vintage Leather Boots',
            seller_name: 'John Doe',
            buyer_name: 'Jane Smith',
            amount: 249.99,
            booking_time: new Date().toISOString(),
          }
        ]);
        setPendingReleases([
          {
            id: '2',
            transaction_id: 'TXN-002',
            item_name: 'Mountain Bike',
            seller_name: 'Mike Johnson',
            buyer_name: 'Sarah Williams',
            amount: 599.99,
            booking_time: new Date().toISOString(),
            condition: 'Good condition'
          }
        ]);
        setStats({
          pendingDropoffs: 1,
          pendingCollections: 1,
          pendingReceipts: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleConfirmReceipt = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handleConfirmRelease = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReleaseModal(true);
  };

  const handleUpdateBookingStatus = async (bookingId, status, transactionId, buyerId, itemName) => {
    try {
      const { error } = await supabase
        .from('facility_bookings')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update transaction status if needed
      if (status === 'completed' && transactionId) {
        await supabase
          .from('transactions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', transactionId);
      }

      // Send notification to buyer if item is ready
      if (status === 'completed' && buyerId && itemName) {
        await supabase.from('notifications').insert({
          user_id: buyerId,
          type: 'facility_update',
          title: status === 'completed' ? 'Collection Confirmed' : 'Drop-off Confirmed',
          message: `Your "${itemName}" has been ${status === 'completed' ? 'collected' : 'received'} successfully.`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
      
      // Update local state
      setPendingReceipts(prev => prev.filter(b => b.booking_id !== bookingId));
      setPendingReleases(prev => prev.filter(b => b.booking_id !== bookingId));
      setStats(prev => ({
        pendingDropoffs: pendingReceipts.length,
        pendingCollections: pendingReleases.length,
        pendingReceipts: prev.pendingReceipts
      }));
      
      alert(`Booking ${status === 'completed' ? 'completed' : 'confirmed'} successfully!`);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking status');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

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

      {/* Quick Action Cards */}
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

      {/* Stats Grid */}
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

      {/* Today's Schedule Section */}
      <div className="management-section">
        <div className="section-header">
          <h2>Today's Schedule</h2>
          <p>Upcoming drop-offs and collections</p>
        </div>
        
        {pendingReceipts.length === 0 && pendingReleases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No Appointments</h3>
            <p>No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="booking-list">
            {pendingReceipts.map(booking => (
              <div key={booking.id} className="booking-row">
                <div className="item-info">
                  <strong>{booking.item_name}</strong>
                  {booking.amount && (
                    <span className="amount">R{booking.amount.toFixed(2)}</span>
                  )}
                </div>
                <div className="party-info">
                  <div className="seller">📤 Seller: {booking.seller_name}</div>
                  <div className="buyer">📥 Buyer: {booking.buyer_name}</div>
                </div>
                <div className="booking-time">
                  📅 {new Date(booking.booking_time).toLocaleString()}
                </div>
                <div className="actions">
                  <button 
                    className="btn-confirm-receipt"
                    onClick={() => handleConfirmReceipt(booking)}
                  >
                    ✓ Confirm Receipt
                  </button>
                </div>
              </div>
            ))}
            {pendingReleases.map(booking => (
              <div key={booking.id} className="booking-row">
                <div className="item-info">
                  <strong>{booking.item_name}</strong>
                  {booking.amount && (
                    <span className="amount">R{booking.amount.toFixed(2)}</span>
                  )}
                </div>
                <div className="party-info">
                  <div className="seller">📤 Seller: {booking.seller_name}</div>
                  <div className="buyer">📥 Buyer: {booking.buyer_name}</div>
                </div>
                <div className="booking-time">
                  📅 {new Date(booking.booking_time).toLocaleString()}
                </div>
                <div className="actions">
                  <button 
                    className="btn-confirm-release"
                    onClick={() => handleConfirmRelease(booking)}
                  >
                    ✓ Confirm Release
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Confirm Drop-off Receipt</h2>
              <button className="close-btn" onClick={() => setShowReceiptModal(false)}>&times;</button>
            </div>
            <div className="transaction-details">
              <p><strong>Item:</strong> {selectedTransaction.item_name}</p>
              <p><strong>Seller:</strong> {selectedTransaction.seller_name}</p>
              <p><strong>Time:</strong> {new Date(selectedTransaction.booking_time).toLocaleString()}</p>
            </div>
            <div className="form-group">
              <label>Item Condition *</label>
              <select id="conditionSelect" className="condition-select">
                <option value="Perfect">Perfect - Like new</option>
                <option value="Good">Good - Minor wear</option>
                <option value="Fair">Fair - Visible wear</option>
                <option value="Poor">Poor - Damaged</option>
              </select>
            </div>
            <div className="form-group">
              <label>Condition Notes</label>
              <textarea id="notesText" rows="3" placeholder="Describe any damages or special observations..."></textarea>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowReceiptModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={() => { 
                handleUpdateBookingStatus(
                  selectedTransaction.booking_id, 
                  'completed',
                  selectedTransaction.transaction_id,
                  selectedTransaction.buyer_id,
                  selectedTransaction.item_name
                );
                setShowReceiptModal(false);
              }}>
                Confirm Drop-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Modal */}
      {showReleaseModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Confirm Collection Release</h2>
              <button className="close-btn" onClick={() => setShowReleaseModal(false)}>&times;</button>
            </div>
            <div className="transaction-details">
              <p><strong>Item:</strong> {selectedTransaction.item_name}</p>
              <p><strong>Buyer:</strong> {selectedTransaction.buyer_name}</p>
              <p><strong>Time:</strong> {new Date(selectedTransaction.booking_time).toLocaleString()}</p>
              <p><strong>Condition:</strong> {selectedTransaction.condition}</p>
            </div>
            <div className="verification-section">
              <label className="checkbox-label">
                <input type="checkbox" id="verifyId" /> 
                <span>I confirm that I have verified the buyer's ID</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" id="verifyItem" /> 
                <span>The item condition matches the recorded notes</span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowReleaseModal(false)}>Cancel</button>
              <button 
                className="btn-confirm" 
                style={{ background: '#007bff' }}
                onClick={() => {
                  const verifyId = document.getElementById('verifyId')?.checked;
                  const verifyItem = document.getElementById('verifyItem')?.checked;
                  if (!verifyId || !verifyItem) {
                    alert("Please verify both buyer ID and item condition");
                    return;
                  }
                  handleUpdateBookingStatus(
                    selectedTransaction.booking_id, 
                    'completed',
                    selectedTransaction.transaction_id,
                    selectedTransaction.buyer_id,
                    selectedTransaction.item_name
                  );
                  setShowReleaseModal(false);
                }}
              >
                Confirm Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}