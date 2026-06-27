import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useCreateOrderMutation } from '../features/api/ordersApiSlice';
import { clearCartItems } from '../features/cart/cartSlice';
import CheckoutSteps from '../components/CheckoutSteps';
import Message from '../components/Message';
import Loader from '../components/Loader';

const PlaceOrderScreen = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart);
  const { cartItems, shippingAddress, paymentMethod, itemsPrice, shippingPrice, taxPrice, totalPrice } =
    cart;

  const [createOrder, { isLoading, error }] = useCreateOrderMutation();

  useEffect(() => {
    if (!shippingAddress?.address) navigate('/shipping');
    else if (!paymentMethod) navigate('/payment');
  }, [shippingAddress, paymentMethod, navigate]);

  const placeOrderHandler = async () => {
    try {
      const order = await createOrder({
        orderItems: cartItems.map((item) => ({
          product: item._id,
          qty: item.qty,
          size: item.size,
          color: item.color,
        })),
        shippingAddress: {
          ...shippingAddress,
          deliveryMethod: cart.deliveryMethod || 'Standard Shipping',
        },
        paymentMethod,
        shippingPrice,
      }).unwrap();

      dispatch(clearCartItems());
      navigate(`/order/${order._id}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to place order');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <CheckoutSteps step1 step2 step3 />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-md border bg-white p-4">
            <h2 className="mb-2 font-bold text-gray-800">Shipping &amp; Delivery</h2>
            <p className="text-sm text-gray-600">
              <strong>Address: </strong>{shippingAddress.address}, {shippingAddress.city} {shippingAddress.postalCode},{' '}
              {shippingAddress.country}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Method: </strong>{cart.deliveryMethod || 'Standard Shipping'}
            </p>
          </div>

          <div className="rounded-md border bg-white p-4">
            <h2 className="mb-2 font-bold text-gray-800">Payment Method</h2>
            <p className="text-sm text-gray-600">{paymentMethod}</p>
          </div>

          <div className="rounded-md border bg-white p-4">
            <h2 className="mb-3 font-bold text-gray-800">Order Items</h2>
            {cartItems.length === 0 ? (
              <Message variant="info">Your cart is empty</Message>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={`${item._id}-${item.size}-${item.color}`} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover" />
                    <Link to={`/product/${item._id}`} className="flex-1 text-sm hover:underline">
                      {item.name} {item.size && `(${item.size})`} {item.color && `(${item.color})`}
                    </Link>
                    <span className="text-sm text-gray-600">
                      {item.qty} x ₹{item.price.toFixed(2)} = ₹{(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-fit rounded-md border bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-gray-800">Order Summary</h2>
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
              <span>Tax</span>
              <span>₹{taxPrice.toFixed(2)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-3">
              <Message variant="danger">{error?.data?.message}</Message>
            </div>
          )}

          <button
            disabled={cartItems.length === 0 || isLoading}
            onClick={placeOrderHandler}
            className="mt-5 w-full rounded-md bg-accent-500 py-2.5 font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            Place Order
          </button>
          {isLoading && <Loader />}
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderScreen;
