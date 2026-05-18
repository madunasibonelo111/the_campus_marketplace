// src/pages/Staff/CollectionManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";
import "./CollectionManagement.css";

const CollectionManagement = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);

  // Verification Checklist State
  const [verifyBuyerId, setVerifyBuyerId] = useState(false);
  const [verifyConditionNotes, setVerifyConditionNotes] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
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
        .eq('booking_type', 'collection')
        .eq('status', 'pending')
        .order('booking_date', { ascending: true });

      if (error) throw error;

      const formattedCollections = (data || []).map(booking => ({
        id: booking.id,
        transaction_id: booking.transaction_id,
        item_name: booking.transactions?.listings?.title || "Marketplace Item",
        buyer_name: booking.transactions?.buyer?.name || "Campus Buyer",
        seller_name: booking.transactions?.seller?.name || "Campus Seller",
        amount: booking.transactions?.total_amount || 0,
        date: booking.booking_date
      }));

      setCollections(formattedCollections);
    } catch (err) {
      console.error("Error fetching collections:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRelease = (collection) => {
    setSelectedCollection(collection);
    setVerifyBuyerId(false);
    setVerifyConditionNotes(false);
    setShowModal(true);
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!verifyBuyerId || !verifyConditionNotes) {
      alert("⚠️ Verification Pending: Please fulfill all clearance checklists before item release dispatch.");
      return;
    }

    try {
      const { error: bookingError } = await supabase
        .from('facility_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      if (selectedCollection?.transaction_id && newStatus === 'completed') {
        const { error: txError } = await supabase
          .from('transactions')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCollection.transaction_id);

        if (txError) throw txError;
      }

      
      setShowModal(false);
      fetchCollections();
    } catch (err) {
      console.error("Collection release execution failure:", err);
      alert("Verification system failed to process drop: " + err.message);
    }
  };

  return (
    <div className="collection-mgmt-page">
      <div className="mgmt-header-action-bar">
        <button onClick={() => navigate('/staff')} className="mgmt-back-btn">← Back to Staff Desk</button>
        <h1>Collection Handout Desk</h1>
      </div>
      
      <div className="mgmt-scroll-content">
        <div className="mgmt-panel-card">
          <div className="panel-headline-group">
            <h2>Active Pickup Dispatches</h2>
            <p className="subtitle">Verify student identity clearance below to authorize secure vault removals.</p>
          </div>

          {loading ? (
            <div className="mgmt-loading-container">
              <div className="mgmt-spinner"></div>
              <p>Syncing secure queue logs...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="mgmt-empty-state">
              <span className="empty-icon">📤</span>
              <h3>Dispatch Queue Clear</h3>
              <p>No student collection pick-ups are pending at the desk container right now.</p>
            </div>
          ) : (
            <div className="queue-list-container">
              {collections.map((c) => (
                <div key={c.id} className="queue-item-strip collection-theme">
                  <div className="strip-main-content">
                    <div className="strip-top">
                      <h3>Dispatch: {c.item_name}</h3>
                      <span className="queue-pill collection">Ready For Handout</span>
                    </div>
                    <div className="strip-meta-grid">
                      <p>Buyer: <strong>{c.buyer_name}</strong></p>
                      <p>Seller: <strong>{c.seller_name}</strong></p>
                      <p>Paid Balance: <strong className="gold-text">R{c.amount.toFixed(2)}</strong></p>
                      <p>Appointment: <strong>{new Date(c.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong></p>
                    </div>
                    <button className="open-gate-btn collection" onClick={() => handleOpenRelease(c)}>
                      🔐 Authenticate & Release Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && selectedCollection && (
        <div className="modal-overlay">
          <div className="modal-content-box collection-accent">
            <div className="modal-header-banner">
              <h2>Security Clearance Checklist</h2>
              <p>Confirm student documentation matching details before extracting packages out of custody holdings.</p>
            </div>
            
            <div className="modal-body-form">
              <div className="checklist-card-section collection">
                <h4>Mandatory Dispatch Verification</h4>
                <label className="checkbox-form-row">
                  <input type="checkbox" checked={verifyBuyerId} onChange={(e) => setVerifyBuyerId(e.target.checked)} />
                  <div className="checkbox-custom-text text-collection">
                    <strong>Verify Buyer Identification</strong>
                    <span>I confirm that I have verified the arriving buyer's student ID card matches.</span>
                  </div>
                </label>
                
                <label className="checkbox-form-row">
                  <input type="checkbox" checked={verifyConditionNotes} onChange={(e) => setVerifyConditionNotes(e.target.checked)} />
                  <div className="checkbox-custom-text text-collection">
                    <strong>Accept Desk Quality Report</strong>
                    <span>I verify the package condition matches the logged registration condition states.</span>
                  </div>
                </label>
              </div>
              <p style={{ margin: 0, padding: '0 4px', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                💡 <em>Note:</em> Confirming this transaction updates the buyer's history listing status immediately to lowercase 'completed'.
              </p>
            </div>

            <div style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} className="btn-modal-close">Cancel</button>
              <button 
                onClick={() => handleUpdateStatus(selectedCollection.id, 'completed')} 
                className="btn-modal-submit collection"
                disabled={!verifyBuyerId || !verifyConditionNotes}
              >
                🚀 Authorize Release Handover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionManagement;