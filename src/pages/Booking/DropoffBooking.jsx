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
      
      // FIX: Query the exact columns that exist in your Supabase schema
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

      // 🚀 PERFORMANCE FIX: Gather all booking slots for the week in ONE query trip
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
  if (!selectedSlot) {
    alert("Please select a drop-off time slot");
    return;
  }

  setLoading(true);
  try {
    // 1. Insert the booking record
    const { data: bookingData, error: bookingError } = await supabase
      .from('facility_bookings')
      .insert({
        transaction_id: transaction.id,
        user_id: user.id,
        booking_type: 'drop_off',
        booking_date: selectedSlot.datetime,
        status: 'pending',
        amount_due: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 2. Send notification to user
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'booking_confirmation',
      title: 'Drop-off Slot Booked! 📦',
      message: `Your drop-off for "${transaction.listings?.title}" has been scheduled for ${selectedSlot.dayName}, ${selectedSlot.monthDay} at ${selectedSlot.startTime}. Please bring your student ID.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    
    // 3. Update transaction table status to pending_dropoff directly using transaction.id
    const { error: txUpdateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'pending_dropoff', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', transaction.id); // Securely use the loaded state id

    if (txUpdateError) throw txUpdateError;

    // 4. Update local state variables so that UI changes immediately
    setTransaction(prev => ({ ...prev, status: 'pending_dropoff' }));
    setBooking(bookingData);
      
  } catch (err) {
    console.error("Error booking slot:", err);
    alert("Failed to book slot: " + err.message);
  } finally {
    setLoading(false);
  }
};


  if (booking) {
    return (
    <div className="dropoff-page-wrapper">
      <div className="booking-confirmation">
        <div className="confirmation-card">
          <div className="success-icon">✅</div>
          <h1>Drop-off Slot Booked!</h1>
          <p>Your drop-off has been scheduled successfully.</p>
          
          <div className="booking-details">
            <h3>Booking Details</h3>
            <div className="detail-row">
              <span>Item:</span>
              <strong>{transaction?.listings?.title || 'Unknown Item'}</strong>
            </div>
            <div className="detail-row">
              <span>Date:</span>
              <strong>{selectedSlot.dayName}, {selectedSlot.monthDay}</strong>
            </div>
            <div className="detail-row">
              <span>Time:</span>
              <strong>{selectedSlot.startTime} - {selectedSlot.endTime}</strong>
            </div>
            <div className="detail-row">
              <span>Location:</span>
              <strong>Campus Trade Facility (Student Center, Room 101)</strong>
            </div>
            <div className="detail-row">
              <span>Booking ID:</span>
              <strong>#{booking.id.slice(0, 8)}</strong>
              </div>
            </div>
          </div>

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

          <div className="action-buttons">
            <button onClick={() => navigate('/history')} className="btn-view-history">
              View My Transactions
            </button>
            <button onClick={() => navigate('/basket')} className="btn-continue">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dropoff-page-wrapper">
    <div className="dropoff-booking">
      <div className="booking-container">
        <div className="booking-header">
          <h1>Book Drop-off Slot</h1>
          <p>Schedule a time to drop off your item at the Campus Trade Facility</p>
        </div>
        </div>

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
                  <span>{transaction.seller?.name || 'Unknown Seller'}</span>
                </div>
                <div className="summary-row">
                  <span>Amount Paid:</span>
                  <span className="amount">R{transaction.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
               
                <div className="summary-row">
                  <span>Status:</span>
                  <span className={`status-badge ${transaction.status}`}>
                    {transaction.status === 'pending_dropoff' ? 'Drop-off Booked ✓' : 'Payment Completed ✓'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    {slot.available} {slot.available === 1 ? 'spot' : 'spots'} available
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
  );
}