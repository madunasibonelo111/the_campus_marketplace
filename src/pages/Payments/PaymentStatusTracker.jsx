import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";

export default function PaymentStatusTracker({ transactionId }) {
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (transactionId) {
      fetchPaymentStatus();
    }
  }, [transactionId]);

  const fetchPaymentStatus = async () => {
    try {
      // Get transaction details
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('total_amount, amount_paid, remaining_balance, status')
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
      
      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalAmount = transaction?.total_amount || 0;
      const remaining = totalAmount - totalPaid;
      
      setPaymentStatus({
        totalAmount: totalAmount,
        totalPaid: totalPaid,
        remainingBalance: remaining > 0 ? remaining : 0,
        isComplete: remaining <= 0,
        payments: payments || [],
        status: transaction?.status
      });
      
    } catch (error) {
      console.error("Error fetching payment status:", error);
      setPaymentStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = () => {
    navigate(`/payment`, {
      state: {
        transaction: { id: transactionId, total_amount: paymentStatus?.totalAmount },
        totalAmount: paymentStatus?.remainingBalance,
        remainingBalance: paymentStatus?.remainingBalance,
        isPartialPayment: true
      }
    });
  };

  if (loading) {
    return <div>Loading payment status...</div>;
  }

  if (!paymentStatus) {
    return <div>Unable to load payment status</div>;
  }

  const percentageComplete = paymentStatus.totalAmount > 0 
    ? ((paymentStatus.totalPaid / paymentStatus.totalAmount) * 100).toFixed(0)
    : 0;

  return (
    <div className="payment-status-tracker">
      <h3>Payment Status</h3>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${percentageComplete}%` }}
        />
        <span className="progress-text">
          {percentageComplete}% Complete
        </span>
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
          <span className="value">R{paymentStatus.remainingBalance.toFixed(2)}</span>
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
      
      {paymentStatus.remainingBalance > 0 && (
        <div className="make-payment-btn">
          <button onClick={handleMakePayment}>
            Make Additional Payment
          </button>
        </div>
      )}
    </div>
  );
}