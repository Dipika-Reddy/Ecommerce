import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetOrderDetailsQuery,
  useCreatePaymentOrderMutation,
  useVerifyPaymentSignatureMutation,
  useUpdateOrderStatusMutation,
  useRefundPaymentMutation,
  useRequestReturnMutation,
  useApproveReturnMutation,
  useCompleteReturnMutation,
  useProcessRefundMutation,
} from '../features/api/ordersApiSlice';
import { useUploadProductImageMutation } from '../features/api/productsApiSlice';
import Loader from '../components/Loader';
import Message from '../components/Message';
import CustomSelect from '../components/CustomSelect';
import AssignAgentModal from '../components/AssignAgentModal';
import { isSellerUser, isSuperAdminUser, isSupportUser } from '../utils/userRoles';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const statusColor = {
  Pending: 'bg-gray-100 text-gray-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-amber-100 text-amber-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

// Dynamically load the Razorpay checkout.js script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const { userInfo } = useSelector((state) => state.auth);
  const canManageOrder = isSellerUser(userInfo) || isSuperAdminUser(userInfo) || userInfo?.isAdmin || isSupportUser(userInfo);

  const { data: order, isLoading, error, refetch } = useGetOrderDetailsQuery(orderId);
  const [createPaymentOrder, { isLoading: loadingCreatePayment }] = useCreatePaymentOrderMutation();
  const [verifyPaymentSignature, { isLoading: loadingVerifySignature }] = useVerifyPaymentSignatureMutation();
  const [updateStatus, { isLoading: loadingStatus }] = useUpdateOrderStatusMutation();
  const [refundPayment, { isLoading: loadingRefund }] = useRefundPaymentMutation();

  const [requestReturn, { isLoading: loadingRequestReturn }] = useRequestReturnMutation();
  const [approveReturn, { isLoading: loadingApproveReturn }] = useApproveReturnMutation();
  const [completeReturn, { isLoading: loadingCompleteReturn }] = useCompleteReturnMutation();
  const [processRefund, { isLoading: loadingProcessRefund }] = useProcessRefundMutation();

  useEffect(() => {
    if (order && !order.isPaid && order.paymentMethod === 'UPI') {
      const timer = setTimeout(async () => {
        try {
          await verifyPaymentSignature({
            razorpay_order_id: `mock_order_${Date.now()}`,
            razorpay_payment_id: `mock_pay_${Date.now()}`,
            razorpay_signature: 'mock_sig',
            orderId: order._id,
          }).unwrap();
          toast.success('UPI Payment auto-verified successfully!');
          refetch();
        } catch (err) {
          toast.error(err?.data?.message || 'Automatic transaction verification failed');
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [order, verifyPaymentSignature, refetch]);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const successPayment = order?.payments?.find(
    (p) => p.paymentStatus === 'SUCCESS' || p.paymentStatus === 'PARTIALLY_REFUNDED'
  );

  const handleOpenRefund = () => {
    if (!successPayment) return;
    const maxRefund = order.status === 'Cancelled' ? order.itemsPrice : successPayment.amount;
    setRefundAmount(maxRefund);
    setRefundReason(order.status === 'Cancelled' ? 'Refund for cancelled order (MRP only)' : 'Admin processed refund');
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!successPayment) return;

    try {
      await refundPayment({
        paymentId: successPayment.id,
        amount: Number(refundAmount),
        reason: refundReason,
      }).unwrap();
      toast.success('Refund processed successfully!');
      setShowRefundModal(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to process refund');
    }
  };

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnImage, setReturnImage] = useState('');
  const [refundDetails, setRefundDetails] = useState('');
  const [returnImageLoading, setReturnImageLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const [uploadProductImage, { isLoading: loadingUpload }] = useUploadProductImageMutation();

  const uploadReturnFileHandler = async (e) => {
    const formData = new FormData();
    formData.append('image', e.target.files[0]);
    try {
      const res = await uploadProductImage(formData).unwrap();
      setReturnImage(res.image);
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const handleRequestReturn = async (e) => {
    e.preventDefault();
    if (order.paymentMethod === 'Cash on Delivery' && !refundDetails) {
      toast.error('Please provide refund details for COD orders');
      return;
    }
    try {
      await requestReturn({ orderId, reason: returnReason, returnImage, refundDetails }).unwrap();
      toast.success('Return requested successfully!');
      setShowReturnModal(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to request return');
    }
  };

  const handleApproveReturn = async () => {
    try {
      await approveReturn(orderId).unwrap();
      toast.success('Return approved successfully!');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve return');
    }
  };

  const handleCompleteReturn = async () => {
    try {
      await completeReturn(orderId).unwrap();
      toast.success('Return marked as collected!');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to complete return');
    }
  };

  const handleProcessRefund = async () => {
    try {
      await processRefund(orderId).unwrap();
      toast.success('Refund processed successfully for the returned order!');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to process refund');
    }
  };

  const [newStatus, setNewStatus] = useState('');

  // Mock Payment Portal State
  const [showMockGateway, setShowMockGateway] = useState(false);
  const [mockGatewayStep, setMockGatewayStep] = useState('select'); // 'select', 'processing', 'simulating'
  const [selectedMockMethod, setSelectedMockMethod] = useState('upi-qr'); // 'upi-qr', 'upi-id', 'card'
  const [mockCardForm, setMockCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [mockUpiId, setMockUpiId] = useState('');
  const [mockPaymentOrderData, setMockPaymentOrderData] = useState(null);

  const handleMockPaymentAction = () => {
    setMockGatewayStep('processing');
    setTimeout(() => {
      setMockGatewayStep('simulating');
    }, 1500);
  };

  const handleSimulateSuccess = async () => {
    try {
      setShowMockGateway(false);
      await verifyPaymentSignature({
        razorpay_order_id: mockPaymentOrderData.razorpayOrderId,
        razorpay_payment_id: `mock_pay_${Date.now()}`,
        razorpay_signature: 'mock_sig',
        orderId: orderId,
      }).unwrap();
      toast.success('Mock Payment successful — order marked as Paid');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Payment signature verification failed');
    }
  };

  const handleSimulateFailure = () => {
    setShowMockGateway(false);
    toast.error('Mock Payment transaction was declined / failed');
  };

  const getCardBrand = (num) => {
    if (!num) return 'Card';
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5')) return 'Mastercard';
    if (num.startsWith('6')) return 'RuPay';
    if (num.startsWith('3')) return 'Amex';
    return 'Card';
  };

  // Triggers the Razorpay SDK checkout flow
  const payHandler = async () => {
    const res = await loadRazorpayScript();
    if (!res) {
      toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
      return;
    }

    try {
      // 1. Create order on the server
      const paymentOrderData = await createPaymentOrder(orderId).unwrap();
      
      // If it is in mock fallback mode
      if (paymentOrderData.isMock) {
        setMockPaymentOrderData(paymentOrderData);
        setMockGatewayStep('select');
        setSelectedMockMethod('upi-qr');
        setMockCardForm({ number: '', name: '', expiry: '', cvv: '' });
        setMockUpiId('');
        setShowMockGateway(true);
        return;
      }

      // 2. Configure and open Razorpay Checkout overlay
      const options = {
        key: paymentOrderData.keyId,
        amount: Math.round(paymentOrderData.amount * 100),
        currency: paymentOrderData.currency,
        name: 'Buybee',
        description: `Payment for Order #${orderId}`,
        order_id: paymentOrderData.razorpayOrderId,
        handler: async function (response) {
          try {
            await verifyPaymentSignature({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderId,
            }).unwrap();
            toast.success('Payment successful — order marked as Paid');
            refetch();
          } catch (err) {
            toast.error(err?.data?.message || 'Payment signature verification failed');
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

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to initialize payment gateway');
    }
  };

  const updateStatusHandler = async () => {
    if (!newStatus) return;
    try {
      await updateStatus({ orderId, status: newStatus }).unwrap();
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  if (isLoading) return <Loader />;
  if (error)
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Message variant="danger">{error?.data?.message || 'Order not found'}</Message>
      </div>
    );

  const isOrderOwner = userInfo._id === order.user._id || userInfo.id === order.user.id || userInfo._id === order.user || userInfo.id === order.user;

  let displayStatus = order.status;
  let currentStatusColor = statusColor[order.status] || 'bg-gray-100 text-gray-700';

  if (order.isRefunded) {
    displayStatus = 'Returned';
    currentStatusColor = 'bg-fuchsia-100 text-fuchsia-700';
  } else if (order.returnStatus === 'Collected') {
    displayStatus = 'Return Successful';
    currentStatusColor = 'bg-teal-100 text-teal-700';
  } else if (order.returnStatus === 'Approved') {
    displayStatus = 'Return Approved';
    currentStatusColor = 'bg-blue-100 text-blue-700';
  } else if (order.returnStatus === 'Requested') {
    displayStatus = 'Return Requested';
    currentStatusColor = 'bg-orange-100 text-orange-700';
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div id="invoice-content" className="bg-transparent pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Summary</h1>
            <p className="text-xs text-gray-400">ID: #{order._id}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatusColor}`}>
            {displayStatus}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <div className="rounded-md border bg-white p-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="mb-2 font-bold text-gray-800">Shipping &amp; Delivery</h2>
                  <p className="text-sm text-gray-600">
                    <strong>Address: </strong>{order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                    {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                  </p>
                  {order.shippingAddress.deliveryMethod && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Method: </strong>{order.shippingAddress.deliveryMethod}
                    </p>
                  )}
                  {order.shippingAddress.phoneNumber && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Phone: </strong>
                      <a href={`tel:${order.shippingAddress.phoneNumber}`} className="text-blue-600 hover:underline">
                        {order.shippingAddress.phoneNumber}
                      </a>
                    </p>
                  )}
                </div>
                {userInfo?.isDeliveryAgent && (
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent([
                      order.shippingAddress.address || order.shippingAddress.doorNo,
                      order.shippingAddress.street,
                      order.shippingAddress.area,
                      order.shippingAddress.city,
                      order.shippingAddress.postalCode || order.shippingAddress.pinCode,
                      order.shippingAddress.country
                    ].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 p-2.5 rounded-xl transition-colors shrink-0 shadow-sm"
                  >
                    <svg className="w-5 h-5 mb-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Open Map</span>
                  </a>
                )}
              </div>
              <div className="mt-3 no-print">
                {order.isDelivered ? (
                  <Message variant="success">Delivered on {new Date(order.deliveredAt).toLocaleString()}</Message>
                ) : (
                  <Message variant="info">Not yet delivered</Message>
                )}
              </div>
            </div>

            {/* Agent Info Section */}
            {(isSuperAdminUser(userInfo) || userInfo.isAdmin || isSupportUser(userInfo) || isSellerUser(userInfo) || (isOrderOwner && order.deliveryAgent)) && (
              <div className="rounded-md border bg-white p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold text-gray-800">Delivery Agent</h2>
                  {(isSuperAdminUser(userInfo) || userInfo.isAdmin || isSupportUser(userInfo) || isSellerUser(userInfo)) && (
                    <button
                      onClick={() => setAssignModalOpen(true)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 border border-brand-200 hover:border-brand-300 rounded px-2 py-1 transition-colors"
                    >
                      {order.deliveryAgent ? 'Change Agent' : 'Assign Agent'}
                    </button>
                  )}
                </div>
                {order.deliveryAgent ? (
                  <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100 flex flex-col gap-1">
                    <p className="text-sm font-semibold text-slate-800">{order.deliveryAgent.name}</p>
                    {order.assignedBy && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold w-fit mt-0.5 mb-1 block">
                        {order.assignedBy}
                      </span>
                    )}
                    <div className="flex gap-4 text-xs text-slate-600 mt-1">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <a href={`tel:${order.deliveryAgent.phoneNumber}`} className="hover:underline">{order.deliveryAgent.phoneNumber || 'N/A'}</a>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <a href={`mailto:${order.deliveryAgent.email}`} className="hover:underline">{order.deliveryAgent.email}</a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No delivery agent assigned yet.</p>
                )}
              </div>
            )}

            <div className="rounded-md border bg-white p-4">
              <h2 className="mb-2 font-bold text-gray-800">Payment Method</h2>
              <p className="text-sm text-gray-600">{order.paymentMethod}</p>
              <div className="mt-2">
                {order.isPaid ? (
                  <Message variant="success">
                    {order.paymentMethod === 'Cash on Delivery' ? 'Paid on Delivery' : 'Paid'} on {new Date(order.paidAt).toLocaleString()}
                  </Message>
                ) : order.paymentMethod === 'Cash on Delivery' ? (
                  <Message variant="info">Pending Payment — Paid on Delivery</Message>
                ) : (
                  <Message variant="danger">Not Paid</Message>
                )}
              </div>
              {!order.isPaid && order.paymentMethod === 'UPI' && (
                <div className="mt-4 border-t pt-4 text-center space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 inline-block shadow-sm relative">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=pay@buybee&pn=Buybee%20E-Commerce&am=${order.totalPrice}&cu=INR&tn=Order%20${order._id}`
                      )}`}
                      alt="Scan to Pay"
                      className="mx-auto h-36 w-36"
                    />
                    <div className="absolute inset-0 border border-brand-500/25 rounded-2xl animate-pulse pointer-events-none" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">Scan QR Code to Pay</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Open GPay, PhonePe, Paytm, or BHIM app on your phone and scan the QR code to complete transfer.
                  </p>
                  <div className="flex justify-center items-center gap-2 text-xs font-semibold text-brand-650 bg-brand-50/50 border border-brand-100 p-2.5 rounded-xl">
                    <div className="h-3.5 w-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span>Auto-verifying transaction... please scan and pay</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border bg-white p-4">
              <h2 className="mb-3 font-bold text-gray-800">Order Items</h2>
              <div className="space-y-3">
                {order.orderItems.map((item) => (
                  <div key={`${item.product}-${item.size}-${item.color}`} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover" />
                    <Link to={`/product/${item.product}`} className="flex-1 text-sm hover:underline">
                      {item.name} {item.size && `(${item.size})`} {item.color && `(${item.color})`}
                    </Link>
                    <span className="text-sm text-gray-600">
                      {item.qty} x ₹{item.price.toFixed(2)} = ₹{(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-fit space-y-4">
            <div className="rounded-md border bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">Pricing Breakdown</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>₹{order.itemsPrice.toFixed(2)}</span>
                </div>
                {order.couponCode && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon ({order.couponCode})</span>
                    <span>-₹{order.couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{order.shippingPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{order.taxPrice.toFixed(2)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>₹{order.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer-facing payment gateway trigger */}
              {!order.isPaid && order.paymentMethod !== 'Cash on Delivery' && order.paymentMethod !== 'UPI' && isOrderOwner && (
                <button
                  onClick={payHandler}
                  disabled={loadingCreatePayment || loadingVerifySignature}
                  className="mt-5 w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-white transition duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-orange-100 no-print"
                >
                  {loadingCreatePayment || loadingVerifySignature ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {loadingCreatePayment ? 'Initializing checkout...' : 'Verifying signature...'}
                    </>
                  ) : (
                    'Pay Now with Razorpay'
                  )}
                </button>
              )}

              {/* Print invoice button */}
              {order.isPaid && (
                <button
                  onClick={() => window.print()}
                  className="mt-4 w-full rounded-xl bg-slate-100 border border-slate-350 hover:bg-slate-200 py-3 font-semibold text-slate-700 transition duration-150 flex items-center justify-center gap-1.5 no-print"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Invoice
                </button>
              )}
            </div>

            {/* Admin-only delivery status control */}
            {canManageOrder && (
              <div className="rounded-md border bg-white p-5 no-print overflow-hidden">
                <h2 className="mb-3 text-sm font-bold text-gray-800">Admin: Update Status</h2>
                <div className="mb-3">
                  <CustomSelect
                    value={newStatus}
                    onChange={(val) => setNewStatus(val)}
                    options={['', ...STATUS_OPTIONS].map((s) => ({ value: s, label: s || 'Select new status...' }))}
                    placeholder="Select new status..."
                  />
                </div>
                <button
                  onClick={updateStatusHandler}
                  disabled={!newStatus || loadingStatus}
                  className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Update Status
                </button>
              </div>
            )}

            {/* Return & Refund tracking */}
            {((order.status === 'Delivered' && isOrderOwner) || order.returnStatus) && (
              <div className="rounded-md border bg-white p-5 no-print overflow-hidden mt-4">
                <h2 className="mb-3 text-sm font-bold text-gray-800">Return & Refund</h2>
                
                {order.returnStatus ? (
                  <div className="space-y-3">
                    <p className="text-sm">
                      <strong>Status: </strong> 
                      <span className="text-brand-600 font-bold">{order.isRefunded ? 'Refunded' : (order.returnStatus === 'Collected' ? 'Successful' : order.returnStatus)}</span>
                    </p>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">Reason for Return</h4>
                    <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100">{order.returnReason}</p>
                    {order.refundDetails && (
                      <>
                        <h4 className="text-sm font-semibold text-gray-800 mb-1 mt-2">Refund Details (UPI/Bank)</h4>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100">{order.refundDetails}</p>
                      </>
                    )}
                    {order.returnImage && (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-gray-800 mb-1">Attached Image</h4>
                        <img src={order.returnImage} alt="Return attachment" className="max-h-32 rounded object-cover border border-gray-200" />
                      </div>
                    )}

                    {canManageOrder && order.returnStatus === 'Requested' && (
                      <button
                        onClick={handleApproveReturn}
                        disabled={loadingApproveReturn}
                        className="w-full mt-2 rounded-md bg-amber-500 hover:bg-amber-600 py-2 text-sm font-semibold text-white transition duration-150 shadow-sm"
                      >
                        {loadingApproveReturn ? 'Processing...' : 'Approve Return'}
                      </button>
                    )}

                    {userInfo?.isDeliveryAgent && order.returnStatus === 'Approved' && (
                      <button
                        onClick={handleCompleteReturn}
                        disabled={loadingCompleteReturn}
                        className="w-full mt-2 rounded-md bg-blue-600 hover:bg-blue-700 py-2 text-sm font-semibold text-white transition duration-150 shadow-sm"
                      >
                        {loadingCompleteReturn ? 'Processing...' : 'Mark Return Successful'}
                      </button>
                    )}



                    {canManageOrder && order.returnStatus === 'Collected' && !order.isRefunded && (
                      <button
                        onClick={handleProcessRefund}
                        disabled={loadingProcessRefund}
                        className="w-full mt-2 rounded-md bg-green-600 hover:bg-green-700 py-2 text-sm font-semibold text-white transition duration-150 shadow-sm"
                      >
                        {loadingProcessRefund ? 'Processing...' : 'Process Refund'}
                      </button>
                    )}

                    {order.isRefunded && (
                      <div className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 p-2 rounded-lg text-center mt-2">
                        ✓ Refund Processed
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="w-full rounded-md bg-slate-100 hover:bg-slate-200 py-2 text-sm font-semibold text-slate-700 transition duration-150 border border-slate-300 shadow-sm"
                  >
                    Request Return
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mock Gateway Modal */}
      {showMockGateway && mockPaymentOrderData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row h-auto md:h-[500px] max-h-[90vh] md:max-h-none animate-scale-in">
            {/* Left Column: Payment Method Selection */}
            {mockGatewayStep === 'select' && (
              <div className="w-full md:w-2/5 bg-slate-50 border-r border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <svg className="h-5 w-5 text-brand-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider font-display">buybee Pay</span>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Methods</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedMockMethod('upi-qr')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedMockMethod === 'upi-qr'
                          ? 'border-brand-500 bg-brand-50 text-brand-650 shadow-sm shadow-brand-50'
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
                          ? 'border-brand-500 bg-brand-50 text-brand-650 shadow-sm shadow-brand-50'
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
                          ? 'border-brand-500 bg-brand-50 text-brand-650 shadow-sm shadow-brand-50'
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
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Total Amount</span>
                  <span className="text-xl font-black text-slate-800">₹{order.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Right Column: Dynamic screens depending on status */}
            <div className="flex-1 p-8 flex flex-col justify-between bg-white">
              {mockGatewayStep === 'select' && (
                <>
                  <div className="flex-1 flex flex-col justify-center">
                    {selectedMockMethod === 'upi-qr' && (
                      <div className="text-center space-y-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 inline-block shadow-sm relative">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              `upi://pay?pa=pay@buybee&pn=Buybee%20E-Commerce&am=${order.totalPrice}&cu=INR&tn=Order%20${order._id}`
                            )}`}
                            alt="Scan to Pay"
                            className="mx-auto h-36 w-36"
                          />
                          <div className="absolute inset-0 border border-brand-500/25 rounded-2xl animate-pulse pointer-events-none" />
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
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">UPI VPA</label>
                          <input
                            type="text"
                            required
                            placeholder="username@okaxis"
                            value={mockUpiId}
                            onChange={(e) => setMockUpiId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {selectedMockMethod === 'card' && (
                      <div className="space-y-4 flex flex-col items-center">
                        {/* Visual Card simulation */}
                        <div className="relative h-28 w-48 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 p-3 text-white shadow-lg overflow-hidden flex flex-col justify-between border border-slate-700">
                          <div className="flex justify-between items-start">
                            <div className="h-5 w-7 bg-amber-400/20 border border-amber-400/40 rounded-md flex items-center justify-center text-[7px] font-bold text-amber-500">CHIP</div>
                            <span className="font-bold text-[9px] tracking-widest text-orange-400 uppercase">{getCardBrand(mockCardForm.number)}</span>
                          </div>
                          <div className="font-mono text-xs tracking-widest text-slate-200 text-center">
                            {mockCardForm.number.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'}
                          </div>
                          <div className="flex justify-between items-end text-[9px]">
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
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500 focus:bg-white font-medium"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Cardholder Name</label>
                            <input
                              type="text"
                              placeholder="JOHN DOE"
                              value={mockCardForm.name}
                              onChange={(e) => setMockCardForm({ ...mockCardForm, name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500 focus:bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Expiry</label>
                            <input
                              type="text"
                              placeholder="12/29"
                              value={mockCardForm.expiry}
                              onChange={(e) => setMockCardForm({ ...mockCardForm, expiry: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500 focus:bg-white font-medium"
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
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500 focus:bg-white font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowMockGateway(false)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMockPaymentAction}
                      disabled={
                        (selectedMockMethod === 'upi-id' && !mockUpiId) ||
                        (selectedMockMethod === 'card' && (!mockCardForm.number || !mockCardForm.cvv))
                      }
                      className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-brand-100"
                    >
                      {selectedMockMethod === 'upi-qr' ? 'Verify QR Code Transfer' : 'Complete Payment'}
                    </button>
                  </div>
                </>
              )}

              {mockGatewayStep === 'processing' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                  <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
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
                      onClick={handleSimulateSuccess}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-green-150"
                    >
                      Simulate Success (Approve Payment)
                    </button>
                    <button
                      onClick={handleSimulateFailure}
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
      {/* Refund Modal */}
      {showRefundModal && successPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Process Refund</h3>
            <p className="text-xs text-slate-400 mb-4">Refund payment for order transaction ID: <span className="font-mono">{successPayment.transactionId || successPayment.id}</span></p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                  Refund Amount (Max ₹{order.status === 'Cancelled' ? order.itemsPrice.toFixed(2) : successPayment.amount.toFixed(2)})
                </label>
                {order.status === 'Cancelled' && (
                  <p className="text-[11px] text-red-500 font-semibold mb-2 leading-relaxed text-left">
                    ⚠️ Order Cancelled: Tax (₹{order.taxPrice.toFixed(2)}) and Shipping fee (₹{order.shippingPrice.toFixed(2)}) are non-refundable. Only the items MRP (₹{order.itemsPrice.toFixed(2)}) will be returned.
                  </p>
                )}
                <input
                  type="number"
                  step="0.01"
                  required
                  max={order.status === 'Cancelled' ? order.itemsPrice : successPayment.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white font-medium"
                />
              </div>

              <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">Reason for Refund</label>
                <textarea
                  required
                  rows="3"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white resize-none font-medium text-xs"
                  placeholder="Enter reason for processing this refund..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefundModal(false);
                  }}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingRefund}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-red-100 disabled:opacity-50"
                >
                  {loadingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Request Return</h3>
            <p className="text-xs text-slate-400 mb-4">Please provide a reason for returning this order.</p>

            <form onSubmit={handleRequestReturn} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Reason</label>
                <textarea
                  required
                  rows="3"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white resize-none font-medium"
                  placeholder="Tell us why you want to return this..."
                ></textarea>
              </div>

              <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Add Photo (Required)</label>
                <input
                  type="file"
                  id="return-image-upload"
                  accept="image/*"
                  onChange={uploadReturnFileHandler}
                  required
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition"
                />
                {loadingUpload && <Loader />}
                {returnImage && (
                  <div className="relative inline-block mt-2">
                    <img src={returnImage} alt="Preview" className="max-h-24 rounded object-cover border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => {
                        setReturnImage('');
                        document.getElementById('return-image-upload').value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {order.paymentMethod === 'Cash on Delivery' && (
                <div className="text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Refund Payment Details (Required)</label>
                  <p className="text-[10px] text-slate-500 mb-2">Since this was a Cash on Delivery order, please provide your UPI ID or Bank Account Details to receive your refund.</p>
                  <textarea
                    required
                    rows="2"
                    value={refundDetails}
                    onChange={(e) => setRefundDetails(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white resize-none font-medium"
                    placeholder="e.g. UPI: 9876543210@ybl OR Acct: 12345678, IFSC: ABCD0001234"
                  ></textarea>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingRequestReturn}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center shadow-md disabled:opacity-50"
                >
                  {loadingRequestReturn ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {assignModalOpen && (
        <AssignAgentModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          orderId={order._id}
          currentAgentId={order.deliveryAgent?.id || order.deliveryAgentId}
          shippingAddress={order.shippingAddress}
        />
      )}
    </div>
  );
};

export default OrderScreen;
