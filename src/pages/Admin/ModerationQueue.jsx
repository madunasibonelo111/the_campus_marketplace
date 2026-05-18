import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/supabaseClient'; // Adjusted path to use your absolute clean alias
import './ModerationQueue.css'; 

const ModerationQueue = () => {
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPendingFlags();
  }, []);

  const fetchPendingFlags = async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error } = await supabase.rpc('get_pending_flags');

    if (error) {
      console.error('Error fetching flags:', error);
      setError('Failed to load moderation queue. Please try again.');
    } else {
      setFlags(data || []);
    }
    
    setIsLoading(false);
  };

  const handleAction = async (flagId, actionStatus) => {
    const { error } = await supabase.rpc('resolve_flagged_item', {
      p_flag_id: flagId,
      p_action_status: actionStatus 
    });

    if (error) {
      console.error(`Error applying action ${actionStatus}:`, error);
      alert('Failed to resolve the item. Please check your connection and try again.');
    } else {
      fetchPendingFlags();
    }
  };

  if (isLoading) {
    return <div className="loading-state" style={{ padding: '40px', color: '#64748b' }}>Loading Moderation Queue...</div>;
  }

  if (error) {
    return <div className="error-state" style={{ padding: '40px', color: '#ef4444' }}>{error}</div>;
  }

  return (
    <div className="moderation-queue-container" style={{ background: 'white', padding: '30px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
      <h2 style={{ fontSize: '22px', color: '#1e293b', margin: '0 0 20px 0', fontWeight: '700' }}>🛡️ Moderation Work Queue</h2>
      
      {flags.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>🎉 No pending flags! The campus is safe.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="moderation-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
                <th style={{ padding: '12px 16px' }}>Date Reported</th>
                <th style={{ padding: '12px 16px' }}>Reporter</th>
                <th style={{ padding: '12px 16px' }}>Item ID</th>
                <th style={{ padding: '12px 16px' }}>Reason</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.flag_id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                  <td style={{ padding: '16px' }}>
                    {flag.created_at ? new Date(flag.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '16px' }}>{flag.reporter_name || 'Anonymous User'}</td>
                  <td style={{ padding: '16px' }}>
                    <span title={flag.item_id || ''} style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {flag.item_id && typeof flag.item_id === 'string' 
                        ? `${flag.item_id.substring(0, 8)}...` 
                        : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>{flag.reason || 'No details provided'}</td>
                  <td className="action-buttons" style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-dismiss"
                      onClick={() => handleAction(flag.flag_id, 'dismissed')}
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Dismiss
                    </button>
                    <button 
                      className="btn-remove"
                      onClick={() => handleAction(flag.flag_id, 'removed')}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ModerationQueue;