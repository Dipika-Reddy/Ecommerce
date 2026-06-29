import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGetOrdersQuery, usePayOrderMutation } from '../../features/api/ordersApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import CustomSelect from '../../components/CustomSelect';

const DeliveryPaymentsScreen = () => {
  const { data: orders, isLoading, error, refetch } = useGetOrdersQuery();
  const [payOrder, { isLoading: isPaying }] = usePayOrderMutation();

  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentMethods, setPaymentMethods] = useState({});

  // Separate into unpaid and paid orders
  const unpaidOrders = orders ? orders.filter((order) => !order.isPaid) : [];
  const paidOrders = orders ? orders.filter((order) => order.isPaid) : [];

  const PAYMENT_METHODS = [
    { value: 'Cash on Delivery', label: 'Cash' },
    { value: 'UPI on Delivery', label: 'UPI QR' },
    { value: 'Card on Delivery', label: 'Card Machine' },
  ];

  const handleAmountChange = (orderId, amount) => {
    setPaymentAmounts((prev) => ({ ...prev, [orderId]: amount }));
  };

  const handleMethodChange = (orderId, method) => {
    setPaymentMethods((prev) => ({ ...prev, [orderId]: method }));
  };

  const handleSubmitPayment = async (orderId, expectedAmount) => {
    const amount = paymentAmounts[orderId] || expectedAmount;
    const method = paymentMethods[orderId] || 'Cash on Delivery';

    if (window.confirm(`Confirm payment of ₹${amount} via ${method}?`)) {
      try {
        await payOrder({
          orderId,
          details: {
            status: 'COMPLETED',
            amount: Number(amount),
            method: method,
            id: `DELIVERY-${Date.now()}`,
          },
        }).unwrap();
        toast.success(`Payment of ₹${amount} processed successfully`);
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to process payment');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Manage Delivery Payments</h1>
      <p className="mb-6 text-sm text-gray-500">Record payments collected from customers during delivery.</p>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message}</Message>
      ) : (
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Collections</h2>
            {unpaidOrders.length === 0 ? (
              <Message variant="info">There are no unpaid orders assigned to you.</Message>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer & Address</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Amount Collected (₹)</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidOrders.map((order) => (
                      <tr key={order._id} className="border-t">
                        <td className="px-4 py-3 font-mono text-xs align-top">{order._id.slice(-8)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-bold">{order.user?.name || 'Deleted user'}</div>
                          {order.user?.phoneNumber && (
                            <div className="text-xs text-gray-500 mt-0.5">📞 {order.user.phoneNumber}</div>
                          )}
                          {order.shippingAddress && (
                            <div className="text-xs text-gray-500 mt-1">
                              {order.shippingAddress.address}, {order.shippingAddress.city}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top font-bold text-gray-900">
                          ₹{order.totalPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="number"
                            step="0.01"
                            className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            value={paymentAmounts[order._id] !== undefined ? paymentAmounts[order._id] : order.totalPrice}
                            onChange={(e) => handleAmountChange(order._id, e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="w-40">
                            <CustomSelect
                              value={paymentMethods[order._id] || 'Cash on Delivery'}
                              onChange={(val) => handleMethodChange(order._id, val)}
                              options={PAYMENT_METHODS}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            disabled={isPaying}
                            onClick={() => handleSubmitPayment(order._id, order.totalPrice)}
                            className="rounded bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 shadow-sm transition-colors"
                          >
                            Submit Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Completed Payments</h2>
            {paidOrders.length === 0 ? (
              <Message variant="info">No payments have been completed yet.</Message>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Total Paid</th>
                      <th className="px-4 py-3">Date Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidOrders.map((order) => (
                      <tr key={order._id} className="border-t bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{order._id.slice(-8)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-700">{order.user?.name || 'Deleted user'}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-green-600">
                          ₹{order.totalPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {order.paidAt ? new Date(order.paidAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPaymentsScreen;
