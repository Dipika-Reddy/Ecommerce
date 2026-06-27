import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useProfileMutation } from '../features/api/usersApiSlice';
import { useGetMyOrdersQuery, useCreateSubscriptionOrderMutation, useVerifySubscriptionSignatureMutation } from '../features/api/ordersApiSlice';
import { setCredentials } from '../features/auth/authSlice';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { Shield, Sparkles, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const statusColor = {
  Pending: 'bg-gray-100 text-gray-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-amber-100 text-amber-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const ProfileScreen = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [name, setName] = useState(userInfo.name);
  const [email, setEmail] = useState(userInfo.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Buzz subscription states
  const [isBuzz, setIsBuzz] = useState(() => {
    return localStorage.getItem('buybee_buzz_subscribed') === 'true';
  });
  const [buzzPlan, setBuzzPlan] = useState(() => {
    return localStorage.getItem('buybee_buzz_plan') || 'Monthly';
  });
  const [autoRenew, setAutoRenew] = useState(() => {
    return localStorage.getItem('buybee_buzz_renew') !== 'false';
  });
  const [selectedPlan, setSelectedPlan] = useState('Monthly');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Mock Subscription Gateway States
  const [showMockSubscriptionCheckout, setShowMockSubscriptionCheckout] = useState(false);
  const [mockGatewayStep, setMockGatewayStep] = useState('select'); // 'select', 'processing', 'simulating'
  const [selectedMockMethod, setSelectedMockMethod] = useState('upi-qr'); // 'upi-qr', 'upi-id', 'card'
  const [mockCardForm, setMockCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [mockUpiId, setMockUpiId] = useState('');
  const [mockSubscriptionData, setMockSubscriptionData] = useState(null);

  const [updateProfile, { isLoading: loadingUpdate }] = useProfileMutation();
  const { data: orders, isLoading: loadingOrders, error: ordersError } = useGetMyOrdersQuery();
  const [createSubscriptionOrder] = useCreateSubscriptionOrderMutation();
  const [verifySubscriptionSignature] = useVerifySubscriptionSignatureMutation();

  // Set mock subscription date for testing if user is subscribed but date is missing
  useEffect(() => {
    if (isBuzz && !localStorage.getItem('buybee_buzz_subscribed_at')) {
      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() - 12); // default to 12 days ago for calculation demo
      localStorage.setItem('buybee_buzz_subscribed_at', mockDate.toISOString());
    }
  }, [isBuzz]);

  const handleMockSubscriptionAction = () => {
    setMockGatewayStep('processing');
    setTimeout(() => {
      setMockGatewayStep('simulating');
    }, 1500);
  };

  const handleSimulateSubscriptionSuccess = async () => {
    try {
      setShowMockSubscriptionCheckout(false);
      await verifySubscriptionSignature({
        razorpay_order_id: mockSubscriptionData.razorpayOrderId,
        razorpay_payment_id: `mock_pay_${Date.now()}`,
        razorpay_signature: 'mock_sig',
        plan: selectedPlan,
      }).unwrap();

      setIsBuzz(true);
      setBuzzPlan(selectedPlan);
      localStorage.setItem('buybee_buzz_subscribed', 'true');
      localStorage.setItem('buybee_buzz_plan', selectedPlan);
      localStorage.setItem('buybee_buzz_renew', 'true');
      localStorage.setItem('buybee_buzz_subscribed_at', new Date().toISOString());
      toast.success(`Welcome to Buzz! You are now subscribed to the ${selectedPlan} plan.`);
    } catch (err) {
      toast.error(err?.data?.message || 'Subscription verification failed');
    }
  };

  const handleSimulateSubscriptionFailure = () => {
    setShowMockSubscriptionCheckout(false);
    toast.error('Mock subscription payment failed');
  };

  const getCardBrand = (num) => {
    if (!num) return 'Card';
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5')) return 'Mastercard';
    if (num.startsWith('6')) return 'RuPay';
    if (num.startsWith('3')) return 'Amex';
    return 'Card';
  };

  const handleSubscribe = async () => {
    try {
      const orderData = await createSubscriptionOrder(selectedPlan).unwrap();

      if (orderData.keyId === 'mock_key_id') {
        setMockSubscriptionData(orderData);
        setMockGatewayStep('select');
        setSelectedMockMethod('upi-qr');
        setMockCardForm({ number: '', name: '', expiry: '', cvv: '' });
        setMockUpiId('');
        setShowMockSubscriptionCheckout(true);
        return;
      }

      // Configure and open Razorpay Checkout overlay
      const options = {
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency,
        name: 'Buybee',
        description: `Buzz Subscription - ${selectedPlan} Plan`,
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          try {
            await verifySubscriptionSignature({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: selectedPlan,
            }).unwrap();

            setIsBuzz(true);
            setBuzzPlan(selectedPlan);
            localStorage.setItem('buybee_buzz_subscribed', 'true');
            localStorage.setItem('buybee_buzz_plan', selectedPlan);
            localStorage.setItem('buybee_buzz_renew', 'true');
            localStorage.setItem('buybee_buzz_subscribed_at', new Date().toISOString());
            toast.success(`Welcome to Buzz! You are now subscribed to the ${selectedPlan} plan.`);
          } catch (err) {
            toast.error(err?.data?.message || 'Subscription verification failed');
          }
        },
        prefill: {
          name: userInfo.name,
          email: userInfo.email,
        },
        theme: {
          color: '#f97316',
        },
      };

      if (window.Razorpay) {
        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      } else {
        // Fallback: load Razorpay script dynamically
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          const paymentObject = new window.Razorpay(options);
          paymentObject.open();
        };
        document.body.appendChild(script);
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to initialize payment gateway');
    }
  };

  const getRefundDetails = () => {
    const subscribedAtStr = localStorage.getItem('buybee_buzz_subscribed_at');
    const subscribedAt = subscribedAtStr ? new Date(subscribedAtStr) : new Date();

    // Calculate days elapsed (minimum 1 day, maximum plan duration)
    const msDiff = Date.now() - subscribedAt.getTime();
    const planDays = buzzPlan === 'Yearly' ? 365 : 30;
    const rawDaysUsed = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    const daysUsed = Math.max(1, Math.min(planDays, rawDaysUsed));
    const remainingDays = Math.max(0, planDays - daysUsed);

    const planPrice = buzzPlan === 'Yearly' ? 1499 : 179;
    const pricePerDay = planPrice / planDays;

    // Usage cost = days used × daily rate
    const usageCost = daysUsed * pricePerDay;

    // Refundable base = remaining days × daily rate
    const refundBeforeFee = remainingDays * pricePerDay;

    // 3% cancellation fee is charged on the refundable amount
    const cancellationFee = 0.03 * refundBeforeFee;

    // Final refund = refundable base - 3% cancellation fee
    const netRefund = Math.max(0, refundBeforeFee - cancellationFee);

    return {
      planPrice,
      planDays,
      daysUsed,
      remainingDays,
      pricePerDay: pricePerDay.toFixed(2),
      usageCost: usageCost.toFixed(2),
      refundBeforeFee: refundBeforeFee.toFixed(2),
      cancellationFee: cancellationFee.toFixed(2),
      netRefund: netRefund.toFixed(2),
    };
  };

  const handleCancel = () => {
    setCancelModalOpen(true);
  };

  const confirmCancel = () => {
    const { netRefund } = getRefundDetails();
    setIsBuzz(false);
    localStorage.setItem('buybee_buzz_subscribed', 'false');
    localStorage.removeItem('buybee_buzz_subscribed_at');
    setCancelModalOpen(false);
    toast.success(`Buzz subscription cancelled successfully. A refund of ₹${netRefund} has been processed back to your original payment method.`);
  };

  const toggleAutoRenew = () => {
    const nextRenew = !autoRenew;
    setAutoRenew(nextRenew);
    localStorage.setItem('buybee_buzz_renew', nextRenew ? 'true' : 'false');
    toast.info(nextRenew ? 'Auto-renew enabled.' : 'Auto-renew disabled.');
  };

  useEffect(() => {
    setName(userInfo.name);
    setEmail(userInfo.email);
  }, [userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const payload = { name, email };
      if (password) payload.password = password;
      const res = await updateProfile(payload).unwrap();
      dispatch(setCredentials(res));
      toast.success('Profile updated');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* --- Account form --- */}
        <div className="md:col-span-1">
          <h1 className="mb-4 text-xl font-bold text-gray-900">My Profile</h1>
          <form onSubmit={submitHandler} className="space-y-3 rounded-md border bg-white p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={password}
                placeholder="Leave blank to keep current"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loadingUpdate}
              className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Update
            </button>
            {loadingUpdate && <Loader />}
          </form>

          {/* --- Subscriptions Section (buzz) --- */}
          <div className="mt-6 text-left">
            <h2 className="mb-3 text-lg font-bold text-gray-900 flex items-center gap-1.5">
              <Sparkles size={18} className="text-amber-500 fill-amber-500" /> Memberships &amp; Subscriptions
            </h2>
            <div className="rounded-md border border-gray-200 bg-white p-5 space-y-4 shadow-sm relative overflow-hidden">
              {isBuzz ? (
                <>
                  <div className="absolute top-0 right-0 bg-amber-500 text-white font-extrabold text-[10px] px-3 py-1 rounded-bl uppercase tracking-wide">
                    BUZZ MEMBER
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] px-2 py-0.5 rounded font-black uppercase">
                        ✓ buzz
                      </span>
                      <span className="text-sm font-bold text-gray-800">Active Membership</span>
                    </div>
                    <p className="text-xs text-gray-500">Plan: {buzzPlan === 'Yearly' ? '₹1,499 / Year' : '₹179 / Month'}</p>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Auto-renew settings:</span>
                    <button 
                      onClick={toggleAutoRenew}
                      className="flex items-center gap-1 font-bold text-gray-800 hover:text-amber-600 transition"
                    >
                      {autoRenew ? (
                        <>
                          <ToggleRight size={24} className="text-green-600" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={24} className="text-gray-400" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <button
                      onClick={handleCancel}
                      className="w-full text-center bg-gray-50 hover:bg-gray-100 text-red-600 hover:text-red-700 py-2 rounded-md text-xs font-semibold border border-gray-200 transition"
                    >
                      Cancel Membership
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Unlock <strong className="text-gray-800">FREE Express Delivery</strong>, early access to deals, and exclusive coupons with a premium <strong className="text-amber-600">Buzz</strong> subscription!
                  </p>

                  <div className="space-y-2.5 pt-2">
                    <label className="block text-xs font-bold text-gray-500">Select a Buzz Plan</label>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <label className={`flex flex-col p-2.5 border rounded-lg cursor-pointer transition ${
                        selectedPlan === 'Monthly' ? 'border-amber-500 bg-amber-50/20' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="buzzPlan"
                            value="Monthly"
                            checked={selectedPlan === 'Monthly'}
                            onChange={() => setSelectedPlan('Monthly')}
                            className="accent-amber-500"
                          />
                          <span className="text-xs font-bold text-gray-800">Monthly</span>
                        </div>
                        <span className="text-xs text-amber-700 font-extrabold mt-1">₹179/mo</span>
                      </label>

                      <label className={`flex flex-col p-2.5 border rounded-lg cursor-pointer transition ${
                        selectedPlan === 'Yearly' ? 'border-amber-500 bg-amber-50/20' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="buzzPlan"
                            value="Yearly"
                            checked={selectedPlan === 'Yearly'}
                            onChange={() => setSelectedPlan('Yearly')}
                            className="accent-amber-500"
                          />
                          <span className="text-xs font-bold text-gray-800">Yearly</span>
                        </div>
                        <span className="text-xs text-amber-700 font-extrabold mt-1">₹1,499/yr</span>
                        <span className="text-[9px] text-green-700 font-bold bg-green-50 px-1 rounded self-start mt-0.5">Save 30%</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSubscribe}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 rounded-md text-xs transition shadow-sm mt-2 flex items-center justify-center gap-1"
                  >
                    <Sparkles size={13} /> Join Buzz Today
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- Order history & Payment History --- */}
        <div className="md:col-span-2 space-y-8">
          <div>
            <h1 className="mb-4 text-xl font-bold text-gray-900">Order History</h1>
            {loadingOrders ? (
              <Loader />
            ) : ordersError ? (
              <Message variant="danger">{ordersError?.data?.message}</Message>
            ) : orders.length === 0 ? (
              <Message variant="info">
                You haven't placed any orders yet. <Link to="/" className="underline">Start shopping</Link>
              </Message>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-t">
                        <td className="px-4 py-3 font-mono text-xs">{order._id.slice(-8)}</td>
                        <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">₹{order.totalPrice.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {order.isPaid ? (
                            <span className="text-green-600 font-semibold">✓ Paid</span>
                          ) : (
                            <span className="text-red-500 font-medium">✗ Unpaid</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor[order.status]}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/order/${order._id}`} className="font-medium text-brand-600 hover:underline">
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h1 className="mb-4 text-xl font-bold text-gray-900">Payment Audit Trail</h1>
            {loadingOrders ? (
              <Loader />
            ) : ordersError ? (
              <Message variant="danger">{ordersError?.data?.message}</Message>
            ) : !orders || orders.length === 0 || !orders.some(o => o.payments && o.payments.length > 0) ? (
              <Message variant="info">No payment records found.</Message>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Transaction ID</th>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .flatMap((order) =>
                        (order.payments || []).map((pay) => ({
                          ...pay,
                          orderId: order._id,
                        }))
                      )
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((pay) => (
                        <tr key={pay._id || pay.id} className="border-t">
                          <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate" title={pay.transactionId || pay._id || pay.id}>
                            {pay.transactionId || (pay._id || pay.id).slice(-8)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <Link to={`/order/${pay.orderId}`} className="text-brand-600 hover:underline">
                              {pay.orderId.slice(-8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">₹{pay.amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-semibold text-slate-700">{pay.paymentMethod}</span>
                            <span className="ml-1 text-[9px] uppercase font-mono text-slate-400">({pay.gateway})</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              pay.paymentStatus === 'SUCCESS' ? 'bg-green-100 text-green-700 border border-green-200' :
                              pay.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              pay.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-700 border border-red-200' :
                              pay.paymentStatus === 'REFUNDED' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {pay.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(pay.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Cancellation Refund Details Modal */}
      {cancelModalOpen && (() => {
        const refundDetails = getRefundDetails();
        return (
          <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 animate-fade-in text-slate-800">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-in text-left">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Cancel Buzz Membership</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 ml-10">
                A pro-rata refund is calculated based on unused days, minus a 3% cancellation fee.
              </p>

              {/* Calculation Breakdown */}
              <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
                {/* Plan info row */}
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Plan</span>
                  <span className="font-bold text-gray-800">
                    {buzzPlan} — ₹{refundDetails.planPrice} / {refundDetails.planDays} days
                  </span>
                </div>

                {/* Daily rate */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Daily Rate</span>
                  <span className="font-bold text-gray-800">
                    ₹{refundDetails.planPrice} ÷ {refundDetails.planDays} days = <span className="text-amber-600">₹{refundDetails.pricePerDay}/day</span>
                  </span>
                </div>

                {/* Days used with usage cost */}
                <div className="px-4 py-3 bg-red-50/60 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-semibold flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-400"></span>
                      Days Used
                    </span>
                    <span className="font-extrabold text-red-600 text-sm">{refundDetails.daysUsed} days</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-3">
                    <span className="text-gray-400 font-medium">{refundDetails.daysUsed} days × ₹{refundDetails.pricePerDay}</span>
                    <span className="font-bold text-red-500">= ₹{refundDetails.usageCost} (charged)</span>
                  </div>
                </div>

                {/* Remaining days with refundable amount */}
                <div className="px-4 py-3 bg-green-50/60 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-semibold flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                      Remaining Days
                    </span>
                    <span className="font-extrabold text-green-700 text-sm">{refundDetails.remainingDays} days</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-3">
                    <span className="text-gray-400 font-medium">{refundDetails.remainingDays} days × ₹{refundDetails.pricePerDay}</span>
                    <span className="font-bold text-green-600">= ₹{refundDetails.refundBeforeFee} (refundable)</span>
                  </div>
                </div>

                {/* 3% Cancellation fee on refundable amount */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-orange-50/40">
                  <span className="text-orange-700 font-medium">3% Cancellation Fee</span>
                  <span className="font-bold text-orange-700">
                    3% × ₹{refundDetails.refundBeforeFee} = <span className="text-red-600">−₹{refundDetails.cancellationFee}</span>
                  </span>
                </div>

                {/* Net refund */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-emerald-50">
                  <span className="font-extrabold text-gray-900 text-sm">Total Refund Amount</span>
                  <div className="text-right">
                    <span className="font-black text-emerald-600 text-xl">₹{refundDetails.netRefund}</span>
                    <p className="text-[9px] text-gray-400 mt-0.5">Credited to your original payment method</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs border border-gray-200 transition text-center"
                >
                  Keep Buzz Membership
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition text-center shadow-sm"
                >
                  Cancel &amp; Get Refund
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mock Subscription Gateway Modal */}
      {showMockSubscriptionCheckout && mockSubscriptionData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2500] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[500px] animate-scale-in text-slate-800">
            {/* Left Column: Payment Method Selection */}
            {mockGatewayStep === 'select' && (
              <div className="w-full md:w-2/5 bg-slate-50 border-r border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6 text-left">
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider font-display">buybee Subscriptions</span>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 text-left">Methods</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedMockMethod('upi-qr')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedMockMethod === 'upi-qr'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm shadow-amber-50'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      UPI Scan QR
                    </button>
                    <button
                      onClick={() => setSelectedMockMethod('upi-id')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedMockMethod === 'upi-id'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm shadow-amber-50'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                      </svg>
                      Pay via UPI ID
                    </button>
                    <button
                      onClick={() => setSelectedMockMethod('card')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedMockMethod === 'card'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm shadow-amber-50'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Debit/Credit Card
                    </button>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-4 mt-4 text-left">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Total Amount</span>
                  <span className="text-xl font-black text-slate-800">₹{mockSubscriptionData.amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Right Column: Dynamic screens depending on status */}
            <div className="flex-1 p-8 flex flex-col justify-between bg-white text-left">
              {mockGatewayStep === 'select' && (
                <>
                  <div className="flex-1 flex flex-col justify-center">
                    {selectedMockMethod === 'upi-qr' && (
                      <div className="text-center space-y-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 inline-block shadow-sm relative">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              `upi://pay?pa=pay@buybee&pn=Buybee%20Buzz%20Subscription&am=${mockSubscriptionData.amount}&cu=INR&tn=Buzz%20${selectedPlan}`
                            )}`}
                            alt="Scan to Pay"
                            className="mx-auto h-36 w-36"
                          />
                          <div className="absolute inset-0 border border-amber-500/25 rounded-2xl animate-pulse pointer-events-none" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-800">Scan QR Code to Pay</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Open GPay, PhonePe, Paytm, or BHIM app on your phone and scan the QR code to complete transfer.
                        </p>
                      </div>
                    )}

                    {selectedMockMethod === 'upi-id' && (
                      <div className="space-y-4 text-left">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 mb-1">Pay using UPI ID</h4>
                          <p className="text-xs text-slate-400">Enter your virtual payment address (VPA) to trigger a collect notification on your phone.</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">UPI VPA</label>
                          <input
                            type="text"
                            required
                            placeholder="username@okaxis"
                            value={mockUpiId}
                            onChange={(e) => setMockUpiId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {selectedMockMethod === 'card' && (
                      <div className="space-y-4 flex flex-col items-center">
                        {/* Visual Card simulation */}
                        <div className="relative h-28 w-48 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 p-3 text-white shadow-lg overflow-hidden flex flex-col justify-between border border-slate-700">
                          <div className="flex justify-between items-start w-full">
                            <div className="h-5 w-7 bg-amber-400/20 border border-amber-400/40 rounded-md flex items-center justify-center text-[7px] font-bold text-amber-500">CHIP</div>
                            <span className="font-bold text-[9px] tracking-widest text-amber-400 uppercase">{getCardBrand(mockCardForm.number)}</span>
                          </div>
                          <div className="font-mono text-xs tracking-widest text-slate-200 text-center">
                            {mockCardForm.number.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'}
                          </div>
                          <div className="flex justify-between items-end text-[9px] w-full">
                            <div className="truncate max-w-[80px]">
                              <div className="text-[5px] uppercase tracking-wider text-slate-500 font-semibold">Holder</div>
                              <div className="font-medium tracking-wide uppercase truncate">{mockCardForm.name || 'YOUR NAME'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[5px] uppercase tracking-wider text-slate-500 font-semibold">Expiry</div>
                              <div className="font-medium tracking-wide">{mockCardForm.expiry || 'MM/YY'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Card input fields */}
                        <div className="w-full grid grid-cols-2 gap-2 text-left">
                          <div className="col-span-2">
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Card Number</label>
                            <input
                              type="text"
                              maxLength="19"
                              placeholder="4111 2222 3333 4444"
                              value={mockCardForm.number}
                              onChange={(e) => setMockCardForm({ ...mockCardForm, number: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Cardholder Name</label>
                            <input
                              type="text"
                              placeholder="JOHN DOE"
                              value={mockCardForm.name}
                              onChange={(e) => setMockCardForm({ ...mockCardForm, name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Expiry</label>
                            <input
                              type="text"
                              placeholder="12/29"
                              value={mockCardForm.expiry}
                              onChange={(e) => setMockCardForm({ ...mockCardForm, expiry: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">CVV</label>
                            <input
                              type="password"
                              maxLength="3"
                              placeholder="•••"
                              value={mockCardForm.cvv}
                              onChange={(e) => setMockCardForm({ ...mockCardForm, cvv: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowMockSubscriptionCheckout(false)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMockSubscriptionAction}
                      disabled={
                        (selectedMockMethod === 'upi-id' && !mockUpiId) ||
                        (selectedMockMethod === 'card' && (!mockCardForm.number || !mockCardForm.cvv))
                      }
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-amber-100"
                    >
                      {selectedMockMethod === 'upi-qr' ? 'Verify QR Code Transfer' : 'Complete Payment'}
                    </button>
                  </div>
                </>
              )}

              {mockGatewayStep === 'processing' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                  <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Verifying Transfer...</h4>
                    <p className="text-xs text-slate-400 mt-1">Connecting to gateway security nodes. Please wait a moment.</p>
                  </div>
                </div>
              )}

              {mockGatewayStep === 'simulating' && (
                <div className="flex-1 flex flex-col justify-center space-y-6">
                  <div className="text-center">
                    <div className="h-12 w-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-sm text-slate-800">Authorize Simulated Payment</h4>
                    <p className="text-xs text-slate-400 mt-1">Select the transaction outcome to complete this payment verification simulation.</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleSimulateSubscriptionSuccess}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-green-150"
                    >
                      Simulate Success (Approve Payment)
                    </button>
                    <button
                      onClick={handleSimulateSubscriptionFailure}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-red-100"
                    >
                      Simulate Failure (Decline Payment)
                    </button>
                    <button
                      onClick={() => setMockGatewayStep('select')}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs py-2 rounded-xl transition border border-slate-200"
                    >
                      Back to Methods
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
