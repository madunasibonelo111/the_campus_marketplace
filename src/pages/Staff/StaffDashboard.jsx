import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";

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

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

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

    loadData();
  }, []);

  const handleConfirmReceipt = async (transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handleConfirmRelease = async (transaction) => {
    setSelectedTransaction(transaction);
    setShowReleaseModal(true);
  };

  const handleUpdateBookingStatus = async (bookingId, status, transactionId, type) => {
  try {
    // Update the booking status in the facility_bookings table
    const { error: bookingError } = await supabase
      .from('facility_bookings')
      .update({ status: status }) // status is usually 'confirmed' or 'completed'
      .eq('id', bookingId);

    if (bookingError) throw bookingError;

    
    let newTransactionStatus = '';
    
    if (status === 'completed') {
      // If it was a drop-off, the item is now in safe-zone custody 
      if (type === 'drop_off') {
        newTransactionStatus = 'item_in_custody'; 
      } 
      // If it was a collection, the entire deal is finished 
      else if (type === 'collection') {
        newTransactionStatus = 'completed';
      }

      if (newTransactionStatus) {
        const { error: txError } = await supabase
          .from('transactions')
          .update({ 
            status: newTransactionStatus,
            updated_at: new Date().toISOString() 
          })
          .eq('id', transactionId);

        if (txError) throw txError;
      }
    }

    // Refresh local states instantly inside handleUpdateBookingStatus
    alert(`Success: Staff has verified the ${type.replace('_', ' ')}.`);
    

    setPendingReceipts(prev => prev.filter(b => b.id !== bookingId));
    setPendingReleases(prev => prev.filter(b => b.id !== bookingId));

  } catch (error) {
    console.error('Error in staff verification flow:', error);
    alert('Failed to update status. Please check database connectivity.');
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#666' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '24px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Welcome Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '40px 30px', 
        borderRadius: '20px', 
        marginBottom: '30px', 
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', fontSize: '200px', opacity: '0.1' }}>🏫</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '600' }}>Campus Marketplace</h1>
              <p style={{ margin: '8px 0 0', opacity: '0.9' }}>Staff Management Portal</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', opacity: '0.9' }} data-testid="current-time">{currentTime}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ margin: '0', fontSize: '24px', fontWeight: '500' }} data-testid="greeting">
              {getGreeting()}, {staffName || 'Staff Member'}! 👋
            </h2>
            <p style={{ margin: '8px 0 0', opacity: '0.9' }}>
              Here's what's happening with your transactions today
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#333', fontSize: '18px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div 
            data-testid="manage-dropoffs-card"
            style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: '24px',
              cursor: 'pointer',
              transition: 'transform 0.3s, box-shadow 0.3s',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#28a745';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onClick={() => navigate('/staff/dropoffs')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px' }}>📦</div>
              <div>
                <h3 style={{ margin: 0, color: '#333' }}>Manage Drop-offs</h3>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>Schedule & confirm seller drop-offs</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#28a745', fontWeight: '500' }}>Manage →</span>
              {pendingReceipts.length > 0 && (
                <span style={{ background: '#28a745', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>
                  {pendingReceipts.length} pending
                </span>
              )}
            </div>
          </div>

          <div 
            data-testid="manage-collections-card"
            style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: '24px',
              cursor: 'pointer',
              transition: 'transform 0.3s, box-shadow 0.3s',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#007bff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onClick={() => navigate('/staff/collections')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px' }}>🎁</div>
              <div>
                <h3 style={{ margin: 0, color: '#333' }}>Manage Collections</h3>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>Schedule & confirm buyer collections</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#007bff', fontWeight: '500' }}>Manage →</span>
              {pendingReleases.length > 0 && (
                <span style={{ background: '#007bff', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>
                  {pendingReleases.length} pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Pending Drop-offs</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745' }}>{pendingReceipts.length}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Awaiting seller drop-off</div>
            </div>
            <div style={{ fontSize: '48px' }}>📥</div>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Pending Collections</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>{pendingReleases.length}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Ready for buyer pickup</div>
            </div>
            <div style={{ fontSize: '48px' }}>📤</div>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px', borderRadius: '16px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>Total Appointments</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{pendingReceipts.length + pendingReleases.length}</div>
              <div style={{ fontSize: '12px', opacity: '0.9', marginTop: '8px' }}>Require your attention</div>
            </div>
            <div style={{ fontSize: '48px' }}>⚡</div>
          </div>
        </div>
      </div>

      {/* Today's Schedule Section */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0', fontSize: '20px' }}>Today's Schedule</h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>Upcoming drop-offs and collections</p>
          </div>
          <div style={{ fontSize: '24px' }}>📅</div>
        </div>
        
        {pendingReceipts.length === 0 && pendingReleases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <p>No appointments scheduled for today</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {pendingReceipts.slice(0, 3).map(booking => (
              <div key={booking.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px' }}>📦</div>
                  <div>
                    <div style={{ fontWeight: '500' }}>{booking.item_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Drop-off by {booking.seller_name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <button 
                    onClick={() => handleConfirmReceipt(booking)}
                    style={{ background: '#28a745', color: 'white', padding: '4px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ))}
            {pendingReleases.slice(0, 3).map(booking => (
              <div key={booking.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px' }}>🎁</div>
                  <div>
                    <div style={{ fontWeight: '500' }}>{booking.item_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Collection by {booking.buyer_name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <button 
                    onClick={() => handleConfirmRelease(booking)}
                    style={{ background: '#007bff', color: 'white', padding: '4px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h2>Confirm Drop-off</h2>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
              <p><strong>Item:</strong> {selectedTransaction.item_name}</p>
              <p><strong>Seller:</strong> {selectedTransaction.seller_name}</p>
              <p><strong>Time:</strong> {new Date(selectedTransaction.booking_time).toLocaleString()}</p>
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
              <button onClick={() => setShowReceiptModal(false)} style={{ padding: '10px 20px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { 
        
                handleUpdateBookingStatus(
                  selectedTransaction.booking_id, 
                  'completed', 
                  selectedTransaction.transaction_id, 
                  'drop_off'
                );
                setShowReceiptModal(false);
              }} style={{ background: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Confirm Drop-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Modal */}
      {showReleaseModal && selectedTransaction && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h2>Confirm Collection</h2>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
              <p><strong>Item:</strong> {selectedTransaction.item_name}</p>
              <p><strong>Buyer:</strong> {selectedTransaction.buyer_name}</p>
              <p><strong>Time:</strong> {new Date(selectedTransaction.booking_time).toLocaleString()}</p>
            </div>
            <div style={{ marginBottom: '24px', padding: '16px', background: '#e7f3ff', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                <input type="checkbox" id="verifyId" style={{ width: '18px', height: '18px' }} /> 
                <span>I confirm that I have verified the buyer's ID</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" id="verifyItem" style={{ width: '18px', height: '18px' }} /> 
                <span>The item condition matches the recorded notes</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReleaseModal(false)} style={{ padding: '10px 20px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { 
                // ✅ FIX: Pass all 4 parameters (booking_id, status, transaction_id, and type)
                handleUpdateBookingStatus(
                  selectedTransaction.booking_id, 
                  'completed', 
                  selectedTransaction.transaction_id, 
                  'collection'
                );
                setShowReleaseModal(false);
              }} style={{ background: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Confirm Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;