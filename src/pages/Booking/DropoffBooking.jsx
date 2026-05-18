import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./DropoffBooking.css";

export default function DropoffBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const [transaction, setTransaction] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [facilityConfig, setFacilityConfig] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        navigate("/auth");
      }
    };
    getUser();
  }, [navigate]);

  useEffect(() => {
    if (location.state?.transactionId) {
      fetchTransaction(location.state.transactionId);
    } else {
      const lastTransactionId = localStorage.getItem('lastTransactionId');
      if (lastTransactionId) {
        fetchTransaction(lastTransactionId);
      } else {
        navigate('/basket');
      }
    }
  }, [location]);

  useEffect(() => {
    if (transaction) {
      fetchFacilityConfig();
      fetchAvailableSlots();
    }
  }, [transaction]);

  const fetchTransaction = async (transactionId) => {
    try {
      console.log("Booking screen loading transaction ID:", transactionId);
      
      // Query the exact columns that exist in your Supabase schema
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          type,
          status,
          offer_amount,
          offer_status,
          created_at,
          completed_at,
          payments (
            amount
          )
        `)
        .eq('id', transactionId)
        .single();

      if (transactionError) throw transactionError;
      if (!transactionData) {
        throw new Error("Transaction not found");
      }

      // Fetch listing details
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          condition,
          listing_type,
          user_id
        `)
        .eq('id', transactionData.listing_id)
        .single();

      if (listingError) {
        console.error("Listing fetch error:", listingError);
      }

      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', transactionData.seller_id)
        .single();

      if (sellerError) {
        console.error("Seller fetch error:", sellerError);
      }

      // Fetch buyer profile
      const { data: buyerData, error: buyerError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', transactionData.buyer_id)
        .single();

      if (buyerError) {
        console.error("Buyer fetch error:", buyerError);
      }

      // Calculate paid math safely from the sub-array payments relation match
      const totalAmount = transactionData.offer_amount || listingData?.price || 0;
      const totalPaid = transactionData.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Combine into the correct complete structure
      const completeTransaction = {
        id: transactionData.id,
        listing_id: transactionData.listing_id,
        buyer_id: transactionData.buyer_id,
        seller_id: transactionData.seller_id,
        type: transactionData.type,
        status: transactionData.status,
        total_amount: totalAmount,
        amount_paid: totalPaid,
        remaining_balance: totalAmount - totalPaid,
        listings: listingData || { title: "Unknown Item", price: 0 },
        seller: sellerData || { name: "Unknown Seller" },
        buyer: buyerData || { name: "Unknown Buyer" }
      };

      setTransaction(completeTransaction);
    } catch (err) {
      console.error("Error fetching transaction:", err);
      alert("Error loading transaction details: " + err.message);
      navigate('/basket');
    }
  };

  const fetchFacilityConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('facility_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFacilityConfig(data);
      } else {
        // Default config if none exists
        setFacilityConfig({
          slot_duration_minutes: 30,
          max_capacity_per_slot: 5,
          open_time: '09:00',
          close_time: '17:00'
        });
      }
    } catch (err) {
      console.error("Error fetching facility config:", err);
      setFacilityConfig({
        slot_duration_minutes: 30,
        max_capacity_per_slot: 5,
        open_time: '09:00',
        close_time: '17:00'
      });
    }
  };

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const slots = [];
      const maxCapacity = facilityConfig?.max_capacity_per_slot || 5;
      const slotDuration = facilityConfig?.slot_duration_minutes || 30;
      const [openHour, openMinute] = (facilityConfig?.open_time || '09:00').split(':');
      const [closeHour, closeMinute] = (facilityConfig?.close_time || '17:00').split(':');

      // Set time boundaries for our batch query window (next 7 days)
      const executionEndDay = new Date(today);
      executionEndDay.setDate(today.getDate() + 7);

      // Set up the transactional drop-off scheduling floor constraints
      const baselineDeadline = transaction?.created_at ? new Date(transaction.created_at) : new Date();
      const dropoffDeadline = new Date(baselineDeadline);
      dropoffDeadline.setDate(dropoffDeadline.getDate() + 3); 
      dropoffDeadline.setHours(23, 59, 59, 999);

      //Gather all booking slots for the week in ONE query trip
      const { data: activeBookings, error: batchErr } = await supabase
        .from('facility_bookings')
        .select('booking_date')
        .gte('booking_date', today.toISOString())
        .lte('booking_date', executionEndDay.toISOString())
        .in('status', ['pending', 'confirmed']);

      if (batchErr) throw batchErr;

      // Group reservation indices instantly into an in-memory counter object
      const bookingCountsMap = {};
      (activeBookings || []).forEach(b => {
        const isoString = new Date(b.booking_date).toISOString();
        bookingCountsMap[isoString] = (bookingCountsMap[isoString] || 0) + 1;
      });

      // Generate slots in-memory instantly without network calls inside the loops
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        date.setHours(0, 0, 0, 0);
        
        // Skip weekends
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        let currentTime = new Date(date);
        currentTime.setHours(parseInt(openHour), parseInt(openMinute), 0);
        
        const closeTime = new Date(date);
        closeTime.setHours(parseInt(closeHour), parseInt(closeMinute), 0);
        
        while (currentTime < closeTime) {
          const slotEnd = new Date(currentTime);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
          
          // Rule Validation check: Must be on or before the drop-off limit deadline
          if (currentTime <= dropoffDeadline) {
            const currentSlotISO = currentTime.toISOString();
            
            // Look up counts directly out of memory instead of hitting Supabase again!
            const bookedCount = bookingCountsMap[currentSlotISO] || 0;
            const availableSpots = maxCapacity - bookedCount;
            
            if (availableSpots > 0) {
              slots.push({
                date: date.toISOString().split('T')[0],
                startTime: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                endTime: slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                datetime: currentSlotISO,
                available: availableSpots,
                dayName: date.toLocaleDateString([], { weekday: 'long' }),
                monthDay: date.toLocaleDateString([], { month: 'short', day: 'numeric' })
              });
            }
          }
          
          currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
        }
      }
      
      // Sort slots cleanly by datetime
      slots.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      setAvailableSlots(slots);
    } catch (err) {
      console.error("Error optimizing and fetching drop-off slots:", err);
    } finally {
      setLoading(false);
    }
  };



const bookDropoffSlot = async () => {
    if (!selectedSlot || !transaction || !user) return;

    try {
      setLoading(true);

      const bookingPayload = {
        transaction_id: transaction.id,
        user_id: user.id,
        booking_type: 'drop_off',
        booking_date: selectedSlot.datetime, 
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('facility_bookings')
        .insert([bookingPayload])
        .select()
        .single();

      if (error) throw error;
      setBooking(data);

      // 1. Update the parent transaction status to 'pending_dropoff'
      await supabase
        .from('transactions')
        .update({ 
          status: 'pending_dropoff',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      //2.  Re-calculate capacity limits using matching timestamp parameters
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

      

    } catch (err) {
      console.error("Booking error pipeline fault:", err);
      alert("Failed to confirm drop-off slot: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  
if (booking && selectedSlot) {
  return (
    <div className="dropoff-page-wrapper">
      <div className="dropoff-booking">
        <div className="booking-container confirmation-center-view">
          
          <div className="success-banner-header">
            <div className="success-icon">🎉</div>
            <h2>Drop-off Slot Secured!</h2>
            <p>Your appointment has been logged successfully into our campus facility queue.</p>
          </div>

          <div className="confirmation-receipt-body">
            <h3>Fulfillment Details</h3>
            
            <div className="receipt-row">
              <span>Item Title:</span>
              <strong>{transaction?.listings?.title || 'Marketplace Asset'}</strong>
            </div>
            
            <div className="receipt-row">
              <span>Scheduled Date:</span>
              <strong>{selectedSlot.dayName}, {selectedSlot.monthDay}</strong>
            </div>
            
            <div className="receipt-row">
              <span>Arrival Time Window:</span>
              <strong>{selectedSlot.startTime} - {selectedSlot.endTime}</strong>
            </div>
            
            <div className="receipt-row">
              <span>Facility Intake Zone:</span>
              <strong>Student Center (Safe Zone, Room 101)</strong>
            </div>
          </div>

          <div className="confirmation-action-footer">
            <button className="btn-view-history" onClick={() => navigate("/history")}>
              📋 View My Transactions
            </button>
            <button className="btn-continue" onClick={() => navigate("/basket")}>
              🛒 Continue Shopping
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

  return (
    <div className="dropoff-page-wrapper">
      <div className="dropoff-booking">
        <div className="booking-container">
          
          {/* Top Primary Fixed Title Block Banner */}
          <div className="booking-header">
            <h1>Book Drop-off Slot</h1>
            <p>Schedule a time to drop off your item at the Campus Trade Facility</p>
          </div>

          {/* Dynamic Balanced Split Panel Workspace Dashboard Workspace Layout */}
          <div className="booking-workspace-split">
            
            {/* COLUMN SIDEBAR LEFT SIDE: Metadata transaction cards, rules, checklists */}
            <div className="workspace-info-pane">
              {transaction && (
                <div className="transaction-summary">
                  <h3>Transaction Summary</h3>
                  <div className="summary-details">
                    <div className="summary-icon">📦</div>
                    <div className="summary-info">
                      <div className="summary-row">
                        <span>Item:</span>
                        <strong>{transaction.listings?.title || 'Unknown Item'}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Seller:</span>
                        <strong>{transaction.seller?.name || 'Unknown Seller'}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Amount Paid:</span>
                        <span className="amount">R{transaction.total_amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="summary-row">
                        <span>Status:</span>
                        <span className="status-badge success">
                          {transaction.status === 'pending_dropoff' ? 'Drop-off Booked ✓' : 'Payment Completed ✓'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onboarding Checklist Card Panels */}
              <div className="next-steps">
                <h4>📋 Next Steps:</h4>
                <ul>
                  <li>📦 Bring your item to the Campus Trade Facility</li>
                  <li>🆔 Bring your student ID for verification</li>
                  <li>⏰ Arrive 5 minutes before your scheduled time</li>
                  <li>📱 Show this confirmation to staff upon arrival</li>
                </ul>
              </div>

              <div className="important-info">
                <h4>⚠️ Important Information:</h4>
                <ul>
                  <li>Please ensure your item is in the condition described in the listing</li>
                  <li>Late arrivals may result in rescheduling</li>
                  <li>The facility staff will verify and accept your item</li>
                </ul>
              </div>
            </div>

            {/* COLUMN SIDEBAR RIGHT SIDE: Independent Viewport Scrolling Calendar Picker */}
            <div className="workspace-picker-pane">
              <div className="slot-selection">
                <h3>Select a Drop-off Time</h3>
                <p className="slot-info">
                  📍 Location: Campus Trade Facility (Student Center, Room 101)<br />
                  🕒 Operating Hours: {facilityConfig?.open_time || '09:00'} - {facilityConfig?.close_time || '17:00'} (Monday-Friday)
                </p>
                
                {loading ? (
                  <div className="loading-slots">
                    <div className="spinner"></div>
                    <p>Loading available time slots...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="slots-grid">
                    {availableSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={`slot-card ${selectedSlot === slot ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="slot-day">{slot.dayName}</div>
                        <div className="slot-date">{slot.monthDay}</div>
                        <div className="slot-time">{slot.startTime} - {slot.endTime}</div>
                        <div className="slot-availability">
                          {slot.available} open spots
                        </div>
                        {selectedSlot === slot && <div className="selected-check">✓ Selected</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-slots">
                    <div className="no-slots-icon">📅</div>
                    <p>No available slots found for the next 7 days</p>
                    <p className="no-slots-sub">Please check back later or contact facility staff</p>
                  </div>
                )}
              </div>
            </div>

          </div> {/* End dynamic dashboard split component layout frame wrapper */}

          {/* Permanently Anchored Base Controls Navigation Bar Base Sheet Footer */}
          <div className="booking-footer">
            <button onClick={() => navigate(-1)} className="btn-back">
              ← Back
            </button>
            <button 
              onClick={bookDropoffSlot} 
              className="btn-book"
              disabled={!selectedSlot || loading}
            >
              {loading ? 'Booking...' : 'Confirm Drop-off Slot'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}