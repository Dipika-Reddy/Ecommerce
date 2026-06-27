import { Link } from 'react-router-dom';

// Step indicator shown above the checkout wizard:
// Shipping Address -> Payment Method -> Order Summary
const steps = [
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
  { key: 'placeorder', label: 'Order Summary' },
];

const CheckoutSteps = ({ step1, step2, step3 }) => {
  const completed = { shipping: step1, payment: step2, placeorder: step3 };

  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      {steps.map((s, idx) => (
        <div key={s.key} className="flex items-center gap-4">
          {completed[s.key] ? (
            <Link
              to={`/${s.key}`}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white"
            >
              {idx + 1}. {s.label}
            </Link>
          ) : (
            <span className="rounded-full bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-500">
              {idx + 1}. {s.label}
            </span>
          )}
          {idx < steps.length - 1 && <span className="text-gray-300">—</span>}
        </div>
      ))}
    </div>
  );
};

export default CheckoutSteps;
