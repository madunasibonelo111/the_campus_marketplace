import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./TransactionHistory.css";

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchTransactions(user.id);
    };
    
    getUser();
  }, [navigate]);

  const fetchTransactions = async (userId) => {
    try {
      console.log("Fetching transactions for user:", userId);
      
      // Fetch transactions where user is buyer or seller
     
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
      )
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Fetch error:", error);
        throw error;
      }
      
      console.log("Raw transactions data:", data);
      
      const formatted = (data || []).map(t => {
        const isBuyer = t.buyer_id === userId;
        const listing = t.listings;

        const otherPartyName = isBuyer ? t.seller?.name : t.buyer?.name;
        
        // Calculate total amount from listing price or offer amount
        const totalAmount = t.offer_amount || listing?.price || 0;
        
        // Calculate total paid across all payments
        const totalPaid = t.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const remainingBalance = totalAmount - totalPaid;
        const hasShortfall = remainingBalance > 0 && t.status !== 'completed' && t.status !== 'cancelled';
        
        // Get the most recent payment
        const latestPayment = t.payments?.[t.payments.length - 1];
        
        return {
          id: t.id,
          otherPartyName: otherPartyName || "Campus User",
         seller_user_id: t.seller?.user_id, 
         buyer_id: t.buyer_id,
          type: isBuyer ? 'buy' : 'sell',
          listingType: t.type || 'purchase',
          item: listing?.title || 'Unknown Item',
          itemPrice: listing?.price || 0,
          amount: totalAmount,
          amountPaid: totalPaid,
          remainingBalance: remainingBalance,
          cashShortfall: latestPayment?.shortfall_amount || 0,
          hasShortfall: hasShortfall,
          status: t.status,
          paymentStatus: latestPayment?.status,
          paymentMethod: latestPayment?.method,
          offerStatus: t.offer_status,
          tradeItemDescription: t.trade_item_description,
          date: t.created_at,
          completedAt: t.completed_at,
          acceptedAt: t.accepted_at,
          transactionId: t.id,
          listingId: t.listing_id,
          allPayments: t.payments || []
        };
      });
      
      console.log("Formatted transactions:", formatted);
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
      case "accepted": return "#2196f3";
      case "rejected": return "#f44336";
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
      case "accepted": return "Accepted";
      case "rejected": return "Rejected";
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
      case "refunded": return "#9c27b0";
      default: return "#666";
    }
  };

  const getPaymentStatusLabel = (status) => {
    switch(status?.toLowerCase()) {
      case "completed": return "Fully Paid";
      case "partial": return "Partial Payment";
      case "pending": return "Pending";
      case "failed": return "Failed";
      case "refunded": return "Refunded";
      default: return status || "N/A";
    }
  };

  const hasOutstandingShortfall = (transaction) => {
    return transaction.hasShortfall && transaction.remainingBalance > 0;
  };

  const getShortfallAmount = (transaction) => {
    return transaction.remainingBalance;
  };

  const handleCompletePayment = (transaction, e) => {
    if (e) e.stopPropagation();
    navigate("/payment", {
      state: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount
        },
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
    return transactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.amountPaid, 0);
  };

  const getTotalEarned = () => {
    return transactions
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.amountPaid, 0);
  };

  const getPendingPayments = () => {
    return transactions.filter(t => t.hasShortfall).length;
  };

  const getOutstandingBalance = () => {
    return transactions
      .filter(t => t.hasShortfall)
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
        <button 
          onClick={() => navigate('/basket')} 
          className="back-btn-pill" 
          style={{ 
            
            padding: '10px 24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
          }}
        >
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
            <button 
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === "buy" ? "active" : ""}`}
              onClick={() => setFilter("buy")}
            >
              🛒 Purchases
            </button>
            <button 
              className={`filter-btn ${filter === "sell" ? "active" : ""}`}
              onClick={() => setFilter("sell")}
            >
              💰 Sales
            </button>
            <button 
              className={`filter-btn ${filter === "trade" ? "active" : ""}`}
              onClick={() => setFilter("trade")}
            >
              🔄 Trades
            </button>
            <button 
              className={`filter-btn ${filter === "partial" ? "active" : ""}`}
              onClick={() => setFilter("partial")}
            >
              ⚠️ Partial Payments
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={() => fetchTransactions(user?.id)} style={{ marginLeft: '10px' }}>
              Retry
            </button>
          </div>
        )}

        <div className="history-card">
          {transactions.length === 0 && !error ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No transactions found</p>
              <p className="empty-subtitle">Complete a purchase to see your transaction history</p>
              <button className="shop-now-btn" onClick={() => navigate("/basket")}>
                Start Shopping
              </button>
            </div>
          ) : transactions.length > 0 ? (
            <div className="transactions-list">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="transaction-row"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="transaction-type-icon">
                    {getTypeIcon(transaction.type, transaction.listingType)}
                  </div>
                  
                  <div className="transaction-details">
                    <div className="transaction-item">
                      <strong>{transaction.item}</strong>
                      <span className="transaction-type">
                        {getTypeLabel(transaction.type, transaction.listingType)}
                      </span>
                    </div>
                    
                    <div className="transaction-meta">
                      {transaction.type === 'buy' && transaction.paymentMethod && (
                        <>Payment: {transaction.paymentMethod} • </>
                      )}
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    
                    {transaction.cashShortfall > 0 && (
                      <span className="shortfall-badge">
                        ⚠️ R{transaction.cashShortfall.toFixed(2)} shortfall recorded
                      </span>
                    )}
                    
                    {transaction.listingType === 'trade' && transaction.tradeItemDescription && (
                      <div className="trade-info">
                        🔄 Trade: {transaction.tradeItemDescription}
                      </div>
                    )}
                    
                    <div className="transaction-id">
                      ID: {transaction.transactionId.slice(0, 8)}...
                    </div>

                    {/* Outstanding Shortfall Alert */}
                    {hasOutstandingShortfall(transaction) && (
                      <div className="shortfall-alert">
                        <span className="alert-icon">⚠️</span>
                        <span className="alert-text">
                          Outstanding balance: R{getShortfallAmount(transaction).toFixed(2)}
                        </span>
                        <button 
                          className="complete-payment-btn"
                          onClick={(e) => handleCompletePayment(transaction, e)}
                        >
                          Complete Payment
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="transaction-amount-info">
                    <div className="transaction-amount">
                      Paid: R{transaction.amountPaid.toFixed(2)}
                    </div>
                    {transaction.remainingBalance > 0 && (
                      <div className="transaction-remaining">
                        Remaining: R{transaction.remainingBalance.toFixed(2)}
                      </div>
                    )}
                    {transaction.amountPaid !== transaction.amount && transaction.amount > 0 && (
                      <div className="transaction-total">
                        Total: R{transaction.amount.toFixed(2)}
                      </div>
                    )}
                    <div 
                      className="transaction-status"
                      style={{ color: getStatusColor(transaction.status) }}
                    >
                      {getStatusLabel(transaction.status)}
                    </div>


                    {transaction.paymentStatus && (
                      <div 
                        className="payment-status"
                        style={{ color: getPaymentStatusColor(transaction.paymentStatus) }}
                      >
                        {getPaymentStatusLabel(transaction.paymentStatus)}
                      </div>
                    )}
                    {transaction.hasShortfall && (
                      <div className="partial-badge">
                        Partial Payment
                      </div>
                    )}
                      {transaction.status === 'completed' && transaction.type === 'buy' && (
                        <button 
                          className="rate-btn-small" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/reviews/${transaction.seller_user_id}?tid=${transaction.id}`);
                          }}
                          style={{ 
                            background: '#f39c12', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            padding: '6px 10px', 
                            fontSize: '12px', 
                            marginTop: '8px', 
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            width: 'fit-content'
                          }}
                        >
                          ⭐ Rate Seller
                        </button>
                        )}

                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Transaction Details</h2>


            
            <div className="detail-row">
              <strong>{selectedTransaction.type === 'buy' ? 'Seller' : 'Buyer'}:</strong> {selectedTransaction.otherPartyName}
            </div>
            
            <div className="detail-row">
              <strong>Item:</strong> {selectedTransaction.item}
            </div>
            
            <div className="detail-row">
              <strong>Total Amount:</strong> R{selectedTransaction.amount.toFixed(2)}
            </div>
            
            <div className="detail-row">
              <strong>Amount Paid:</strong> R{selectedTransaction.amountPaid.toFixed(2)}
            </div>
            
            {selectedTransaction.remainingBalance > 0 && (
              <div className="detail-row highlight">
                <strong>Remaining Balance:</strong> R{selectedTransaction.remainingBalance.toFixed(2)}
                {hasOutstandingShortfall(selectedTransaction) && (
                  <button 
                    className="pay-remaining-btn"
                    onClick={() => {
                      setSelectedTransaction(null);
                      handleCompletePayment(selectedTransaction, new Event('click'));
                    }}
                  >
                    Pay Now
                  </button>
                )}
              </div>
            )}
            
            {selectedTransaction.cashShortfall > 0 && (
              <div className="detail-row">
                <strong>Cash Shortfall:</strong> R{selectedTransaction.cashShortfall.toFixed(2)}
              </div>
            )}
            
            <div className="detail-row">
              <strong>Payment Method:</strong> {selectedTransaction.paymentMethod || 'N/A'}
            </div>
            
            <div className="detail-row">
              <strong>Payment Status:</strong> 
              <span style={{ color: getPaymentStatusColor(selectedTransaction.paymentStatus) }}>
                {getPaymentStatusLabel(selectedTransaction.paymentStatus)}
              </span>
            </div>
            
            <div className="detail-row">
              <strong>Transaction Status:</strong>
              <span style={{ color: getStatusColor(selectedTransaction.status) }}>
                {getStatusLabel(selectedTransaction.status)}
              </span>
            </div>
            
            {selectedTransaction.listingType === 'trade' && selectedTransaction.tradeItemDescription && (
              <div className="detail-row">
                <strong>Trade Description:</strong> {selectedTransaction.tradeItemDescription}
              </div>
            )}
            
            {/* Payment History */}
            {selectedTransaction.allPayments && selectedTransaction.allPayments.length > 1 && (
              <div className="detail-row">
                <strong>Payment History:</strong>
                <div className="payment-history-list">
                  {selectedTransaction.allPayments.map((payment, idx) => (
                    <div key={payment.id} className="payment-history-item">
                      <span>Payment {idx + 1}:</span>
                      <span>R{payment.amount.toFixed(2)}</span>
                      <span>({new Date(payment.created_at).toLocaleDateString()})</span>
                      <span className="payment-method-badge">{payment.method}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="detail-row">
              <strong>Date Created:</strong> {new Date(selectedTransaction.date).toLocaleString()}
            </div>
            
            {selectedTransaction.completedAt && (
              <div className="detail-row">
                <strong>Completed Date:</strong> {new Date(selectedTransaction.completedAt).toLocaleString()}
              </div>
            )}
            
            <div className="detail-row">
              <strong>Transaction ID:</strong> {selectedTransaction.transactionId}
            </div>
            
            <div className="modal-actions-buttons">

              {selectedTransaction.status === 'completed' && selectedTransaction.type === 'buy' && (
                <button 
                  className="complete-payment-modal-btn" 
                  style={{ backgroundColor: '#f39c12' }}
                  onClick={() => navigate(`/reviews/${selectedTransaction.seller_user_id}?tid=${selectedTransaction.id}`)}
                >
                    ⭐ Rate Seller
                </button>
              )}


              {hasOutstandingShortfall(selectedTransaction) && (
                <button 
                  className="complete-payment-modal-btn"
                  onClick={() => {
                    setSelectedTransaction(null);
                    handleCompletePayment(selectedTransaction, new Event('click'));
                  }}
                >
                  Complete Payment
                </button>
              )}
              <button className="close-modal" onClick={() => setSelectedTransaction(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}