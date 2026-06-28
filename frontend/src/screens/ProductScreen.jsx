import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetProductDetailsQuery,
  useCreateReviewMutation,
} from '../features/api/productsApiSlice';
import { addToCart } from '../features/cart/cartSlice';
import Rating from '../components/Rating';
import Loader from '../components/Loader';
import Message from '../components/Message';
import CustomSelect from '../components/CustomSelect';

const ProductScreen = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.auth);

  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(productId);
  const [createReview, { isLoading: loadingReview }] = useCreateReviewMutation();

  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // --- Add to cart ---
  const addToCartHandler = () => {
    if (product.sizes?.length && !size) {
      toast.error('Please select a size');
      return;
    }
    if (product.colors?.length && !color) {
      toast.error('Please select a color');
      return;
    }

    dispatch(
      addToCart({
        _id: product._id,
        name: product.name,
        image: product.images[activeImage] || product.images[0],
        price: product.price,
        countInStock: product.countInStock,
        qty,
        size,
        color,
      })
    );
    toast.success('Added to cart');
    navigate('/cart');
  };

  // --- Submit a review ---
  const submitReviewHandler = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error('Please select a star rating');
      return;
    }
    try {
      await createReview({ productId, rating, comment }).unwrap();
      toast.success('Review submitted');
      setRating(0);
      setComment('');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit review');
    }
  };

  if (isLoading) return <Loader />;
  if (error)
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Message variant="danger">{error?.data?.message || 'Product not found'}</Message>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to={`/home?category=${encodeURIComponent(product.category)}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to products
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* --- Image gallery --- */}
        <div>
          <div 
            className="aspect-square overflow-hidden rounded-lg border bg-white flex items-center justify-center cursor-zoom-in"
            onClick={() => setIsZoomed(true)}
          >
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="h-full w-full object-contain p-2"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img + idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-16 overflow-hidden rounded-md border-2 ${
                    activeImage === idx ? 'border-brand-600' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- Details & purchase panel --- */}
        <div>
          <span className="text-xs uppercase tracking-wide text-accent-600">{product.category}</span>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Brand: {product.brand}</p>
          <div className="mt-2">
            <Rating value={product.rating} numReviews={product.numReviews} />
          </div>

          <p className="mt-4 text-3xl font-extrabold text-brand-700">₹{product.price.toFixed(2)}</p>

          <p className="mt-4 text-gray-700">{product.description}</p>

          <div className="mt-4">
            {product.countInStock > 0 ? (
              <span className="text-sm font-semibold text-green-600">
                ✓ In Stock ({product.countInStock} available)
              </span>
            ) : (
              <span className="text-sm font-semibold text-red-500">✗ Out of Stock</span>
            )}
          </div>

          {/* Size selector */}
          {product.sizes?.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-gray-700">Size</p>
              <div className="flex gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-md border px-3 py-1 text-sm ${
                      size === s
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-brand-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selector */}
          {product.colors?.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-gray-700">Color</p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      const idx = product.colors.indexOf(c);
                      if (idx !== -1 && idx < product.images.length) {
                        setActiveImage(idx);
                      }
                    }}
                    className={`rounded-md border px-3 py-1 text-sm ${
                      color === c
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-brand-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

            <div className="mt-6 flex items-center gap-3">
              <div className="w-32 flex-shrink-0">
                <CustomSelect
                  value={String(qty)}
                  onChange={(v) => setQty(Number(v))}
                  options={[...Array(Math.min(product.countInStock, 10)).keys()].map((x) => ({
                    value: String(x + 1),
                    label: `Qty: ${x + 1}`,
                  }))}
                />
              </div>
              <button
                onClick={addToCartHandler}
                className="flex-1 rounded-md bg-accent-500 px-6 py-2.5 font-semibold text-white hover:bg-accent-600 whitespace-nowrap"
              >
                Add to Cart
              </button>
            </div>
        </div>
      </div>

      {/* --- Reviews section --- */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-800">Customer Reviews</h2>
          {product.reviews.length === 0 && <Message variant="info">No reviews yet.</Message>}
          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review._id} className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <strong>{review.name}</strong>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Rating value={review.rating} text="" />
                <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-800">Write a Review</h2>
          {userInfo ? (
            <form onSubmit={submitReviewHandler} className="space-y-3 rounded-md border p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rating</label>
                <CustomSelect
                  value={String(rating)}
                  onChange={(v) => setRating(Number(v))}
                  options={[
                    { value: '0', label: 'Select...' },
                    { value: '1', label: '1 – Poor' },
                    { value: '2', label: '2 – Fair' },
                    { value: '3', label: '3 – Good' },
                    { value: '4', label: '4 – Very Good' },
                    { value: '5', label: '5 – Excellent' },
                  ]}
                  placeholder="Select..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loadingReview}
                className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loadingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          ) : (
            <Message variant="info">
              Please <Link to="/login" className="font-semibold underline">sign in</Link> to write a review.
            </Message>
          )}
        </div>
      </div>

      {/* --- Zoom Modal --- */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <img
            src={product.images[activeImage]}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
          />
          <button 
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white hover:bg-white/40"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductScreen;
