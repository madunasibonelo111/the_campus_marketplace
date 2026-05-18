import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './ModerationQueue.css'; // Make sure to create this file for styling

const ModerationQueue = () => {
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Run this hook when the page first loads
  useEffect(() => {
    fetchPendingFlags();
  }, []);

  // Fetch the data using the RPC we created
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

  // Handle clicking "Dismiss" or "Remove"
  const handleAction = async (flagId, actionStatus) => {
    // Optimistic UI update could go here, but for safety, we await the DB response
    const { error } = await supabase.rpc('resolve_flagged_item', {
      p_flag_id: flagId,
      p_action_status: actionStatus // This will be 'dismissed' or 'removed'
    });

    if (error) {
      console.error(`Error applying action ${actionStatus}:`, error);
      alert('Failed to resolve the item. Please check your connection and try again.');
    } else {
      // Immediately refresh the table so the item disappears
      fetchPendingFlags();
    }
  };

  if (isLoading) {
    return <div className="loading-state">Loading Moderation Queue...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="moderation-queue-container">
      <h2>Moderation Queue</h2>
      
      {flags.length === 0 ? (
        <div className="empty-state">
          <p>No pending flags! The campus is safe.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="moderation-table">
            <thead>
              <tr>
                <th>Date Reported</th>
                <th>Reporter</th>
                <th>Item ID</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.flag_id}>
                  <td>{new Date(flag.created_at).toLocaleDateString()}</td>
                  <td>{flag.reporter_name}</td>
                  <td>
                    <span title={flag.item_id}>
                      {flag.item_id.substring(0, 8)}...
                    </span>
                  </td>
                  <td>{flag.reason}</td>
                  <td className="action-buttons">
                    <button 
                      className="btn-dismiss"
                      onClick={() => handleAction(flag.flag_id, 'dismissed')}
                    >
                      Dismiss
                    </button>
                    <button 
                      className="btn-remove"
                      onClick={() => handleAction(flag.flag_id, 'removed')}
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