import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, updateQty } from '../features/cart/cartSlice';
import Message from '../components/Message';
import CustomSelect from '../components/CustomSelect';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser } from '../utils/userRoles';

const CartScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { cartItems, itemsPrice, shippingPrice, taxPrice, totalPrice } = useSelector(
    (state) => state.cart
  );
  const { userInfo } = useSelector((state) => state.auth);
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo) || userInfo.isDeliveryAgent);

  const updateQtyHandler = (item, qty) => {
    dispatch(updateQty({ id: item._id, size: item.size, color: item.color, qty: Number(qty) }));
  };

  const removeHandler = (item) => {
    dispatch(removeFromCart({ id: item._id, size: item.size, color: item.color }));
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
            <button
              onClick={checkoutHandler}
              className="mt-5 w-full rounded-md bg-accent-500 py-2.5 font-semibold text-white hover:bg-accent-600"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartScreen;
