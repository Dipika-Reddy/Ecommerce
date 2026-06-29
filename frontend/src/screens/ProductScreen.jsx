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
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser } from '../utils/userRoles';

const ProductScreen = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.auth);
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo) || userInfo.isDeliveryAgent);

  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(productId);
  const [createReview, { isLoading: loadingReview }] = useCreateReviewMutation();

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center center' });

  // Handle zooming at the specific click location
  const handleImageClick = (e) => {
    if (isZoomed) {
      setIsZoomed(false);
    } else {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setZoomStyle({ transformOrigin: `${x}% ${y}%` });
      setIsZoomed(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({ transformOrigin: `${x}% ${y}%` });
  };

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
            className={`aspect-square overflow-hidden rounded-lg border bg-white flex items-center justify-center relative ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
          >
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className={`h-full w-full object-contain p-2 transition-transform duration-75 ${isZoomed ? 'scale-[2.5]' : 'scale-100'}`}
              style={isZoomed ? zoomStyle : {}}
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

          {!isManagement && (
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
          )}
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

        {!isManagement && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-gray-800">Write a Review</h2>
            {userInfo ? (
            <form onSubmit={submitReviewHandler} className="space-y-3 rounded-md border p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rating</label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <svg
                        className={`w-7 h-7 ${
                          star <= rating ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
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
        )}
      </div>
    </div>
  );
};

export default ProductScreen;
