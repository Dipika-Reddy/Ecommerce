import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGetOrdersQuery, useUpdateOrderStatusMutation, usePayOrderMutation, useCompleteReturnMutation } from '../../features/api/ordersApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import { useSelector } from 'react-redux';
import CustomSelect from '../../components/CustomSelect';
import AssignAgentModal from '../../components/AssignAgentModal';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const statusColor = {
  Pending: 'bg-gray-100 text-gray-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-amber-100 text-amber-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const OrderListScreen = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const { data: orders, isLoading, error, refetch } = useGetOrdersQuery();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [payOrder] = usePayOrderMutation();
  const [completeReturn] = useCompleteReturnMutation();
  const [savingId, setSavingId] = useState(null);
  
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState(null);

  const DELIVERY_STATUS_OPTIONS = ['Shipped', 'Delivered'];

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

  const completeReturnHandler = async (orderId) => {
    setSavingId(orderId);
    try {
      await completeReturn(orderId).unwrap();
      toast.success('Return marked as successful!');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to complete return');
    } finally {
      setSavingId(null);
    }
  };

  const markAsPaidHandler = async (orderId) => {
    if (window.confirm('Mark this order as paid?')) {
      try {
        await payOrder({ orderId, details: { status: 'COMPLETED' } }).unwrap();
        toast.success('Order marked as paid');
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to mark as paid');
      }
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
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                {!userInfo?.isDeliveryAgent && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs align-top">{order._id.slice(-8)}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold">{order.user?.name || 'Deleted user'}</div>
                    {order.shippingAddress && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        📍 {order.shippingAddress.address}, {order.shippingAddress.city} {order.shippingAddress.postalCode}
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
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 ml-2 font-medium bg-blue-50 px-1.5 py-0.5 rounded"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Map
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {order.user?.phoneNumber ? (
                      <a href={`tel:${order.user.phoneNumber}`} className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {order.user.phoneNumber}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Not provided</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 align-top">
                    <div>₹{order.totalPrice.toFixed(2)}</div>
                    {userInfo?.isDeliveryAgent && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {order.paymentMethod === 'Cash on Delivery' ? 'Cash on Delivery' : 'Prepaid'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {order.isPaid ? (
                      <span className="text-green-600 font-medium">✓ Paid</span>
                    ) : (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-red-500 font-medium">✗ Unpaid</span>
                        {userInfo?.isDeliveryAgent && (
                          <button
                            onClick={() => markAsPaidHandler(order._id)}
                            className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded hover:bg-brand-600"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {!userInfo?.isDeliveryAgent ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-semibold text-slate-700">
                          {order.deliveryAgent ? order.deliveryAgent.name : 'Unassigned'}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedOrderToAssign(order);
                            setAssignModalOpen(true);
                          }}
                          className="text-[10px] text-brand-600 hover:text-brand-800 font-bold"
                        >
                          {order.deliveryAgent ? 'Change' : 'Assign'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {order.isRefunded || order.returnStatus ? (
                      (() => {
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
                          <div className="flex flex-col gap-2">
                            <span className={`inline-block w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${currentStatusColor}`}>
                              {displayStatus}
                            </span>
                            {userInfo?.isDeliveryAgent && order.returnStatus === 'Approved' && (
                              <button
                                disabled={savingId === order._id}
                                onClick={() => completeReturnHandler(order._id)}
                                className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 w-fit"
                              >
                                Mark Picked Up
                              </button>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <CustomSelect
                        value={order.status}
                        disabled={savingId === order._id}
                        onChange={(val) => statusChangeHandler(order._id, val)}
                        options={userInfo?.isDeliveryAgent ? DELIVERY_STATUS_OPTIONS : STATUS_OPTIONS}
                        className={`text-xs font-semibold rounded-full border-0 ${statusColor[order.status]}`}
                      />
                    )}
                  </td>
                  {!userInfo?.isDeliveryAgent && (
                    <td className="px-4 py-3">
                      <Link to={`/order/${order._id}`} className="font-medium text-brand-600 hover:underline">
                        View
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {assignModalOpen && selectedOrderToAssign && (
        <AssignAgentModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedOrderToAssign(null);
          }}
          orderId={selectedOrderToAssign._id}
          currentAgentId={selectedOrderToAssign.deliveryAgentId}
          shippingAddress={selectedOrderToAssign.shippingAddress}
        />
      )}
    </div>
  );
};

export default OrderListScreen;
