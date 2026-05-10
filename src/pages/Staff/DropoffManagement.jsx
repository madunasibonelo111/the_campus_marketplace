import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";

const DropoffManagement = () => {
  const navigate = useNavigate();
  const [dropoffs, setDropoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDropoff, setSelectedDropoff] = useState(null);
  const [condition, setCondition] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');

  useEffect(() => {
    fetchDropoffs();
  }, []);

  const fetchDropoffs = async () => {
    setLoading(true);
    try {
      // Fetch drop-off bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('facility_bookings')
        .select(`
          id,
          transaction_id,
          booking_date,
          status,
          booking_type,
          created_at
        `)
        .eq('booking_type', 'drop_off')
        .order('booking_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        setDropoffs([]);
        setLoading(false);
        return;
      }

      // Fetch transaction details for each booking
      const dropoffsWithDetails = [];
      
      for (const booking of bookings) {
        // Get transaction details
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select(`
            id,
            total_amount,
            listing_id,
            buyer_id,
            seller_id,
            status
          `)
          .eq('id', booking.transaction_id)
          .single();

        if (transactionError) {
          console.error("Error fetching transaction:", transactionError);
          continue;
        }

        // Get listing details
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('title, price')
          .eq('id', transactionData.listing_id)
          .single();

        if (listingError) {
          console.error("Error fetching listing:", listingError);
        }

        // Get seller details
        const { data: sellerData, error: sellerError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', transactionData.seller_id)
          .single();

        if (sellerError) {
          console.error("Error fetching seller:", sellerError);
        }

        // Get buyer details
        const { data: buyerData, error: buyerError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', transactionData.buyer_id)
          .single();

        if (buyerError) {
          console.error("Error fetching buyer:", buyerError);
        }

        dropoffsWithDetails.push({
          id: booking.id,
          booking_id: booking.id,
          transaction_id: booking.transaction_id,
          item_name: listingData?.title || 'Unknown Item',
          seller_name: sellerData?.name || 'Unknown Seller',
          buyer_name: buyerData?.name || 'Unknown Buyer',
          amount: transactionData?.total_amount || 0,
          booking_time: booking.booking_date,
          status: booking.status
        });
      }

      setDropoffs(dropoffsWithDetails);
    } catch (error) {
      console.error('Error fetching dropoffs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDropoff = (dropoff) => {
    setSelectedDropoff(dropoff);
    setCondition('');
    setConditionNotes('');
    setShowModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!condition) {
      alert("Please select item condition");
      return;
    }

    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('facility_bookings')
        .update({ status: 'completed' })
        .eq('id', selectedDropoff.id);

      if (bookingError) throw bookingError;

      // Create handoff record
      const { error: handoffError } = await supabase
        .from('facility_handoffs')
        .insert({
          transaction_id: selectedDropoff.transaction_id,
          staff_id: (await supabase.auth.getUser()).data.user?.id,
          handoff_type: 'receipt_from_seller',
          item_condition_notes: `${condition}: ${conditionNotes}`,
          created_at: new Date().toISOString()
        });

      if (handoffError) throw handoffError;

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'item_received', updated_at: new Date().toISOString() })
        .eq('id', selectedDropoff.transaction_id);

      // Send notification to buyer
      await supabase.from('notifications').insert({
        user_id: selectedDropoff.buyer_id,
        type: 'facility_update',
        title: 'Item Ready for Collection! 🎁',
        message: `Good news! "${selectedDropoff.item_name}" has been received at the facility and verified. It's now ready for collection.`,
        is_read: false,
        created_at: new Date().toISOString()
      });

      alert('Drop-off confirmed successfully!');
      setShowModal(false);
      fetchDropoffs();
    } catch (error) {
      console.error('Error updating dropoff:', error);
      alert('Failed to confirm drop-off: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div className="spinner"></div>
        <p>Loading drop-offs...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/staff')}
          style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ margin: 0 }}>Drop-off Management</h1>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2>Manage Drop-off Appointments</h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>Confirm item receipt from sellers and validate conditions</p>
        
        {dropoffs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p>No pending drop-off appointments</p>
          </div>
        ) : (
          dropoffs.filter(d => d.status === 'pending').map(dropoff => (
            <div key={dropoff.id} style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>{dropoff.item_name}</h3>
                <span style={{ 
                  background: dropoff.status === 'pending' ? '#fff3cd' : '#d4edda',
                  color: dropoff.status === 'pending' ? '#856404' : '#155724',
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {dropoff.status === 'pending' ? 'PENDING RECEIPT' : 'COMPLETED'}
                </span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Seller:</strong> {dropoff.seller_name}</p>
                <p><strong>Buyer:</strong> {dropoff.buyer_name}</p>
                <p><strong>Amount:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>R{dropoff.amount.toFixed(2)}</span></p>
                <p><strong>Scheduled:</strong> {new Date(dropoff.booking_time).toLocaleString()}</p>
              </div>
              {dropoff.status === 'pending' && (
                <button 
                  onClick={() => handleConfirmDropoff(dropoff)}
                  style={{ background: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' }}
                >
                  Confirm Receipt
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && selectedDropoff && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h2>Confirm Item Receipt</h2>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
              <p><strong>Item:</strong> {selectedDropoff.item_name}</p>
              <p><strong>Seller:</strong> {selectedDropoff.seller_name}</p>
              <p><strong>Time:</strong> {new Date(selectedDropoff.booking_time).toLocaleString()}</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Item Condition *</label>
              <select 
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="">Select condition</option>
                <option value="Perfect">Perfect - Like new</option>
                <option value="Good">Good - Minor wear</option>
                <option value="Fair">Fair - Visible wear</option>
                <option value="Poor">Poor - Damaged</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Condition Notes</label>
              <textarea 
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows="3" 
                placeholder="Describe any damages, missing parts, or special observations..."
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpdateStatus} style={{ background: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Confirm Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropoffManagement;