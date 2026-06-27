import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePaymentMethod } from '../features/cart/cartSlice';
import FormContainer from '../components/FormContainer';
import CheckoutSteps from '../components/CheckoutSteps';

const PAYMENT_OPTIONS = [
  { value: 'UPI', label: 'UPI (PhonePe, Google Pay, Paytm)' },
  { value: 'Debit Card', label: 'Debit Card' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Cash on Delivery', label: 'Cash on Delivery' },
];

const PaymentScreen = () => {
  const { shippingAddress, paymentMethod: savedMethod } = useSelector((state) => state.cart);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [paymentMethod, setPaymentMethod] = useState(savedMethod || 'UPI');

  useEffect(() => {
    // Can't pick a payment method before shipping is set
    if (!shippingAddress?.address) navigate('/shipping');
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(savePaymentMethod(paymentMethod));
    navigate('/placeorder'); // checkout wizard step 3
  };

  return (
    <FormContainer>
      <CheckoutSteps step1 step2 />
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Payment Method</h1>
      <form onSubmit={submitHandler} className="space-y-3">
        {PAYMENT_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${
              paymentMethod === opt.value ? 'border-brand-600 bg-brand-50' : 'border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={opt.value}
              checked={paymentMethod === opt.value}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            {opt.label}
          </label>
        ))}
        <button
          type="submit"
          className="w-full rounded-md bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          Continue to Order Summary
        </button>
      </form>
    </FormContainer>
  );
};

export default PaymentScreen;
