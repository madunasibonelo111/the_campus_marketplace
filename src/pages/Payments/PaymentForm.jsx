import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import "./PaymentForm.css";

export default function PaymentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [cardDetails, setCardDetails] = useState({
    holderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [shortfallInfo, setShortfallInfo] = useState(null);
  const [basketItems, setBasketItems] = useState([]);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState(null);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);
  const [facilityBooking, setFacilityBooking] = useState(null);
  
  const originalAmount = location.state?.totalAmount || 0;
  const discountedAmount = originalAmount * 0.9;
  const finalAmount = discountApplied ? discountedAmount : paymentAmount;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      await fetchSavedCards(user.id);
      setLoading(false);
    };
    
    getUser();
    
    if (location.state?.basket) {
      const { basket, totalAmount, transaction } = location.state;
      setBasketItems(basket);
      setPaymentAmount(totalAmount);
      setCurrentTransaction(transaction);
    } else if (location.state?.listing) {
      const { listing, transaction } = location.state;
      setPaymentAmount(listing.price);
      setCurrentTransaction(transaction);
    }

    else if (location.state?.transaction) {
    setCurrentTransaction(location.state.transaction);
    setPaymentAmount(location.state.totalAmount || 0);
    }
  }, [navigate, location.state]);

  const fetchSavedCards = async (userId) => {
    try {
      const { data } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });
      
      if (data) {
        setSavedCards(data);
        const defaultCard = data.find(card => card.is_default === true);
        if (defaultCard) {
          setSelectedSavedCard(defaultCard);
          setUseSavedCard(true);
        }
      }
    } catch {
      // Silently fail
    }
  };

  const maskCardNumber = (number) => {
    const clean = number.replace(/\s/g, '');
    return `**** **** **** ${clean.slice(-4)}`;
  };

  const detectCardBrand = (number) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    if (clean.startsWith('3')) return 'Amex';
    if (clean.startsWith('6')) return 'Discover';
    return 'Card';
  };

  const simulateLuhnCheck = (cardNumber) => {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return (sum % 10) === 0;
  };

  const simulatePaymentGateway = async (method, amount, cardData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (method === 'card' && cardData.cardNumber) {
      const cleanNumber = cardData.cardNumber.replace(/\s/g, '');
      if (cleanNumber.length < 15 || cleanNumber.length > 16) {
        return { success: false, error: "Invalid card number length" };
      }
      if (!simulateLuhnCheck(cleanNumber)) {
        return { success: false, error: "Invalid card number" };
      }
      if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
        return { success: false, error: "Invalid CVV" };
      }
    }
    
    return {
      success: true,
      transactionId: `GATEWAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  };

  const saveCardToDatabase = async () => {
    try {
      const last4 = cardDetails.cardNumber.replace(/\s/g, '').slice(-4);
      const cardBrand = detectCardBrand(cardDetails.cardNumber);
      
      const { data: existingCard } = await supabase
        .from('saved_cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('last4', last4)
        .eq('card_brand', cardBrand)
        .single();
      
      if (existingCard) return;
      
      const [expiryMonth, expiryYear] = cardDetails.expiry.split('/');
      
      const { error } = await supabase
        .from('saved_cards')
        .insert({
          user_id: user.id,
          card_holder_name: cardDetails.holderName.toUpperCase(),
          last4,
          card_brand: cardBrand,
          expiry_month: parseInt(expiryMonth),
          expiry_year: parseInt(expiryYear),
          is_default: savedCards.length === 0,
          created_at: new Date().toISOString()
        });
      
      if (!error) {
        const { data } = await supabase.from('saved_cards').select('*').eq('user_id', user.id);
        if (data) setSavedCards(data);
      }
    } catch {
      // Silent fail
    }
  };

  const createFacilityBooking = async (shortfallAmount) => {
    try {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 3);
      
      const { data } = await supabase
        .from('facility_bookings')
        .insert({
          transaction_id: currentTransaction?.id,
          user_id: user.id,
          amount_due: shortfallAmount,
          booking_date: bookingDate.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (data) setFacilityBooking(data);
      return data;
    } catch {
      return null;
    }
  };

  const sendPaymentConfirmation = async (paymentResult) => {
    try {
      const listing = basketItems[0] || location.state?.listing;
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'payment_confirmation',
        title: paymentResult.hasShortfall ? 'Partial Payment Received' : 'Payment Confirmed',
        message: paymentResult.hasShortfall 
          ? `Partial payment of R${paymentAmount.toFixed(2)} received. Remaining balance: R${paymentResult.shortfallAmount.toFixed(2)}. Please visit the facility to complete payment.`
          : `Your payment of R${paymentAmount.toFixed(2)} for ${listing?.title || 'item'} has been confirmed.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    } catch {
      // Silent fail
    }
  };

  const updateListingStatus = async () => {
    try {
      const items = basketItems.length > 0 ? basketItems : (location.state?.listing ? [location.state.listing] : []);
      for (const item of items) {
        await supabase
          .from('listings')
          .update({ status: 'sold', updated_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    } catch {
      // Silent fail
    }
  };

  const processPayment = async () => {
    try {
      const cashShortfall = originalAmount - finalAmount;
      const paymentStatus = cashShortfall === 0 ? 'completed' : 'partial';
      const paymentMethodValue = paymentMethod === 'card' ? 'card' : paymentMethod === 'paypal' ? 'paypal' : 'online';
      
      const gatewayResult = await simulatePaymentGateway(paymentMethodValue, finalAmount, cardDetails);
      if (!gatewayResult.success) throw new Error(gatewayResult.error);
      
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          transaction_id: currentTransaction?.id,
          payer_id: user.id,
          amount: finalAmount,
          method: paymentMethodValue,
          status: paymentStatus,
          shortfall_amount: cashShortfall > 0 ? cashShortfall : null,
          gateway_transaction_id: gatewayResult.transactionId,
          payment_reference: `PAY-${Date.now()}-${user.id.slice(0, 8)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      const currentAmountPaid = (currentTransaction?.amount_paid || 0) + finalAmount;
      const newRemainingBalance = (currentTransaction?.total_amount || originalAmount) - currentAmountPaid;
      const transactionStatus = newRemainingBalance <= 0 ? 'completed' : paymentStatus === 'partial' ? 'partial_payment' : 'pending_payment';
      
      await supabase
        .from('transactions')
        .update({ 
          status: transactionStatus,
          amount_paid: currentAmountPaid,
          remaining_balance: newRemainingBalance,
          partial_payment_amount: paymentStatus === 'partial' ? finalAmount : null,
          updated_at: new Date().toISOString(),
          ...(newRemainingBalance <= 0 && { completed_at: new Date().toISOString() })
        })
        .eq('id', currentTransaction?.id);
      
      if (cashShortfall > 0 && newRemainingBalance > 0) {
        await createFacilityBooking(newRemainingBalance);
      }
      
      if (newRemainingBalance <= 0) {
        await updateListingStatus();
      }
      
      if (paymentMethod === 'card' && !useSavedCard && saveCardForFuture && cardDetails.cardNumber) {
        await saveCardToDatabase();
      }
      
      await sendPaymentConfirmation({ 
        success: true, 
        hasShortfall: cashShortfall > 0 && newRemainingBalance > 0, 
        shortfallAmount: newRemainingBalance
      });
      
      return { 
        success: true, 
        hasShortfall: cashShortfall > 0 && newRemainingBalance > 0, 
        shortfallAmount: newRemainingBalance,
        payment
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleCardInputChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    if (e.target.name === 'expiry') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    setCardDetails({ ...cardDetails, [e.target.name]: value });
  };

  const handleSavedCardSelect = (card) => {
    setSelectedSavedCard(card);
    setUseSavedCard(true);
  };

  const applyDiscount = () => {
    if (discountCode === "SAVE10") {
      setDiscountApplied(true);
      alert("Discount applied! 10% off");
    } else if (discountCode === "") {
      alert("Please enter a coupon code");
    } else {
      alert("Invalid coupon code");
    }
  };

  const handlePayment = async () => {
    if (!user) {
      alert("Please login to continue");
      navigate("/auth");
      return;
    }
    
    if (paymentAmount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }
    
    if (paymentAmount > originalAmount) {
      setError("Payment amount cannot exceed total price");
      return;
    }
    
    if (paymentMethod === "card" && !useSavedCard) {
      if (!cardDetails.holderName || !cardDetails.cardNumber || !cardDetails.expiry || !cardDetails.cvv) {
        setError("Please fill in all card details");
        return;
      }
      
      const [month, year] = cardDetails.expiry.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        setError("Card has expired");
        return;
      }
    }
    
    setProcessing(true);
    setError("");
    
    const result = await processPayment();
    
    if (result.success) {
      const successMessage = result.hasShortfall 
        ? `Partial payment of R${paymentAmount.toFixed(2)} received! Remaining balance: R${result.shortfallAmount.toFixed(2)}`
        : `Payment of R${paymentAmount.toFixed(2)} completed successfully!`;
      alert(successMessage);
      
      if (result.hasShortfall) {
        setShortfallInfo({
          amount: result.shortfallAmount,
          bookingDate: result.booking?.booking_date,
          message: "Partial payment detected. A facility booking has been created to complete your payment."
        });
      }
      setPaymentSuccess(true);
    } else {
      setError(result.error || "Payment failed. Please try again.");
      alert("Payment failed: " + (result.error || "Please try again"));
    }
    
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="success-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h2>Payment {shortfallInfo ? 'Partial' : 'Successful'}!</h2>
          <p>Amount Paid: <strong>R{paymentAmount.toFixed(2)}</strong></p>
          {shortfallInfo && (
            <>
              <p>Remaining Balance: <strong>R{shortfallInfo.amount.toFixed(2)}</strong></p>
              <div className="shortfall-warning">
                <p>⚠️ {shortfallInfo.message}</p>
                <p className="shortfall-detail">
                  Your facility booking is scheduled for: <strong>{new Date(shortfallInfo.bookingDate).toLocaleDateString()}</strong>
                </p>
                <p className="shortfall-detail">
                  Please visit the campus trade facility with the remaining amount to complete your transaction.
                </p>
              </div>
            </>
          )}
          <p className="success-text">A confirmation has been sent to your email and notification center.</p>
          <button className="success-btn" onClick={() => navigate("/history")}>View Transaction History</button>
          <button className="success-btn secondary" onClick={() => navigate("/basket")} style={{ marginTop: '10px', background: '#666' }}>Continue Shopping</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page-container">
      <div className="payment-container">
        <div className="payment-left">
          <h2 className="payment-title">Complete Payment</h2>
          
          <div className="order-summary">
            <h3>Order Summary</h3>
            {basketItems.length > 0 ? (
              <>
                {basketItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <span>{item.title} x{item.quantity}</span>
                    <span>R{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="order-total">
                  <strong>Total:</strong>
                  <strong>R{originalAmount.toFixed(2)}</strong>
                </div>
              </>
            ) : (
              <div className="order-item">
                <span>Item Total</span>
                <span>R{originalAmount.toFixed(2)}</span>
              </div>
            )}
            {discountApplied && (
              <div className="order-item discount">
                <span>Discount (10%)</span>
                <span>-R{(originalAmount * 0.1).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="payment-methods">
            <h3>Select Payment Method</h3>
            <label className="payment-radio">
              <input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={(e) => setPaymentMethod(e.target.value)} /> 
              <span>Credit / Debit Card</span>
            </label>
            <label className="payment-radio">
              <input type="radio" name="payment" value="paypal" checked={paymentMethod === "paypal"} onChange={(e) => setPaymentMethod(e.target.value)} /> 
              <span>PayPal</span>
            </label>
          </div>

          <div className="discount-section">
            <input className="discount-input" placeholder="Discount Coupon (Optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
            <button onClick={applyDiscount} className="apply-discount-btn">Apply</button>
          </div>
        </div>

        <div className="payment-right">
          <h2 className="payment-right-title">Payment Details</h2>
          
          <div className="payment-amount-input">
            <label>Enter Payment Amount</label>
            <input type="number" className="payment-input" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value))} max={originalAmount} step="0.01" />
            <small>Total due: R{originalAmount.toFixed(2)}</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          {paymentMethod === "card" && (
            <div className="card-form">
              {savedCards.length > 0 && (
                <div className="saved-cards-section">
                  <label className="section-label">Saved Cards</label>
                  <div className="saved-cards-list">
                    {savedCards.map((card) => (
                      <div key={card.id} className={`saved-card-option ${selectedSavedCard?.id === card.id && useSavedCard ? 'selected' : ''}`} onClick={() => handleSavedCardSelect(card)}>
                        <input type="radio" name="savedCard" checked={selectedSavedCard?.id === card.id && useSavedCard} onChange={() => handleSavedCardSelect(card)} />
                        <span className="card-type">{card.card_brand}</span>
                        <span className="card-number-masked">{card.last4 ? `**** **** **** ${card.last4}` : card.card_number}</span>
                        <span className="card-expiry">{card.expiry_month}/{card.expiry_year}</span>
                        {card.is_default && <span className="default-badge">Default</span>}
                      </div>
                    ))}
                  </div>
                  <div className="or-divider"><span>OR</span></div>
                </div>
              )}

              {!useSavedCard ? (
                <>
                  <input name="holderName" className="payment-input" placeholder="Card Holder Name" value={cardDetails.holderName} onChange={handleCardInputChange} />
                  <input name="cardNumber" className="payment-input" placeholder="Card Number" value={cardDetails.cardNumber} onChange={handleCardInputChange} maxLength="19" />
                  <div className="payment-row">
                    <input name="expiry" className="payment-input" placeholder="Expiry date (MM/YY)" value={cardDetails.expiry} onChange={handleCardInputChange} maxLength="5" />
                    <input name="cvv" className="payment-input" placeholder="CVV" value={cardDetails.cvv} onChange={handleCardInputChange} type="password" maxLength="4" />
                  </div>
                  <div className="save-card-checkbox">
                    <label>
                      <input type="checkbox" checked={saveCardForFuture} onChange={(e) => setSaveCardForFuture(e.target.checked)} />
                      Save this card for future payments
                    </label>
                  </div>
                </>
              ) : (
                <div className="selected-card-info">
                  <p>Using saved card: <strong>{selectedSavedCard?.card_brand}</strong> ending in {selectedSavedCard?.last4}</p>
                  <p className="card-expiry-info">Expires: {selectedSavedCard?.expiry_month}/{selectedSavedCard?.expiry_year}</p>
                  <button className="change-card-btn" onClick={() => {
                    setUseSavedCard(false);
                    setSelectedSavedCard(null);
                    setCardDetails({ holderName: "", cardNumber: "", expiry: "", cvv: "" });
                  }}>Use different card</button>
                </div>
              )}
            </div>
          )}

          {paymentMethod === "paypal" && (
            <div className="paypal-container">
              <div className="paypal-logo">
                <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal" />
              </div>
              <p className="paypal-text">You will be redirected to PayPal to complete your payment securely.</p>
              <div className="paypal-simulation"><small>Demo Mode: PayPal integration simulated for demonstration</small></div>
            </div>
          )}

          <button onClick={handlePayment} className="pay-btn" disabled={processing}>
            {processing ? "Processing..." : `Pay R${finalAmount.toFixed(2)}`}
          </button>
          
          <p className="payment-footer">All payments are secure and encrypted. For partial payments, remaining balance must be paid at campus facility.</p>
        </div>
      </div>
    </div>
  );
}