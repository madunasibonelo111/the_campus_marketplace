// src/pages/Staff/DropoffManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";

const DropoffManagement = () => {
  const navigate = useNavigate();
  const [dropoffs, setDropoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDropoff, setSelectedDropoff] = useState(null);

  useEffect(() => {
    fetchDropoffs();
  }, []);

  const fetchDropoffs = async () => {
    try {
      const { data, error } = await supabase
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
          )
        `)
        .eq('booking_type', 'drop_off')
        .order('booking_date', { ascending: true });

      if (error) throw error;

      const formattedDropoffs = data.map(booking => ({
        id: booking.id,
        transaction_id: booking.transaction_id,
        item_name: booking.transactions?.listings?.title || 'Unknown Item',
        seller_name: booking.transactions?.seller?.name || 'Unknown Seller',
        buyer_name: booking.transactions?.buyer?.name || 'Unknown Buyer',
        amount: booking.transactions?.total_amount || 0,
        booking_time: booking.booking_date,
        status: booking.status
      }));

      setDropoffs(formattedDropoffs);
    } catch (error) {
      console.error('Error fetching dropoffs:', error);
      // Mock data
      setDropoffs([
        {
          id: '1',
          transaction_id: 'TXN-001',
          item_name: 'Vintage Leather Boots',
          seller_name: 'John Doe',
          buyer_name: 'Jane Smith',
          amount: 249.99,
          booking_time: new Date().toISOString(),
          status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDropoff = async (dropoff) => {
    setSelectedDropoff(dropoff);
    setShowModal(true);
  };

  const handleUpdateStatus = async (bookingId, status, condition, notes) => {
    try {
      const { error } = await supabase
        .from('facility_bookings')
        .update({ status: status })
        .eq('id', bookingId);

      if (error) throw error;
      
      alert('Drop-off confirmed successfully!');
      setShowModal(false);
      fetchDropoffs();
    } catch (error) {
      console.error('Error updating dropoff:', error);
      alert('Failed to confirm drop-off');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading drop-offs...</div>
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
        <p style={{ color: '#666', marginBottom: '24px' }}>Schedule, confirm, and track item drop-offs from sellers</p>
        
        {dropoffs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p>No drop-off appointments</p>
          </div>
        ) : (
          dropoffs.map(dropoff => (
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
                  {dropoff.status.toUpperCase()}
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
                  Confirm Drop-off
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
            <h2>Confirm Drop-off</h2>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
              <p><strong>Item:</strong> {selectedDropoff.item_name}</p>
              <p><strong>Seller:</strong> {selectedDropoff.seller_name}</p>
              <p><strong>Time:</strong> {new Date(selectedDropoff.booking_time).toLocaleString()}</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Item Condition *</label>
              <select id="conditionSelect" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <option>Perfect - Like new</option>
                <option>Good - Minor wear</option>
                <option>Fair - Visible wear</option>
                <option>Poor - Damaged</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Notes</label>
              <textarea id="notesText" rows="3" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => {
                const condition = document.getElementById('conditionSelect').value;
                const notes = document.getElementById('notesText').value;
                handleUpdateStatus(selectedDropoff.id, 'completed', condition, notes);
              }} style={{ background: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Confirm Drop-off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropoffManagement;