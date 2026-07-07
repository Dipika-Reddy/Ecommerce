import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetAdminCouponsQuery,
  useCreateCouponMutation,
  useDeleteCouponMutation,
} from '../../features/api/couponsApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';

const CouponListScreen = () => {
  const { data: coupons, isLoading, error, refetch } = useGetAdminCouponsQuery();
  const [createCoupon, { isLoading: loadingCreate }] = useCreateCouponMutation();
  const [deleteCoupon, { isLoading: loadingDelete }] = useDeleteCouponMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [description, setDescription] = useState('');

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await createCoupon({
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        minPurchase: Number(minPurchase),
        description,
      }).unwrap();
      toast.success('Coupon created successfully!');
      setShowAddModal(false);
      setCode('');
      setDiscountValue('');
      setMinPurchase('0');
      setDescription('');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create coupon');
    }
  };

  const deleteHandler = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await deleteCoupon(id).unwrap();
        toast.success('Coupon deleted successfully!');
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete coupon');
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Coupons & Offers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage discount coupons, bank offers, and seasonal promotional codes.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-100 flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Coupon
        </button>
      </div>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message || 'An error occurred fetching coupons'}</Message>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Min Spend</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400 font-medium">
                    No coupons created yet. Click "Create Coupon" to add one.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-brand-600 text-sm">
                      {coupon.code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue.toFixed(2)} Off`}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      ₹{coupon.minPurchase.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={coupon.description}>
                      {coupon.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        coupon.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {coupon.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteHandler(coupon.id)}
                        disabled={loadingDelete}
                        className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Create New Coupon</h3>
            <p className="text-xs text-slate-400 mb-4">Enter details to generate a new promotional discount offer.</p>

            <form onSubmit={submitHandler} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SALE50, HDFC200"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white font-medium"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Discount Value</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 10 or 200"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Minimum Purchase (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 500"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Get 10% off on your purchase above ₹500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white resize-none font-medium text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingCreate}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center shadow-md disabled:opacity-50"
                >
                  {loadingCreate ? 'Creating...' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponListScreen;
