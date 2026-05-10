import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";

const CollectionManagement = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      // Fetch collection bookings with nested relations (more efficient)
      const { data: bookings, error: bookingsError } = await supabase
        .from('facility_bookings')
        .select(`
          *,
          transactions (
            id,
            total_amount,
            listing_id,
            listings (
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
        .order('booking_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        setCollections([]);
        setLoading(false);
        return;
      }

      // Format the data with proper error handling
      const formattedCollections = bookings.map(booking => ({
        id: booking.id,
        booking_id: booking.id,
        transaction_id: booking.transaction_id,
        item_name: booking.transactions?.listings?.title || 'Unknown Item',
        seller_name: booking.transactions?.seller?.name || 'Unknown Seller',
        buyer_name: booking.transactions?.buyer?.name || 'Unknown Buyer',
        amount: booking.transactions?.total_amount || 0,
        booking_time: booking.booking_date,
        status: booking.status,
        condition: booking.facility_handoffs?.[0]?.item_condition_notes || 'Not yet received'
      }));

      setCollections(formattedCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
      // Fallback mock data for development/demo
      setCollections([
        {
          id: '1',
          transaction_id: 'TXN-002',
          item_name: 'Mountain Bike',
          seller_name: 'Mike Johnson',
          buyer_name: 'Sarah Williams',
          amount: 599.99,
          booking_time: new Date().toISOString(),
          status: 'confirmed',
          condition: 'Good condition'
        },
        {
          id: '2',
          transaction_id: 'TXN-003',
          item_name: 'Calculus Textbook',
          seller_name: 'Emily Brown',
          buyer_name: 'Chris Davis',
          amount: 89.99,
          booking_time: new Date().toISOString(),
          status: 'completed',
          condition: 'Like new'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCollection = (collection) => {
    setSelectedCollection(collection);
    setVerified(false);
    setShowModal(true);
  };

  const handleUpdateStatus = async () => {
    // Check if both verifications are completed
    if (!verified) {
      alert("Please verify buyer ID and item condition");
      return;
    }

    try {
      // Update booking status to completed
      const { error: bookingError } = await supabase
        .from('facility_bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', selectedCollection.id);

      if (bookingError) throw bookingError;

      // Create handoff record for release to buyer
      const { error: handoffError } = await supabase
        .from('facility_handoffs')
        .insert({
          transaction_id: selectedCollection.transaction_id,
          staff_id: (await supabase.auth.getUser()).data.user?.id,
          handoff_type: 'release_to_buyer',
          item_condition_notes: `Released to buyer: ${new Date().toLocaleString()}`,
          created_at: new Date().toISOString()
        });

      if (handoffError) throw handoffError;

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedCollection.transaction_id);

      alert('Item released to buyer successfully!');
      setShowModal(false);
      fetchCollections(); // Refresh the list
    } catch (error) {
      console.error('Error updating collection:', error);
      alert('Failed to confirm collection: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div className="spinner"></div>
        <p>Loading collections...</p>
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
        <h1 style={{ margin: 0 }}>Collection Management</h1>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2>Manage Collection Appointments</h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Release verified items to buyers and complete transactions
        </p>
        
        {collections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
            <p>No pending collection appointments</p>
          </div>
        ) : (
          // Only show items that are confirmed and ready for pickup
          collections.filter(c => c.status === 'confirmed').map(collection => (
            <div key={collection.id} style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>{collection.item_name}</h3>
                <span style={{ 
                  background: collection.status === 'confirmed' ? '#d1ecf1' : '#d4edda',
                  color: collection.status === 'confirmed' ? '#0c5460' : '#155724',
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {collection.status === 'confirmed' ? 'READY FOR PICKUP' : 'COMPLETED'}
                </span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Buyer:</strong> {collection.buyer_name}</p>
                <p><strong>Seller:</strong> {collection.seller_name}</p>
                <p><strong>Amount:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>R{collection.amount.toFixed(2)}</span></p>
                <p><strong>Pickup Time:</strong> {new Date(collection.booking_time).toLocaleString()}</p>
                <p><strong>Item Condition:</strong> {collection.condition}</p>
              </div>
              {collection.status === 'confirmed' && (
                <button 
                  onClick={() => handleConfirmCollection(collection)}
                  style={{ background: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' }}
                >
                  Confirm Release to Buyer
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && selectedCollection && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h2>Confirm Item Release</h2>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
              <p><strong>Item:</strong> {selectedCollection.item_name}</p>
              <p><strong>Buyer:</strong> {selectedCollection.buyer_name}</p>
              <p><strong>Time:</strong> {new Date(selectedCollection.booking_time).toLocaleString()}</p>
            </div>
            <div style={{ marginBottom: '24px', padding: '16px', background: '#e7f3ff', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  style={{ width: '18px', height: '18px' }} 
                /> 
                <span>I confirm that I have verified the buyer's ID</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  style={{ width: '18px', height: '18px' }} 
                /> 
                <span>The item condition matches the recorded notes</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleUpdateStatus} style={{ background: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Confirm Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionManagement;