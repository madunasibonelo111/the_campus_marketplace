// src/pages/Profile/TransactionHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./TransactionHistory.css";

export default function TransactionHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          console.log("No authentic session token found. Redirecting...");
          navigate("/auth");
          return;
        }
        
        setUser(session.user);
        await fetchTransactions(session.user.id);
        
      } catch (globalAuthErr) {
        console.error("Critical core layout authentication checkpoint error:", globalAuthErr);
        setError("Authorization verification checkpoint failure.");
      }
    };
    
    checkSessionAndFetch();
  }, [navigate, location.pathname, location.state]);

  const fetchTransactions = async (userId) => {
    try {
      console.log("Fetching transactions for user:", userId);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          type,
          status,
          created_at,
          updated_at,
          offer_amount,
          offer_status,
          trade_item_description,
          completed_at,
          accepted_at,
          seller:seller_id ( id, user_id, name ),
          buyer:buyer_id ( id, user_id, name ),
          listings:listing_id (
            id,
            title,
            description,
            price,
            condition,
            listing_type,
            listing_images (
              image_url,
              display_order
            )
          ),
          payments:payments (
            id,
            amount,
            method,
            status,
            shortfall_amount,
            created_at
          ),
          ratings:ratings!transaction_id ( id )
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });
          
      if (error) {
        console.error("Fetch error:", error);
        throw error;
      }

      const formatted = (data || []).map(t => {
        const isBuyer = t.buyer_id === userId || t.buyer?.user_id === userId;
        const listing = t.listings;
        const otherPartyName = isBuyer ? t.seller?.name : t.buyer?.name;
        
        const totalAmount = Number(t.offer_amount || listing?.price || 0);
        const paymentArray = Array.isArray(t.payments) ? t.payments : [];
        const totalPaid = paymentArray.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const remainingBalance = totalAmount - totalPaid;
        
        const rawStatus = String(t.status || 'pending').toLowerCase();
        const hasShortfall = remainingBalance >= 0.10 && rawStatus !== 'completed' && rawStatus !== 'cancelled';
        const latestPayment = paymentArray.length > 0 ? paymentArray[paymentArray.length - 1] : null;
        const alreadyRated = Array.isArray(t.ratings) ? t.ratings.length > 0 : !!t.ratings;
        
        return {
          id: t.id,
          otherPartyName: otherPartyName || "Campus User",
          seller_user_id: t.seller?.user_id || null, 
          buyer_id: t.buyer_id,
          type: isBuyer ? 'buy' : 'sell',
          listingType: t.type || 'purchase',
          item: listing?.title || 'Unknown Item',
          itemPrice: Number(listing?.price || 0),
          amount: totalAmount,
          amountPaid: totalPaid,
          remainingBalance: Math.max(0, remainingBalance),
          cashShortfall: remainingBalance > 0 ? remainingBalance : 0,
          hasShortfall: hasShortfall,
          status: rawStatus,
          paymentStatus: latestPayment ? latestPayment.status : 'N/A',
          paymentMethod: latestPayment ? latestPayment.method : 'N/A',
          offerStatus: t.offer_status,
          tradeItemDescription: t.trade_item_description,
          date: t.created_at,
          completedAt: t.completed_at,
          acceptedAt: t.accepted_at,
          transactionId: t.id,
          listingId: t.listing_id,
          allPayments: paymentArray,
          alreadyRated: alreadyRated
        };
      });

      setTransactions(formatted);
    } catch (err) {
      console.error("Detailed error:", err);
      setError(`Failed to load transactions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type, listingType) => {
    if (type === 'buy') return '🛒';
    if (listingType === 'trade') return '🔄';
    return '💰';
  };

  const getTypeLabel = (type, listingType) => {
    if (type === 'buy') return 'Purchase';
    if (listingType === 'trade') return 'Trade';
    return 'Sale';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "completed": return "#4caf50";
      case "payment_cleared": return "#ffa500";
      case "pending": return "#ffa500";
      case "pending_dropoff": return "#385723";
      case "pending_collection": return "#385723";
      case "item_in_custody": return "#2196f3";
      case "partial_payment": return "#ff9800";
      case "cancelled": return "#f44336";
      default: return "#666";
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case "completed": return "Handed Over & Completed";
      case "payment_cleared": return "Payment Confirmed";
      case "pending": return "Pending";
      case "pending_dropoff": return "Drop-off Booked";
      case "pending_collection": return "Collection Booked";
      case "item_in_custody": return "In Custody";
      case "cancelled": return "Cancelled";
      case "partial_payment": return "Partial Payment";
      default: return status ? status.replace('_', ' ') : "Unknown";
    }
  };

  const handleCompletePayment = (transaction, e) => {
    if (e) e.stopPropagation();
    navigate("/payment", {
      state: {
        transaction: { id: transaction.id, amount: transaction.amount },
        totalAmount: transaction.remainingBalance,
        remainingBalance: transaction.remainingBalance,
        isPartialPayment: true
      }
    });
  };

  // 🚀 FIXED TAB FILTER RULE GATES: Prevents the blank screen layout bug
  const filteredTransactions = transactions.filter(t => {
    if (filter === "all") return true;
    if (filter === "buy") return t.type === "buy";
    if (filter === "sell") return t.type === "sell";
    if (filter === "trade") return t.listingType === "trade";
    if (filter === "partial") return t.hasShortfall;
    return true;
  });

  const getTotalSpent = () => transactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.amountPaid, 0);
  const getTotalEarned = () => transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.amountPaid, 0);
  const getPendingPayments = () => transactions.filter(t => t.type === 'buy' && t.hasShortfall).length;
  const getOutstandingBalance = () => transactions.filter(t => t.type === 'buy' && t.hasShortfall).reduce((sum, t) => sum + t.remainingBalance, 0);

  if (loading) {
    return (
      <div className="history-loading">
        <div className="spinner"></div>
        <p>Loading transaction history...</p>
      </div>
    );
  }

  return (
    <div className="history-page-container">
      <div className="history-nav-header">
        <button onClick={() => navigate('/basket')} className="back-btn-pill" style={{ padding: '10px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          ← Back to Shop
        </button>
      </div>

      <div className="history-container">
        <div className="history-header">
          <h1 className="history-title">Transaction History</h1>
          <p className="history-subtitle">Track all your purchases, sales, trades, and partial payments</p>
        </div>

        {/* Dynamic Statistics Metrics Header Block View */}
        <div className="history-stats">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-label">Total Spent</span>
              <span className="stat-value">R{getTotalSpent().toFixed(2)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💵</div>
            <div className="stat-info">
              <span className="stat-label">Total Earned</span>
              <span className="stat-value">R{getTotalEarned().toFixed(2)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="stat-label">Pending Payments</span>
              <span className="stat-value">{getPendingPayments()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-info">
              <span className="stat-label">Outstanding Balance</span>
              <span className="stat-value">R{getOutstandingBalance().toFixed(2)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-label">Total Transactions</span>
              <span className="stat-value">{transactions.length}</span>
            </div>
          </div>
        </div>

        {/* Navigation Category Filter Selection Bar Component */}
        <div className="history-filters">
          <div className="filter-buttons">
            <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button className={`filter-btn ${filter === "buy" ? "active" : ""}`} onClick={() => setFilter("buy")}>🛒 Purchases</button>
            <button className={`filter-btn ${filter === "sell" ? "active" : ""}`} onClick={() => setFilter("sell")}>💰 Sales</button>
            <button className={`filter-btn ${filter === "trade" ? "active" : ""}`} onClick={() => setFilter("trade")}>🔄 Trades</button>
            <button className={`filter-btn ${filter === "partial" ? "active" : ""}`} onClick={() => setFilter("partial")}>⚠️ Partial Payments</button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={() => fetchTransactions(user?.id)} style={{ marginLeft: '10px' }}>Retry</button>
          </div>
        )}

        <div className="history-card">
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No transactions found matching criteria</p>
              <button className="shop-now-btn" onClick={() => navigate("/basket")}>Start Shopping</button>
            </div>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-row" onClick={() => setSelectedTransaction(transaction)}>
                  <div className="transaction-type-icon">
                    {getTypeIcon(transaction.type, transaction.listingType)}
                  </div>
                  
                  <div className="transaction-details">

                    {/* ======================================================================
                          🚨 DYNAMIC PROGRESS LIFECYCLE BANNERS LAYER
                       ====================================================================== */}

                    {/* 1. SELLER WORKFLOW: Drop-off slot appointment selection available */}
                    {transaction.type === 'sell' && ['pending', 'payment_cleared', 'partial_payment'].includes(transaction.status) && (
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <button 
                          className="btn-book-slot"
                          onClick={(e) => {
                            e.stopPropagation();
                            localStorage.setItem('lastTransactionId', transaction.id);
                            navigate("/booking/dropoff", { state: { transactionId: transaction.id } });
                          }}
                          style={{ background: '#28a745', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          📦 Book Seller Drop-off Slot
                        </button>
                      </div>
                    )}

                    {/* 2. SELLER WORKFLOW STATUS BADGE: Drop-off Booked but not yet handed to staff */}
                    {transaction.type === 'sell' && transaction.status === 'pending_dropoff' && (
                      <div className="booking-status-badge-container" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #c7d2fe' }}>
                          ⏳ Drop-off Scheduled (Awaiting Desk Delivery)
                        </span>
                      </div>
                    )}

                    {/* 3. BUYER WORKFLOW WORK-GATE: Settle Outstanding remaining balance split debt */}
                    {transaction.type === 'buy' && ['partial_payment', 'item_in_custody'].includes(transaction.status) && transaction.remainingBalance >= 0.10 && (
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', padding: '12px 16px', borderRadius: '10px', marginBottom: '10px', fontSize: '13px', color: '#cf1322', fontWeight: '500' }}>
                          🛑 **Collection Locked:** You have an unpaid shortfall balance of **R{transaction.remainingBalance.toFixed(2)}**. Please settle this remaining amount below before scheduling a physical facility pickup.
                        </div>
                        <button 
                          className="btn-book-slot"
                          onClick={(e) => handleCompletePayment(transaction, e)}
                          style={{ background: '#ff9800', color: 'white', padding: '#8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          💳 Pay Outstanding Shortfall Balance
                        </button>
                      </div>
                    )}

                    {/* 4. BUYER WORKFLOW WORK-GATE: Item verified in custody and balance clear -> Book pickup */}
                    {transaction.type === 'buy' && transaction.status === 'item_in_custody' && transaction.remainingBalance < 0.10 && (
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <button 
                          className="btn-book-slot"
                          onClick={(e) => {
                            e.stopPropagation();
                            localStorage.setItem('lastTransactionId', transaction.id);
                            navigate("/booking/collection", { state: { transactionId: transaction.id } });
                          }}
                          style={{ background: '#007bff', color: 'white', padding: '#8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          🎁 Book Buyer Collection Slot
                        </button>
                      </div>
                    )}

                    {/* 5. BUYER SESSIONS: Show Rate Seller link if transaction completed but feedback missing */}
                    {transaction.type === 'buy' && transaction.status === 'completed' && !transaction.alreadyRated && (
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <button 
                          className="btn-book-slot"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/reviews/${transaction.seller_user_id || transaction.buyer_id}?action=rate`, { 
                              state: { transactionId: transaction.id } 
                            });
                          }}
                          style={{ background: '#f39c12', color: 'white', padding: '#8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ⭐ Rate Seller Performance
                        </button>
                      </div>
                    )}

                    {/* 6. COMPLETE CONFIRMATION BADGE LABELS */}
                    {transaction.status === 'completed' && (
                      <div className="booking-status-badge-container" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <span style={{ background: '#e2f0d9', color: '#385723', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #c5e0b4' }}>
                          ✅ Transaction Completed & Handed Over
                        </span>
                      </div>
                    )}

                    {transaction.status === 'completed' && transaction.alreadyRated && (
                      <div className="booking-status-badge-container" style={{ marginTop: '4px' }}>
                        <span style={{ background: '#e2f0d9', color: '#385723', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #c5e0b4' }}>
                          ✓ Feedback Submitted
                        </span>
                      </div>
                    )}

                    {/* Metadata Content Attributes Info Lines */}
                    <div className="transaction-item">
                      <strong>{transaction.item}</strong>
                      <span className="transaction-type">
                        {getTypeLabel(transaction.type, transaction.listingType)}
                      </span>
                    </div>
                    
                    <div className="transaction-meta">
                      {transaction.type === 'buy' && transaction.paymentMethod && `Payment: ${transaction.paymentMethod} • `}
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    
                    {transaction.remainingBalance >= 0.10 && (
                      <span className="shortfall-badge">
                        ⚠️ R{transaction.remainingBalance.toFixed(2)} shortfall recorded
                      </span>
                    )}
                    
                    <div className="transaction-id">ID: {transaction.transactionId.slice(0, 8)}...</div>
                  </div>
                  
                  <div className="transaction-amount-info">
                    <div className="transaction-amount">Paid: R{transaction.amountPaid.toFixed(2)}</div>
                    {transaction.remainingBalance >= 0.10 && (
                      <div className="transaction-remaining">Remaining: R{transaction.remainingBalance.toFixed(2)}</div>
                    )}
                    <div className="transaction-status" style={{ color: getStatusColor(transaction.status), fontWeight: 'bold' }}>
                      {getStatusLabel(transaction.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Overlay Sheet Drawer Modal component */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Transaction Details</h2>
            <div className="detail-row"><strong>{selectedTransaction.type === 'buy' ? 'Seller' : 'Buyer'}:</strong> {selectedTransaction.otherPartyName}</div>
            <div className="detail-row"><strong>Item:</strong> {selectedTransaction.item}</div>
            <div className="detail-row"><strong>Total Amount:</strong> R{selectedTransaction.amount.toFixed(2)}</div>
            <div className="detail-row"><strong>Amount Paid:</strong> R{selectedTransaction.amountPaid.toFixed(2)}</div>
            <button className="close-modal" onClick={() => setSelectedTransaction(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}