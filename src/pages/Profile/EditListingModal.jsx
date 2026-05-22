import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabaseClient";

export default function EditListingModal({ isOpen, onClose, listingData, onSaveSuccess }) {
  const [title, setTitle] = useState(listingData?.title || "");
  const [description, setDescription] = useState(listingData?.description || "");
  const [price, setPrice] = useState(listingData?.price || 0);
  const [condition, setCondition] = useState(listingData?.condition || "good");
  const [status, setStatus] = useState(listingData?.status || "active");
  const [quantity, setQuantity] = useState(listingData?.quantity ?? 1);
  const [loading, setLoading] = useState(false);

  // Auto-set to "sold" if quantity drops to 0
  useEffect(() => {
    if (quantity <= 0 && status !== 'sold') setStatus('sold');
    else if (quantity > 0 && status === 'sold') setStatus('active');
  }, [quantity]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalStatus = Number(quantity) <= 0 ? 'sold' : status;

      const { error } = await supabase
        .from('listings')
        .update({
          title, description, price: Number(price), condition, 
          status: finalStatus, quantity: Number(quantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', listingData.id);

      if (error) throw error;
      alert("Listing updated successfully!");
      onSaveSuccess(); 
      onClose(); 
    } catch (error) {
      console.error("Error updating listing:", error);
      alert("Failed to update listing: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async () => {
  if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
  
  try {
    const { error } = await supabase.from('listings').delete().eq('id', listingData.id);
    if (error) throw error;
    alert("Listing deleted.");
    onSaveSuccess(); // Refresh parent view
    onClose();
  } catch (err) {
    alert("Error deleting: " + err.message);
  }
};

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginTop: 0, color: '#0b1f3a' }}>Edit Listing</h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Item Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Price (Rands)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Quantity in Stock</label>
              <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: quantity <= 0 ? '#fee2e2' : 'white' }}/>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'vertical' }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={quantity <= 0} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: quantity <= 0 ? '#f1f5f9' : 'white' }}>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={handleDelete} style={{ flex: 1, padding: '12px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? "Saving..." : "Save Listing"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}