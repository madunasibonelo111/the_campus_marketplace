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
      // Run the data fetch safely now that the token is validated independently
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
            paid_at,
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
        //Match against the nested profiles user_id string to guarantee a clean match on page refresh
        const isBuyer = t.buyer_id === userId || t.buyer?.user_id === userId;
        const isSeller = t.seller_id === userId || t.seller?.user_id === userId;
        
        const listing = t.listings;
        const otherPartyName = isBuyer ? t.seller?.name : t.buyer?.name;
        
        const totalAmount = Number(t.offer_amount || listing?.price || 0);
        
        const paymentArray = Array.isArray(t.payments) ? t.payments : [];
        const totalPaid = paymentArray.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const remainingBalance = totalAmount - totalPaid;
        
        const hasShortfall = remainingBalance >= 0.10 && t.status?.toLowerCase() !== 'completed' && t.status?.toLowerCase() !== 'cancelled';
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
          cashShortfall: latestPayment ? Number(latestPayment.shortfall_amount || 0) : 0,
          hasShortfall: hasShortfall,
          status: String(t.status || 'pending').toLowerCase(),
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
    switch(status?.toLowerCase()) {
      case "completed": return "#4caf50";
      case "pending_payment": return "#ffa500";
      case "pending": return "#ffa500";
      case "pending_dropoff": return "#385723";
      case "pending_collection": return "#385723";
      case "item_in_custody": return "#2196f3";
      case "item_received": return "#2196f3";
      case "cancelled": return "#f44336";
      case "partial_payment": return "#ff9800";
      default: return "#666";
    }
  };

  const getStatusLabel = (status) => {
    switch(status?.toLowerCase()) {
      case "completed": return "Completed";
      case "pending_payment": return "Payment Pending";
      case "pending": return "Pending";
      case "pending_dropoff": return "Drop-off Booked";
      case "pending_collection": return "Collection Booked";
      case "item_in_custody": return "In Custody";
      case "item_received": return "Item Received";
      case "cancelled": return "Cancelled";
      case "partial_payment": return "Partial Payment";
      default: return status || "Unknown";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case "completed": return "#4caf50";
      case "partial": return "#ff9800";
      case "pending": return "#ffa500";
      case "failed": return "#f44336";
      default: return "#666";
    }
  };

  const getPaymentStatusLabel = (status) => {
    switch(status?.toLowerCase()) {
      case "completed": return "Fully Paid";
      case "partial": return "Partial Payment";
      case "pending": return "Pending";
      case "failed": return "Failed";
      default: return status || "N/A";
    }
  };

  const hasOutstandingShortfall = (transaction) => {
    return transaction.hasShortfall && transaction.remainingBalance >= 0.10;
  };

  const getShortfallAmount = (transaction) => {
    return Math.max(0, transaction.remainingBalance);
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

  const filteredTransactions = transactions.filter(t => {
    if (filter === "all") return true;
    if (filter === "buy") return t.type === "buy";
    if (filter === "sell") return t.type === "sell";
    if (filter === "trade") return t.listingType === "trade";
    if (filter === "partial") return t.hasShortfall;
    return true;
  });

  const getTotalSpent = () => {
    return transactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.amountPaid, 0);
  };

  const getTotalEarned = () => {
    return transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.amountPaid, 0);
  };

  const getPendingPayments = () => {
    return transactions.filter(t => t.type === 'buy' && t.hasShortfall && t.remainingBalance >= 0.10).length;
  };

  const getOutstandingBalance = () => {
    return transactions
      .filter(t => t.type === 'buy' && t.hasShortfall && t.remainingBalance >= 0.10)
      .reduce((sum, t) => sum + t.remainingBalance, 0);
  };

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

        {/* Statistics Cards */}
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

        {/* Filters */}
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
          {transactions.length === 0 && !error ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No transactions found</p>
              <button className="shop-now-btn" onClick={() => navigate("/basket")}>Start Shopping</button>
            </div>
          ) : transactions.length > 0 ? (
            <div className="transactions-list">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-row" onClick={() => setSelectedTransaction(transaction)}>
                  <div className="transaction-type-icon">
                    {getTypeIcon(transaction.type, transaction.listingType)}
                  </div>
                  
                  <div className="transaction-details">
                    

                    
                    {/* Book Drop-off Slot (Only visible if the listing needs an appointment and hasn't been scheduled yet) */}
                    {transaction.type === 'sell' && 
                      ['pending', 'partial_payment', 'pending_payment'].includes(transaction.status) && 
                      !['pending_dropoff', 'pending_collection', 'item_in_custody', 'completed'].includes(transaction.status) && (
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <button 
                          className="btn-book-slot"
                          onClick={(e) => {
                            e.stopPropagation();
                            localStorage.setItem('lastTransactionId', transaction.id);
                            navigate("/booking/dropoff", { state: { transactionId: transaction.id, mode: 'dropoff' } });
                          }}
                          style={{ background: '#28a745', color: 'white', padding: '#8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          📦 Book Seller Drop-off Slot
                        </button>
                      </div>
                    )}

                    {/* Confirmed Drop-off Scheduled Tracking Banner */}
                    {transaction.type === 'sell' && transaction.status === 'pending_dropoff' && (
                      <div className="booking-status-badge-container" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <span style={{ 
                          background: '#eef2ff', 
                          color: '#4f46e5', 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          fontSize: '13px', 
                          fontWeight: 'bold', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          border: '1px solid #c7d2fe' 
                        }}>
                          ⏳ Drop-off Scheduled (Awaiting Desk Delivery)
                        </span>
                      </div>
                    )}

                    {/* Transaction Completed & Collected Banner (Shows once item is with buyer) */}
                    {transaction.type === 'sell' && transaction.status === 'completed' && (
                      <div className="booking-status-badge-container" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <span style={{ 
                          background: '#e2f0d9', 
                          color: '#385723', 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          fontSize: '13px', 
                          fontWeight: 'bold', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          border: '1px solid #c5e0b4' 
                        }}>
                          ✅ Transaction Completed & Collected
                        </span>
                      </div>
                    )}
                  

                    {/* BUYER WORKFLOW GATES WITH DEFENSIVE SHORTFALL LOCKS*/}

                    {/* Rule Check A: Item in custody but buyer HAS AN ACTIVE CASH SHORTFALL RECORDED */}
                    {transaction.type === 'buy' && 
                    transaction.status === 'item_in_custody' && 
                    transaction.cashShortfall > 0 && ( /* ✅ FIX: Lock strictly checks cashShortfall state */
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                          background: '#fff1f0',
                          border: '1px solid #ffa39e',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          fontSize: '13px',
                          color: '#cf1322',
                          fontWeight: '500',
                          lineHeight: '1.4',
                          textAlign: 'left'
                        }}>
                          🛑 **Collection Locked:** You have an unpaid shortfall balance of **R{transaction.cashShortfall.toFixed(2)}**. Please settle this remaining amount below before scheduling a physical facility pickup.
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

                    {/* Rule Check B: Item in custody and fully paid off (Zero Cash Shortfall) -> Unlocked */}
                    {transaction.type === 'buy' && 
                    transaction.status === 'item_in_custody' && 
                    transaction.cashShortfall <= 0 && ( /* ✅ FIX: Only unlocks if there is absolutely no shortfall */
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

                    {/* Rate Seller Trigger - Only renders if transaction is fully completed AND has not been rated yet */}
                    {transaction.type === 'buy' && transaction.status === 'completed' && !transaction.alreadyRated && (
                      <div className="booking-trigger-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <button 
                          className="btn-book-slot"
                          onClick={(e) => {
                            e.stopPropagation();
                            const numericTargetId = transaction.seller_user_id || transaction.seller_id;
                            navigate(`/reviews/${numericTargetId}?action=rate`, { 
                              state: { transactionId: transaction.id } 
                            });
                          }}
                          style={{ background: '#f39c12', color: 'white', padding: '#8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ⭐ Rate Seller
                        </button>
                      </div>
                    )}

                    {/*  Already Rated Badge - Replaces the button permanently after submission to lock interaction */}
                    {transaction.type === 'buy' && transaction.status === 'completed' && transaction.alreadyRated && (
                      <div className="booking-status-badge-container" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <span style={{ background: '#e2f0d9', color: '#385723', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #c5e0b4' }}>
                          ✅ Rated (Feedback Logged)
                        </span>
                      </div>
                    )}


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
                    
                    {transaction.cashShortfall > 0 && (
                      <span className="shortfall-badge">
                        ⚠️ R{transaction.cashShortfall.toFixed(2)} shortfall recorded
                      </span>
                    )}
                    
                    <div className="transaction-id">ID: {transaction.transactionId.slice(0, 8)}...</div>

                    {/* Actionable Shortfall Warning Banner for BUYER */}
                    {transaction.type === 'buy' && hasOutstandingShortfall(transaction) && (
                      <div className="shortfall-alert" style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', padding: '10px 15px', marginTop: '10px', borderRadius: '8px' }}>
                        <span className="alert-icon">⚠️</span>
                        <span className="alert-text" style={{ color: '#856404', fontWeight: '500' }}>
                          Outstanding balance: R{getShortfallAmount(transaction).toFixed(2)}
                        </span>
                        <button className="complete-payment-btn" onClick={(e) => handleCompletePayment(transaction, e)}>
                          Complete Payment
                        </button>
                      </div>
                    )}

                    {/* Read-only Debt Tracking Notice for SELLER */}
                    {transaction.type === 'sell' && hasOutstandingShortfall(transaction) && (
                      <div className="seller-shortfall-notice" style={{ background: '#fce8e6', borderLeft: '4px solid #ea4335', padding: '10px 15px', marginTop: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="alert-icon">ℹ️</span>
                        <span className="alert-text" style={{ color: '#c5221f', fontWeight: '500', fontSize: '14px' }}>
                          Awaiting Buyer Balance: R{getShortfallAmount(transaction).toFixed(2)} outstanding from buyer.
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="transaction-amount-info">
                    <div className="transaction-amount">Paid: R{transaction.amountPaid.toFixed(2)}</div>
                  

                    {transaction.remainingBalance >= 0.10 && (
                      <div className="transaction-remaining">Remaining: R{transaction.remainingBalance.toFixed(2)}</div>
                    )}
                    <div className="transaction-status" style={{ color: getStatusColor(transaction.status) }}>
                      {getStatusLabel(transaction.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Detail Modal overlay rendering */}
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