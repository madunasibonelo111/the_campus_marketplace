import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./CollectionBooking.css";

export default function CollectionBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const [transaction, setTransaction] = useState(null);
  const [dropoffDateFloor, setDropoffDateFloor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [facilityConfig, setFacilityConfig] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    const transactionId = location.state?.transactionId || localStorage.getItem('lastTransactionId');
    if (transactionId) {
      loadCollectionPrerequisites(transactionId);
    } else {
      navigate('/history');
    }
  }, [location, facilityConfig]);

  const loadCollectionPrerequisites = async (transactionId) => {
    try {
      setLoading(true);
      
      //  Fetch transaction details
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select(`
          id, listing_id, buyer_id, seller_id, status, offer_amount,
          listings ( id, title, price )
        `)
        .eq('id', transactionId)
        .single();

      if (txErr) throw txErr;

      //  Locate corresponding completed drop_off date to lock lower flight bounds
      const { data: dropoffBooking } = await supabase
        .from('facility_bookings')
        .select('booking_date')
        .eq('transaction_id', transactionId)
        .eq('booking_type', 'drop_off')
        .eq('status', 'completed')
        .maybeSingle();

      let dateFloor = new Date();
      if (dropoffBooking?.booking_date) {
        dateFloor = new Date(dropoffBooking.booking_date);
      }
      setDropoffDateFloor(dateFloor);

      setTransaction({
        id: txData.id,
        item_title: txData.listings?.title || "Marketplace Item",
        amount: txData.offer_amount || txData.listings?.price || 0,
        status: txData.status
      });

      // Get configuration limits
      if (!facilityConfig) {
        const { data: configData } = await supabase
          .from('facility_config')
          .select('*')
          .limit(1)
          .single();
        
        setFacilityConfig(configData || {
          slot_duration_minutes: 30,
          max_capacity_per_slot: 5,
          open_time: '09:00',
          close_time: '17:00'
        });
      }

      if (facilityConfig) {
        await buildValidCollectionSlots(dateFloor);
      }
    } catch (err) {
      console.error("Prerequisite loading breakdown:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildValidCollectionSlots = async (floorDate) => {
    const slots = [];
    const today = new Date();
    const maxCapacity = facilityConfig?.max_capacity_per_slot || 5;
    const slotDuration = facilityConfig?.slot_duration_minutes || 30;
    const [openHour, openMinute] = (facilityConfig?.open_time || '09:00').split(':');
    const [closeHour, closeMinute] = (facilityConfig?.close_time || '17:00').split(':');

    const executionEndDay = new Date(today);
    executionEndDay.setDate(today.getDate() + 7);

    try {
      //Fetch all active appointments in a single batch query
      const { data: activeBookings, error: batchErr } = await supabase
        .from('facility_bookings')
        .select('booking_date')
        .gte('booking_date', today.toISOString())
        .lte('booking_date', executionEndDay.toISOString())
        .in('status', ['pending', 'confirmed']);

      if (batchErr) throw batchErr;

      // Group reservation indices instantly into memory object structures
      const bookingCountsMap = {};
      (activeBookings || []).forEach(b => {
        const isoString = new Date(b.booking_date).toISOString();
        bookingCountsMap[isoString] = (bookingCountsMap[isoString] || 0) + 1;
      });

      // Generate upcoming picker intervals
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);
        
        const dayOfWeek = targetDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
        
        let currentTime = new Date(targetDate);
        currentTime.setHours(parseInt(openHour), parseInt(openMinute), 0);
        
        const closeTime = new Date(targetDate);
        closeTime.setHours(parseInt(closeHour), parseInt(closeMinute), 0);
        
        while (currentTime < closeTime) {
          const slotEnd = new Date(currentTime);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
          
          //CONSTRAINT SECURITY RULE: Must be on or after structural drop-off date
          if (currentTime >= floorDate) {
            const currentSlotISO = currentTime.toISOString();
            const bookedCount = bookingCountsMap[currentSlotISO] || 0;
            const availableSpots = maxCapacity - bookedCount;
            
            if (availableSpots > 0) {
              slots.push({
                date: targetDate.toISOString().split('T')[0],
                startTime: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                endTime: slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                datetime: currentSlotISO,
                available: availableSpots,
                dayName: targetDate.toLocaleDateString([], { weekday: 'long' }),
                monthDay: targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
              });
            }
          }
          currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
        }
      }
      slots.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      setAvailableSlots(slots);
    } catch (e) {
      console.error("Slot mapping error caught:", e);
    }
  };

  const handleCompleteBooking = async () => {
    if (!selectedSlot || !transaction || !user) return;

    try {
      setLoading(true);

      const collectionPayload = {
        transaction_id: transaction.id,
        user_id: user.id,
        booking_type: 'collection',
        booking_date: selectedSlot.datetime, 
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { data: bookingData, error: bookingErr } = await supabase
        .from('facility_bookings')
        .insert([collectionPayload])
        .select()
        .single();

      if (bookingErr) throw bookingErr;
      setBooking(bookingData);

      // 1. Set the transaction status flag parameters to pending_collection
      await supabase
        .from('transactions')
        .update({ 
          status: 'pending_collection',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      // 2. Re-calculate capacity limits using matching timestamp parameters
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);

      const { data: totalBookings } = await supabase
        .from('facility_bookings')
        .select('id')
        .gte('booking_date', startOfToday.toISOString())
        .lte('booking_date', endOfToday.toISOString())
        .in('status', ['pending', 'confirmed', 'completed']);

      const bookedCount = totalBookings ? totalBookings.length : 0;
      const capacityPct = (bookedCount / 40) * 100;
      const dateKeyString = new Date().toISOString().split('T')[0];

      await supabase
        .from('analytics_facility_utilization')
        .upsert({
          check_date: dateKeyString,
          total_slots_available: 40,
          total_slots_booked: bookedCount,
          utilization_percentage: capacityPct
        }, { onConflict: 'check_date' });

    } catch (error) {
      console.error("Booking handler exception encountered:", error);
      alert("Fulfillment error securing collection slot: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (booking) {
    return (
      <div className="collection-page-wrapper">
        <div className="booking-confirmation-view">
          <div className="confirmation-card-layout">
            <div className="success-badge-icon">🎁</div>
            <h1>Collection Slot Reserved!</h1>
            <p>Your items are safely waiting for you in the trading zone vault.</p>
            
            <div className="booking-meta-details">
              <h3>Collection Summary</h3>
              <div className="meta-detail-row"><span>Item:</span><strong>{transaction?.item_title}</strong></div>
              <div className="meta-detail-row"><span>Pickup Day:</span><strong>{selectedSlot.dayName}, {selectedSlot.monthDay}</strong></div>
              <div className="meta-detail-row"><span>Time Window:</span><strong>{selectedSlot.startTime} - {selectedSlot.endTime}</strong></div>
              <div className="meta-detail-row"><span>Location:</span><strong>Campus Safe-Zone Center (Room 101)</strong></div>
            </div>
          </div>
          <div className="action-row-buttons">
            <button onClick={() => navigate('/history')} className="btn-return-history">
              Return to My Transactions
            </button>
          </div>
        </div>
      </div>
    );
  }

 

  return (
    <div className="collection-page-wrapper">
      <div className="collection-booking-panel">
        <div className="panel-container">
          
          {/* Main Top Header Banner */}
          <div className="panel-header">
            <h1>Schedule Buyer Collection</h1>
            <p>Select an inventory pickup time block. Options are filtered to match or follow the seller's physical delivery timestamp.</p>
          </div>

          {/*WORKSPACE SPLIT CONTAINER GRID OVERLAY */}
          <div className="collection-workspace-split">
            
            {/* LEFT SIDE COLUMN SIDEBAR: Metadata info, descriptions and checklists */}
            <div className="collection-info-pane">
              {transaction && (
                <div className="item-summary-box">
                  <h3>Item Metadata</h3>
                  <div className="box-details-grid">
                    <span>Item Title:</span><strong>{transaction.item_title}</strong>
                    <span>Paid Balance:</span><strong className="green-balance">R{transaction.amount.toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <div className="collection-instructions-card">
                <h4>📋 Collection Instructions:</h4>
                <ul>
                  <li>📍 Proceed to the Campus Safe-Zone Center (Room 101) at your designated time.</li>
                  <li>🆔 Present your student ID to the staff member for security clearance.</li>
                  <li>📦 The agent will open the trading zone vault and dispatch your verified item.</li>
                </ul>
              </div>

              <div className="collection-security-notice">
                <h4>⚠️ Security Policy:</h4>
                <ul>
                  <li>Schedules cannot precede the seller's verified drop-off delivery timestamp.</li>
                  <li>Uncollected items after their duration window requires logistical re-scheduling.</li>
                </ul>
              </div>
            </div>

            {/* RIGHT SIDE COLUMN: Interactive scrollable calendar grid */}
            <div className="collection-picker-pane">
              <div className="slots-explorer-section">
                <h3>Available Collection Windows</h3>
                <p>Filtered operating blocks ({facilityConfig?.open_time || '09:00'} - {facilityConfig?.close_time || '17:00'})</p>
                
                {loading ? (
                  <div className="slots-loading-placeholder">
                    <div className="animated-spinner"></div>
                    <p>Calculating valid schedules...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="slots-cards-grid">
                    {availableSlots.map((slot, index) => (
                      <div 
                        key={index} 
                        className={`explorer-slot-card ${selectedSlot === slot ? 'active-selection' : ''}`} 
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="explorer-day">{slot.dayName}</div>
                        <div className="explorer-date">{slot.monthDay}</div>
                        <div className="explorer-time">{slot.startTime} - {slot.endTime}</div>
                        <div className="explorer-spots">{slot.available} open windows</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-slots-error">
                    <p>No collection times available matching safety validation criteria.</p>
                  </div>
                )}
              </div>
            </div>

          </div> {/* End workspace split grid */}

          {/* Locked Absolute Bottom Base Control Footer bar */}
          <div className="panel-action-footer">
            <button onClick={() => navigate(-1)} className="btn-cancel-action">← Cancel</button>
            <button 
              onClick={handleCompleteBooking} 
              className="btn-confirm-action" 
              disabled={!selectedSlot || loading}
            >
              {loading ? 'Processing...' : 'Confirm Collection Appointment'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}