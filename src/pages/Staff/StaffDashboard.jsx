// src/pages/Staff/StaffDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [pendingReleases, setPendingReleases] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Local state tracking wrappers for row checkboxes to preserve individual validation bounds
  const [quickVerifiedReceipts, setQuickVerifiedReceipts] = useState({});
  const [quickVerifiedReleases, setQuickVerifiedReleases] = useState({});

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

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

      if (!dropoffError && dropoffs) {
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
      }

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
            status,
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
        .eq('booking_type', 'collection')
        .eq('status', 'pending')
        .order('booking_date', { ascending: true });

      if (!collectionError && collections) {
        const formattedCollections = collections.map(booking => ({
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
        setPendingReleases(formattedCollections);
      }

    } catch (error) {
      console.error('Error loading data securely:', error);
      setPendingReceipts([]);
      setPendingReleases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🚀 FIXED: Frontend-only timezone calculation layer
  const pushUtilizationAnalyticsSnapshot = async () => {
    try {
      // Create date boundaries aligned with local SAST midnight constraints
      const localStart = new Date();
      localStart.setHours(0, 0, 0, 0);
      
      const localEnd = new Date();
      localEnd.setHours(23, 59, 59, 999);

      // Fetch today's records inside your local calendar window boundaries
      const { data: activeBookings } = await supabase
        .from('facility_bookings')
        .select('id')
        .gte('booking_date', localStart.toISOString())
        .lte('booking_date', localEnd.toISOString())
        .in('status', ['pending', 'confirmed', 'completed']);

      const slotsBookedCount = activeBookings ? activeBookings.length : 0;
      const staticMaxSlotsAvailable = 40; 
      const currentLoadPct = staticMaxSlotsAvailable > 0 ? (slotsBookedCount / staticMaxSlotsAvailable) * 100 : 0;

      // Generate localized date key string using Johannesburg parameters (en-CA standard outputs YYYY-MM-DD)
      const options = { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' };
      const dtf = new Intl.DateTimeFormat('en-CA', options);
      const localizedDateString = dtf.format(new Date());

      // Read current row to fetch its unique auto-increment id sequence if it exists
      const { data: existingRow } = await supabase
        .from('analytics_facility_utilization')
        .select('id')
        .eq('check_date', localizedDateString)
        .maybeSingle();

      if (existingRow) {
        // UPDATE target row explicitly matching the key sequence id parameters
        await supabase
          .from('analytics_facility_utilization')
          .update({
            total_slots_booked: slotsBookedCount,
            utilization_percentage: currentLoadPct
          })
          .eq('id', existingRow.id);
      } else {
        // INSERT brand new row dataset index seamlessly
        await supabase
          .from('analytics_facility_utilization')
          .insert({
            check_date: localizedDateString,
            total_slots_available: staticMaxSlotsAvailable,
            total_slots_booked: slotsBookedCount,
            utilization_percentage: currentLoadPct
          });
      }

      console.log(`Successfully synced local analytics date (${localizedDateString}): ${currentLoadPct}%`);
    } catch (err) {
      console.error("Failed executing facility analytics synchronization:", err);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status, transactionId, type) => {
    try {
      console.log(`Processing Quick Action desk confirmation for ${type} appointment:`, bookingId);

      const { error: bookingError } = await supabase
        .from('facility_bookings')
        .update({ status: status })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      let newTransactionStatus = '';
      
      if (status === 'completed') {
        if (type === 'drop_off') {
          newTransactionStatus = 'item_in_custody'; 

          const { error: handoffError } = await supabase
            .from('facility_handoffs')
            .insert({
              transaction_id: transactionId,
              handoff_type: 'receipt_from_seller',
              item_condition_notes: 'Verified via Quick Action Feed',
              created_at: new Date().toISOString()
            });

          if (handoffError) throw handoffError;
        } 
        else if (type === 'collection') {
          newTransactionStatus = 'completed';

          const { error: handoffError } = await supabase
            .from('facility_handoffs')
            .insert({
              transaction_id: transactionId,
              handoff_type: 'release_to_buyer', 
              item_condition_notes: 'Verified Custody - Final Release',
              created_at: new Date().toISOString()
            });

          if (handoffError) throw handoffError;
        }

        if (newTransactionStatus) {
          const { error: txError } = await supabase
            .from('transactions')
            .update({ 
              status: newTransactionStatus,
              updated_at: new Date().toISOString(),
              completed_at: newTransactionStatus === 'completed' ? new Date().toISOString() : undefined
            })
            .eq('id', transactionId);

          if (txError) throw txError;
        }
      }

      await pushUtilizationAnalyticsSnapshot();
      alert(`✅ Success: The ${type.replace('_', ' ')} quick-action has been logged and synchronized!`);
      
      setPendingReceipts(prev => prev.filter(b => b.booking_id !== bookingId && b.id !== bookingId));
      setPendingReleases(prev => prev.filter(b => b.booking_id !== bookingId && b.id !== bookingId));

    } catch (error) {
      console.error('Error in staff verification workflow stream:', error);
      alert('Fulfillment submission failure: ' + error.message);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleReceiptCheckToggle = (bookingId, field) => {
    setQuickVerifiedReceipts(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [field]: !prev[bookingId]?.[field] }
    }));
  };

  const handleReleaseCheckToggle = (bookingId, field) => {
    setQuickVerifiedReleases(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [field]: !prev[bookingId]?.[field] }
    }));
  };

  if (loading) {
    return (
      <div className="loading-viewport-container">
        <div className="loading-spinner-circle"></div>
        <p>Loading dashboard infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="staff-viewport-wrapper">
      
      {/* Fixed Header Section Area */}
      <div className="dashboard-header-container">
        <div className="dashboard-header">
          <div className="header-decor-symbol">🏫</div>
          <div className="header-flex-content">
            <div className="title-area">
              <h1>Campus Marketplace</h1>
              <p>Staff Management Portal</p>
            </div>
            <div className="time-pill-box">
              🕒 {currentTime}
            </div>
          </div>
          <div className="greeting-row">
            <h2 data-testid="greeting">{getGreeting()}, {staffName || 'Staff Member'}! 👋</h2>
            <p>Here's what's happening with your transactions today</p>
          </div>
        </div>
      </div>

      {/* Dynamic Content Frame Workspace Wrapper */}
      <div className="staff-scroll-workspace">
        <div className="dashboard-scrollable-inner">
          
          {/* Quick Actions Router Blocks Layout */}
          <div className="workspace-section-block">
            <h3>Quick Actions</h3>
            <div className="quick-actions-cards-grid">
              
              <div data-testid="manage-dropoffs-card" className="action-card dropoff" onClick={() => navigate('/staff/dropoffs')}>
                <div className="card-top-row">
                  <div className="card-badge-icon">📦</div>
                  <div className="card-title-group">
                    <h4>Manage Drop-offs</h4>
                    <p>Schedule & confirm seller drop-offs</p>
                  </div>
                </div>
                <div className="card-footer-row">
                  <span className="route-arrow-link">Manage →</span>
                  {pendingReceipts.length > 0 && (
                    <span className="count-indicator-pill dropoff">{pendingReceipts.length} pending</span>
                  )}
                </div>
              </div>

              <div data-testid="manage-collections-card" className="action-card collection" onClick={() => navigate('/staff/collections')}>
                <div className="card-top-row">
                  <div className="card-badge-icon">🎁</div>
                  <div className="card-title-group">
                    <h4>Manage Collections</h4>
                    <p>Schedule & confirm buyer collections</p>
                  </div>
                </div>
                <div className="card-footer-row">
                  <span className="route-arrow-link">Manage →</span>
                  {pendingReleases.length > 0 && (
                    <span className="count-indicator-pill collection">{pendingReleases.length} pending</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Operational Insights Metric Indicators Summary Bar */}
          <div className="insights-metrics-grid-row">
            <div className="insight-metric-tile">
              <div className="tile-data-column">
                <span className="tile-label">Pending Drop-offs</span>
                <span className="tile-numerical-value color-dropoff">{pendingReceipts.length}</span>
                <span className="tile-sublabel">Awaiting seller drop-off</span>
              </div>
              <div className="tile-icon-decor">📥</div>
            </div>

            <div className="insight-metric-tile">
              <div className="tile-data-column">
                <span className="tile-label">Pending Collections</span>
                <span className="tile-numerical-value color-collection">{pendingReleases.length}</span>
                <span className="tile-sublabel">Ready for buyer pickup</span>
              </div>
              <div className="tile-icon-decor">📤</div>
            </div>

            <div className="insight-metric-tile gradient-accent-tile">
              <div className="tile-data-column">
                <span className="tile-label">Total Appointments</span>
                <span className="tile-numerical-value color-white">{pendingReceipts.length + pendingReleases.length}</span>
                <span className="tile-sublabel">Require your attention</span>
              </div>
              <div className="tile-icon-decor">⚡</div>
            </div>
          </div>

          {/* Core Intact Feature: Today's Schedule Interactive Feed */}
          <div className="today-schedule-workspace-panel">
            <div className="panel-heading-row">
              <div className="heading-text-group">
                <h2>Today's Schedule</h2>
                <p>Upcoming drop-offs and collections</p>
              </div>
              <div className="heading-icon-badge">📅</div>
            </div>

            {pendingReceipts.length === 0 && pendingReleases.length === 0 ? (
              <div className="empty-schedule-state-view">
                <div className="empty-state-icon">📅</div>
                <p>No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="interactive-feed-rows-list">
                
                {/* INLINE ROW MAPPER FOR DROPOFFS */}
                {pendingReceipts.map(booking => (
                  <div key={booking.id} className="feed-booking-item dropoff-row-border">
                    <div className="feed-item-top-section">
                      <div className="feed-item-meta-info">
                        <div className="feed-type-icon">📦</div>
                        <div className="feed-title-block">
                          <div className="item-headline">{booking.item_name}</div>
                          <div className="item-subline">Drop-off by <strong>{booking.seller_name}</strong></div>
                        </div>
                      </div>
                      <div className="feed-timestamp-badge">
                        {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Integrated row criteria checkboxes */}
                    <div className="feed-inline-verification-box status-dropoff-well">
                      <label className="inline-check-row">
                        <input type="checkbox" checked={!!quickVerifiedReceipts[booking.id]?.idChecked} onChange={() => handleReceiptCheckToggle(booking.id, 'idChecked')} />
                        <span>Verify Seller Student Card ID</span>
                      </label>
                      <label className="inline-check-row">
                        <input type="checkbox" checked={!!quickVerifiedReceipts[booking.id]?.itemChecked} onChange={() => handleReceiptCheckToggle(booking.id, 'itemChecked')} />
                        <span>Verify Item catalog parameters</span>
                      </label>
                    </div>

                    <button 
                      onClick={() => {
                        if (!quickVerifiedReceipts[booking.id]?.idChecked || !quickVerifiedReceipts[booking.id]?.itemChecked) {
                          alert("🛑 Verification Compliance: You must verify student ID and check item descriptions directly on the row prior to quick accepting drop-off!");
                          return;
                        }
                        handleUpdateBookingStatus(booking.booking_id, 'completed', booking.transaction_id, 'drop_off');
                      }}
                      className="btn-feed-quick-action dropoff-btn"
                    >
                      Quick Confirm Drop-off
                    </button>
                  </div>
                ))}

                {/* INLINE ROW MAPPER FOR COLLECTIONS */}
                {pendingReleases.map(booking => (
                  <div key={booking.id} className="feed-booking-item collection-row-border">
                    <div className="feed-item-top-section">
                      <div className="feed-item-meta-info">
                        <div className="feed-type-icon">🎁</div>
                        <div className="feed-title-block">
                          <div className="item-headline">{booking.item_name}</div>
                          <div className="item-subline">Collection by <strong>{booking.buyer_name}</strong></div>
                        </div>
                      </div>
                      <div className="feed-timestamp-badge">
                        {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Integrated row criteria checkboxes */}
                    <div className="feed-inline-verification-box status-collection-well">
                      <label className="inline-check-row">
                        <input type="checkbox" checked={!!quickVerifiedReleases[booking.id]?.idChecked} onChange={() => handleReleaseCheckToggle(booking.id, 'idChecked')} />
                        <span>Verify Buyer Student Card ID</span>
                      </label>
                      <label className="inline-check-row">
                        <input type="checkbox" checked={!!quickVerifiedReleases[booking.id]?.itemChecked} onChange={() => handleReleaseCheckToggle(booking.id, 'itemChecked')} />
                        <span>Verify Handover Condition matches</span>
                      </label>
                    </div>

                    <button 
                      onClick={() => {
                        if (!quickVerifiedReleases[booking.id]?.idChecked || !quickVerifiedReleases[booking.id]?.itemChecked) {
                          alert("🛑 Verification Compliance: You must verify student ID and check item state notes directly on the row prior to quick releasing item!");
                          return;
                        }
                        handleUpdateBookingStatus(booking.booking_id, 'completed', booking.transaction_id, 'collection');
                      }}
                      className="btn-feed-quick-action collection-btn"
                    >
                      Quick Release Item
                    </button>
                  </div>
                ))}

              </div>
            )}
          </div>

        </div>
      </div>

      {/* FULL DETAILED MODAL SHEET POPUPS FOR SIDE-BAR OR ADVANCED CONFIGS REMAINING ACTIVE */}
      {showReceiptModal && selectedTransaction && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-card-box border-dropoff">
            <h2>Confirm Drop-off</h2>
            <div className="modal-receipt-summary-well">
              <p><strong>Item:</strong> {selectedTransaction.item_name}</p>
              <p><strong>Seller:</strong> {selectedTransaction.seller_name}</p>
              <p><strong>Time:</strong> {new Date(selectedTransaction.booking_time).toLocaleString()}</p>
            </div>
            <div className="modal-input-field-group">
              <label>Item Condition *</label>
              <select id="conditionSelect">
                <option>Perfect - Like new</option>
                <option>Good - Minor wear</option>
                <option>Fair - Visible wear</option>
                <option>Poor - Damaged</option>
              </select>
            </div>
            <div className="modal-input-field-group">
              <label>Notes</label>
              <textarea id="notesText" rows="3"></textarea>
            </div>
            <div className="modal-actions-row-line">
              <button onClick={() => setShowReceiptModal(false)} className="btn-modal-dismiss">Cancel</button>
              <button onClick={() => { 
                handleUpdateBookingStatus(selectedTransaction.booking_id, 'completed', selectedTransaction.transaction_id, 'drop_off');
                setShowReceiptModal(false);
              }} className="btn-modal-execute dropoff">Confirm Drop-off</button>
            </div>
          </div>
        </div>
      )}

      {showReleaseModal && selectedTransaction && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-card-box border-collection">
            <h2>Confirm Collection</h2>
            <div className="modal-receipt-summary-well">
              <p><strong>Item:</strong> {selectedTransaction.item_name}</p>
              <p><strong>Buyer:</strong> {selectedTransaction.buyer_name}</p>
              <p><strong>Time:</strong> {new Date(selectedTransaction.booking_time).toLocaleString()}</p>
            </div>
            <div className="modal-compliance-checkbox-container-well">
              <label className="checkbox-row-line">
                <input type="checkbox" id="verifyId" /> 
                <span>I confirm that I have verified the buyer's ID</span>
              </label>
              <label className="checkbox-row-line">
                <input type="checkbox" id="verifyItem" /> 
                <span>The item condition matches the recorded notes</span>
              </label>
            </div>
            <div className="modal-actions-row-line">
              <button onClick={() => setShowReleaseModal(false)} className="btn-modal-dismiss">Cancel</button>
              <button onClick={() => { 
                handleUpdateBookingStatus(selectedTransaction.booking_id, 'completed', selectedTransaction.transaction_id, 'collection');
                setShowReleaseModal(false);
              }} className="btn-modal-execute collection">Confirm Collection</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffDashboard;