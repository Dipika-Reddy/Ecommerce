import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from '../../features/api/ordersApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import CustomSelect from '../../components/CustomSelect';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const statusColor = {
  Pending: 'bg-gray-100 text-gray-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-amber-100 text-amber-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const OrderListScreen = () => {
  const { data: orders, isLoading, error, refetch } = useGetOrdersQuery();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [savingId, setSavingId] = useState(null);

  const statusChangeHandler = async (orderId, status) => {
    setSavingId(orderId);
    try {
      await updateOrderStatus({ orderId, status }).unwrap();
      toast.success(`Order updated to ${status}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update order');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold text-gray-900">All Orders</h1>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message}</Message>
      ) : orders.length === 0 ? (
        <Message variant="info">No orders have been placed yet.</Message>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
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
                  <td className="px-4 py-3">{order.user?.name || 'Deleted user'}</td>
                  <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">₹{order.totalPrice.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {order.isPaid ? (
                      <span className="text-green-600">✓ Paid</span>
                    ) : (
                      <span className="text-red-500">✗ Unpaid</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CustomSelect
                      value={order.status}
                      disabled={savingId === order._id}
                      onChange={(val) => statusChangeHandler(order._id, val)}
                      options={STATUS_OPTIONS}
                      className={`text-xs font-semibold rounded-full border-0 ${statusColor[order.status]}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/order/${order._id}`} className="font-medium text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderListScreen;
