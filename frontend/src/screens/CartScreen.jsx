import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, updateQty, applyCoupon, removeCoupon } from '../features/cart/cartSlice';
import { useGetCouponsQuery, useValidateCouponMutation } from '../features/api/couponsApiSlice';
import Message from '../components/Message';
import CustomSelect from '../components/CustomSelect';
import Loader from '../components/Loader';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser } from '../utils/userRoles';
import { toast } from 'react-toastify';

const CartScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { cartItems, itemsPrice, shippingPrice, taxPrice, totalPrice, coupon, couponDiscount } = useSelector(
    (state) => state.cart
  );
  const { userInfo } = useSelector((state) => state.auth);
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo) || userInfo.isDeliveryAgent);

  const [couponCode, setCouponCode] = useState('');
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  const { data: coupons, isLoading: loadingCoupons } = useGetCouponsQuery();
  const [validateCoupon, { isLoading: loadingValidate }] = useValidateCouponMutation();

  const updateQtyHandler = (item, qty) => {
    dispatch(updateQty({ id: item._id, size: item.size, color: item.color, qty: Number(qty) }));
  };

  const removeHandler = (item) => {
    dispatch(removeFromCart({ id: item._id, size: item.size, color: item.color }));
  };

  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = codeToApply || couponCode;
    if (!targetCode) {
      toast.error('Please enter or select a coupon code');
      return;
    }

    try {
      const res = await validateCoupon({ code: targetCode, orderAmount: itemsPrice }).unwrap();
      dispatch(applyCoupon(res));
      setCouponCode('');
      setShowCouponsModal(false);
      toast.success(`Coupon "${res.code}" applied successfully!`);
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid coupon code');
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    toast.info('Coupon removed');
  };

  const checkoutHandler = () => {
    // Checkout wizard step 1: Shipping Address. Login is required to check out.
    navigate(userInfo ? '/shipping' : '/login?redirect=/shipping');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Shopping Cart</h1>

      {isManagement ? (
        <Message variant="danger">
          Management accounts do not have access to the shopping cart.
        </Message>
      ) : cartItems.length === 0 ? (
        <Message variant="info">
          Your cart is empty. <Link to="/" className="font-semibold underline">Continue shopping</Link>
        </Message>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* --- Line items --- */}
          <div className="space-y-4 md:col-span-2">
            {cartItems.map((item) => (
              <div
                key={`${item._id}-${item.size}-${item.color}`}
                className="flex flex-wrap items-center gap-4 rounded-md border bg-white p-4"
              >
                <img src={item.image} alt={item.name} className="h-20 w-20 rounded object-cover" />

                <div className="flex-1 min-w-[150px]">
                  <Link to={`/product/${item._id}`} className="font-medium text-gray-900 hover:underline">
                    {item.name}
                  </Link>
                  <div className="mt-1 text-xs text-gray-500">
                    {item.size && <span>Size: {item.size} </span>}
                    {item.color && <span>Color: {item.color}</span>}
                  </div>
                </div>

                <span className="w-20 text-center font-semibold text-gray-800">
                  ₹{item.price.toFixed(2)}
                </span>

                <CustomSelect
                  value={String(item.qty)}
                  onChange={(v) => updateQtyHandler(item, v)}
                  options={[...Array(Math.min(item.countInStock || 10, 10)).keys()].map((x) => ({
                    value: String(x + 1),
                    label: String(x + 1),
                  }))}
                />

                <button
                  onClick={() => removeHandler(item)}
                  className="text-sm font-medium text-red-500 hover:text-red-700"
                  aria-label={`Remove ${item.name}`}
                >
                  ✕ Remove
                </button>
              </div>
            ))}
          </div>

          {/* --- Order summary --- */}
          <div className="h-fit rounded-md border bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              Subtotal ({cartItems.reduce((acc, item) => acc + item.qty, 0)} items)
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Items</span>
                <span>₹{itemsPrice.toFixed(2)}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon ({coupon.code})</span>
                  <span>-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shippingPrice === 0 ? 'FREE' : `₹${shippingPrice.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (3%)</span>
                <span>₹{taxPrice.toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon Form */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Apply Promo Code</h3>
              {!coupon ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500 uppercase font-mono font-bold"
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      disabled={loadingValidate}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      Apply
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCouponsModal(true)}
                    className="text-brand-600 hover:text-brand-700 text-xs font-semibold hover:underline block"
                  >
                    View Available Coupons
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-150 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-700 font-mono">{coupon.code}</p>
                    <p className="text-[10px] text-green-600 mt-0.5">₹{couponDiscount.toFixed(2)} saved</p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-red-500 hover:text-red-700 bg-white hover:bg-red-50 px-2 py-1 rounded-md border border-red-100 transition"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={checkoutHandler}
              className="mt-5 w-full rounded-md bg-accent-500 py-2.5 font-semibold text-white hover:bg-accent-600"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {/* Available Coupons Modal */}
      {showCouponsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in text-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Available Coupons</h3>
              <button
                onClick={() => setShowCouponsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {loadingCoupons ? (
              <Loader />
            ) : !coupons || coupons.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No active coupons available right now.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="border border-slate-100 rounded-2xl p-3.5 hover:border-slate-200 transition bg-slate-50/50 flex justify-between items-start gap-4 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-brand-600 bg-brand-50 border border-brand-100 rounded px-2 py-0.5 uppercase tracking-wider">
                          {coupon.code}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue.toFixed(2)} Off`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        {coupon.description || `Get ${coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} off on your order.`}
                      </p>
                      {coupon.minPurchase > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                          Min purchase: ₹{coupon.minPurchase.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleApplyCoupon(coupon.code)}
                      disabled={itemsPrice < coupon.minPurchase}
                      className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartScreen;

