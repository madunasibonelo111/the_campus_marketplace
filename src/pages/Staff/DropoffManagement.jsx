import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/supabase/supabaseClient";
import "./DropoffManagement.css";

const DropoffManagement = () => {
  const navigate = useNavigate();
  const [dropoffs, setDropoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDropoff, setSelectedDropoff] = useState(null);
  
  // Verification Checklist State
  const [verifyId, setVerifyId] = useState(false);
  const [verifyCondition, setVerifyCondition] = useState(false);
  const [condition, setCondition] = useState("Perfect - Like new");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchDropoffs();
  }, []);

  const fetchDropoffs = async () => {
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
        .eq('booking_type', 'drop_off')
        .eq('status', 'pending')
        .order('booking_date', { ascending: true });

      if (error) throw error;

      const formattedDropoffs = (data || []).map(booking => ({
        id: booking.id,
        transaction_id: booking.transaction_id,
        item_name: booking.transactions?.listings?.title || "Marketplace Item",
        seller_name: booking.transactions?.seller?.name || "Campus Seller",
        buyer_name: booking.transactions?.buyer?.name || "Campus Buyer",
        amount: booking.transactions?.total_amount || 0,
        date: booking.booking_date
      }));

      setDropoffs(formattedDropoffs);
    } catch (err) {
      console.error("Error fetching dropoffs:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspection = (dropoff) => {
    setSelectedDropoff(dropoff);
    setVerifyId(false);
    setVerifyCondition(false);
    setCondition("Perfect - Like new");
    setNotes("");
    setShowModal(true);
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!verifyId || !verifyCondition) {
      alert("⚠️ Verification Pending: Please confirm all mandatory checklist items before completing intake.");
      return;
    }

    try {
      const { error: bookingError } = await supabase
        .from('facility_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      if (selectedDropoff?.transaction_id && newStatus === 'completed') {
        const { error: txError } = await supabase
          .from('transactions')
          .update({ 
            status: 'item_in_custody', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', selectedDropoff.transaction_id);

        if (txError) throw txError;
      }

      
      setShowModal(false);
      fetchDropoffs();
    } catch (err) {
      console.error("Vault entry failure:", err);
      alert("Failed to process transaction: " + err.message);
    }
  };

  return (
    <div className="dropoff-mgmt-page">
      <div className="mgmt-header-action-bar">
        <button onClick={() => navigate('/staff')} className="mgmt-back-btn">← Back to Staff Desk</button>
        <h1>Drop-off Intake Desk</h1>
      </div>

      <div className="mgmt-scroll-content">
        <div className="mgmt-panel-card">
          <div className="panel-headline-group">
            <h2>Pending Safe-Zone Deliveries</h2>
            <p className="subtitle">Audit physical condition assets before indexing items into facility vaults.</p>
          </div>

          {loading ? (
            <div className="mgmt-loading-container">
              <div className="mgmt-spinner"></div>
              <p>Accessing facility ledger indexes...</p>
            </div>
          ) : dropoffs.length === 0 ? (
            <div className="mgmt-empty-state">
              <span className="empty-icon">📥</span>
              <h3>Intake Queue Clear</h3>
              <p>No scheduled seller arrivals are currently awaiting processing.</p>
            </div>
          ) : (
            <div className="queue-list-container">
              {dropoffs.map((d) => (
                <div key={d.id} className="queue-item-strip dropoff-theme">
                  <div className="strip-left-decor"></div>
                  <div className="strip-main-content">
                    <div className="strip-top">
                      <h3>Intake: {d.item_name}</h3>
                      <span className="queue-pill pending">Awaiting Delivery</span>
                    </div>
                    <div className="strip-meta-grid">
                      <p>Seller: <strong>{d.seller_name}</strong></p>
                      <p>Buyer: <strong>{d.buyer_name}</strong></p>
                      <p>Escrow Vault Value: <strong className="gold-text">R{d.amount.toFixed(2)}</strong></p>
                      <p>Scheduled Slot: <strong>{new Date(d.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong></p>
                    </div>
                    <button className="open-gate-btn dropoff" onClick={() => handleOpenInspection(d)}>
                      🔎 Inspect & Accept Package
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && selectedDropoff && (
        <div className="modal-overlay">
          <div className="modal-content-box dropoff-accent">
            <div className="modal-header-banner">
              <h2>Intake Inspection Audit</h2>
              <p>Verify matching parameters before checking packages into secure vault holdings.</p>
            </div>
            
            <div className="modal-body-form">
              <div className="checklist-card-section">
                <h4>Mandatory Security Verification</h4>
                <label className="checkbox-form-row">
                  <input type="checkbox" checked={verifyId} onChange={(e) => setVerifyId(e.target.checked)} />
                  <div className="checkbox-custom-text">
                    <strong>Verify Student Credentials</strong>
                    <span>I confirm that I have verified the seller's physical Student ID.</span>
                  </div>
                </label>
                
                <label className="checkbox-form-row">
                  <input type="checkbox" checked={verifyCondition} onChange={(e) => setVerifyCondition(e.target.checked)} />
                  <div className="checkbox-custom-text">
                    <strong>Physical Item Matching Check</strong>
                    <span>I confirm the item matches the image parameters listed on the marketplace.</span>
                  </div>
                </label>
              </div>

              <div className="form-input-group">
                <label>Physical Condition Grading</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option>Perfect - Like new</option>
                  <option>Good - Minor signs of use</option>
                  <option>Fair - Visible wear</option>
                  <option>Poor - Damaged asset</option>
                </select>
              </div>

              <div className="form-input-group">
                <label>Staff Desk Audit Notes</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows="3" 
                  placeholder="Log packaging, cosmetic anomalies or serialization numbers..."
                />
              </div>
            </div>

            <div className="modal-action-footer-buttons">
              <button type="button" className="btn-modal-close" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn-modal-submit dropoff"
                disabled={!verifyId || !verifyCondition}
                onClick={() => handleUpdateStatus(selectedDropoff.id, 'completed')}
              >
                🔒 Authorize Vault Intake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropoffManagement;