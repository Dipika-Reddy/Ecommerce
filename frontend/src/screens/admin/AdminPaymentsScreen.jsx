import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGetAllPaymentsQuery, useRefundPaymentMutation } from '../../features/api/ordersApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import CustomSelect from '../../components/CustomSelect';

const AdminPaymentsScreen = () => {
  const { data: payments, isLoading, error, refetch } = useGetAllPaymentsQuery();
  const [refundPayment, { isLoading: loadingRefund }] = useRefundPaymentMutation();

  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Refund dialog state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const statusBadgeColor = {
    SUCCESS: 'bg-green-100 text-green-700 border-green-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    FAILED: 'bg-red-100 text-red-700 border-red-200',
    REFUNDED: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const handleOpenRefund = (payment) => {
    setSelectedPayment(payment);
    const isCancelled = payment.order?.status === 'Cancelled';
    const maxRefund = isCancelled ? payment.order.itemsPrice : payment.amount;
    setRefundAmount(maxRefund);
    setRefundReason(isCancelled ? 'Refund for cancelled order (MRP only)' : 'Admin processed refund');
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      await refundPayment({
        paymentId: selectedPayment.id,
        amount: Number(refundAmount),
        reason: refundReason,
      }).unwrap();
      toast.success('Refund processed successfully!');
      setShowRefundModal(false);
      setSelectedPayment(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to process refund');
    }
  };

  // Filter payments
  const filteredPayments = payments
    ? payments.filter((pay) => {
        const matchesStatus = statusFilter === 'All' || pay.paymentStatus === statusFilter;
        
        const matchesMethod =
          methodFilter === 'All' ||
          pay.paymentMethod?.toLowerCase().includes(methodFilter.toLowerCase());

        const matchesDate =
          !dateFilter ||
          new Date(pay.createdAt).toDateString() === new Date(dateFilter).toDateString();

        return matchesStatus && matchesMethod && matchesDate;
      })
    : [];

  // Export report to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.info('No transactions to export');
      return;
    }

    const headers = ['Payment ID', 'Order ID', 'Customer Name', 'Customer Email', 'Amount', 'Method', 'Gateway', 'Status', 'Date'];
    const rows = filteredPayments.map((pay) => [
      pay.id,
      pay.orderId,
      pay.user?.name || 'Guest',
      pay.user?.email || 'N/A',
      pay.amount,
      pay.paymentMethod,
      pay.gateway,
      pay.paymentStatus,
      new Date(pay.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payments_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <Loader />;
  if (error) return <Message variant="danger">{error?.data?.message || 'Failed to load payments'}</Message>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments Audit Ledger</h1>
          <p className="text-sm text-gray-500">Audit, filter, and process refunds for customer transactions</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2.5 transition flex items-center gap-1.5 shadow-sm shadow-brand-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Report
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Payment Status</label>
          <CustomSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'SUCCESS', label: 'Success' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'REFUNDED', label: 'Refunded' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Payment Method</label>
          <CustomSelect
            value={methodFilter}
            onChange={(v) => setMethodFilter(v)}
            options={[
              { value: 'All', label: 'All Methods' },
              { value: 'upi', label: 'UPI / GPay / Paytm' },
              { value: 'card', label: 'Cards (Debit / Credit)' },
              { value: 'cod', label: 'Cash on Delivery' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Transaction Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Ledger Table */}
      {payments && payments.length === 0 ? (
        <div className="mt-4">
          <Message variant="info">No payments yet</Message>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="mt-4">
          <Message variant="info">No payment records found matching the filters</Message>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Seller</th>
                <th className="px-5 py-4">Order Link</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Method &amp; Gateway</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Transaction Date</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800 text-sm leading-snug">{pay.user?.name || 'Guest'}</p>
                    <p className="text-xs text-slate-400">{pay.user?.email || 'N/A'}</p>
                  </td>
                  <td className="px-5 py-4">
                    {pay.sellerNames && pay.sellerNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {pay.sellerNames.map((name) => (
                          <span key={name} className="inline-flex items-center bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Link to={`/order/${pay.orderId}`} className="text-brand-650 font-semibold hover:underline text-xs bg-brand-50 border border-brand-100 px-2 py-1 rounded">
                      Order Details
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    ₹{pay.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-700 text-xs">{pay.paymentMethod}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{pay.gateway}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeColor[pay.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
                      {pay.paymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {new Date(pay.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-5 py-4">
                    {(pay.paymentStatus === 'SUCCESS' || pay.paymentStatus === 'PARTIALLY_REFUNDED') ? (
                      <button
                        onClick={() => handleOpenRefund(pay)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 hover:border-red-300 font-bold text-xs px-3 py-1.5 rounded-xl transition duration-150"
                      >
                        Refund
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Process Refund</h3>
            <p className="text-xs text-slate-400 mb-4">Refund payment for transaction ID: <span className="font-mono">{selectedPayment.transactionId || selectedPayment.id}</span></p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Refund Amount (Max ₹{selectedPayment.order?.status === 'Cancelled' ? selectedPayment.order.itemsPrice.toFixed(2) : selectedPayment.amount.toFixed(2)})
                </label>
                {selectedPayment.order?.status === 'Cancelled' && (
                  <p className="text-[11px] text-red-500 font-semibold mb-2 leading-relaxed">
                    ⚠️ Order is Cancelled: Tax (₹{selectedPayment.order.taxPrice.toFixed(2)}) and Shipping fee (₹{selectedPayment.order.shippingPrice.toFixed(2)}) are non-refundable. Refund is capped at the items MRP (₹{selectedPayment.order.itemsPrice.toFixed(2)}).
                  </p>
                )}
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedPayment.order?.status === 'Cancelled' ? selectedPayment.order.itemsPrice : selectedPayment.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Reason for Refund</label>
                <textarea
                  required
                  rows="3"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white resize-none"
                  placeholder="Enter reason for processing this refund..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 py-2.5 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingRefund}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-red-100 disabled:opacity-50"
                >
                  {loadingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentsScreen;
