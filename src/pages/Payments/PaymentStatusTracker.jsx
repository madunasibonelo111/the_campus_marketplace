import { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabaseClient";

export default function PaymentStatusTracker({ transactionId }) {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remainingBalance, setRemainingBalance] = useState(0);

  useEffect(() => {
    if (transactionId) {
      fetchPaymentStatus();
      
      // Subscribe to real-time updates
      const subscription = supabase
        .channel('payment-updates')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'payments',
            filter: `transaction_id=eq.${transactionId}`
          }, 
          () => fetchPaymentStatus()
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [transactionId]);

  const fetchPaymentStatus = async () => {
    try {
      // Get transaction details
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('amount, remaining_balance, partial_payment_amount, status')
        .eq('id', transactionId)
        .single();
      
      if (transactionError) throw transactionError;
      
      // Get all payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });
      
      if (paymentsError) throw paymentsError;
      
      const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const remaining = (transaction?.amount || 0) - totalPaid;
      
      setPaymentStatus({
        totalAmount: transaction?.amount || 0,
        totalPaid: totalPaid,
        remainingBalance: remaining,
        isComplete: remaining <= 0,
        payments: payments || [],
        status: transaction?.status
      });
      
      setRemainingBalance(remaining);
      
    } catch (error) {
      console.error("Error fetching payment status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading payment status...</div>;
  }

  const percentageComplete = (paymentStatus.totalPaid / paymentStatus.totalAmount) * 100;

  return (
    <div className="payment-status-tracker">
      <h3>Payment Status</h3>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${percentageComplete}%` }}
        />
        <span className="progress-text">{percentageComplete.toFixed(0)}% Complete</span>
      </div>
      
      <div className="payment-summary">
        <div className="summary-item">
          <span className="label">Total Amount:</span>
          <span className="value">R{paymentStatus.totalAmount.toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Total Paid:</span>
          <span className="value">R{paymentStatus.totalPaid.toFixed(2)}</span>
        </div>
        <div className="summary-item highlight">
          <span className="label">Remaining Balance:</span>
          <span className="value">R{remainingBalance.toFixed(2)}</span>
        </div>
      </div>
      
      {paymentStatus.payments.length > 0 && (
        <div className="payment-history">
          <h4>Payment History</h4>
          {paymentStatus.payments.map((payment, index) => (
            <div key={payment.id} className="payment-record">
              <div className="payment-date">
                {new Date(payment.created_at).toLocaleDateString()}
              </div>
              <div className="payment-details">
                <span>Payment #{index + 1}</span>
                <span className="payment-method">{payment.method}</span>
                <span className="payment-amount">R{payment.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {remainingBalance > 0 && paymentStatus.status !== 'partial_payment' && (
        <div className="make-payment-btn">
          <button onClick={() => window.location.href = `/payment/${transactionId}`}>
            Make Additional Payment
          </button>
        </div>
      )}
    </div>
  );
}