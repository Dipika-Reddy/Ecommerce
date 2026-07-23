import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetProductDetailsQuery,
  useCreateReviewMutation,
  useUploadProductImageMutation,
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
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo));

  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(productId);
  const [createReview, { isLoading: loadingReview }] = useCreateReviewMutation();

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [image, setImage] = useState('');

  const [uploadProductImage, { isLoading: loadingUpload }] = useUploadProductImageMutation();
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center center' });
  const [touchStartX, setTouchStartX] = useState(0);

  // State for Review Image Modal Lightbox
  const [selectedReviewImageIndex, setSelectedReviewImageIndex] = useState(null);

  // Collect all review images from reviews list
  const allReviewImages = product?.reviews
    ? product.reviews.flatMap((r) => (Array.isArray(r.images) && r.images.length > 0 ? r.images : r.image ? [r.image] : []))
    : [];

  const openReviewLightbox = (imgUrl) => {
    const idx = allReviewImages.indexOf(imgUrl);
    setSelectedReviewImageIndex(idx !== -1 ? idx : 0);
  };

  const closeReviewLightbox = () => {
    setSelectedReviewImageIndex(null);
  };

  const handlePrevReviewImage = (e) => {
    if (e) e.stopPropagation();
    if (allReviewImages.length === 0) return;
    setSelectedReviewImageIndex((prev) => (prev - 1 + allReviewImages.length) % allReviewImages.length);
  };

  const handleNextReviewImage = (e) => {
    if (e) e.stopPropagation();
    if (allReviewImages.length === 0) return;
    setSelectedReviewImageIndex((prev) => (prev + 1) % allReviewImages.length);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedReviewImageIndex === null) return;
      if (e.key === 'Escape') closeReviewLightbox();
      if (e.key === 'ArrowLeft') handlePrevReviewImage();
      if (e.key === 'ArrowRight') handleNextReviewImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReviewImageIndex, allReviewImages.length]);

  const wheelCooldownRef = useRef(false);

  // --- Keyboard Arrow Key Navigation (Laptop / PC Keypad) ---
  useEffect(() => {
    const handleMainImageKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || selectedReviewImageIndex !== null) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (!product?.images?.length || product.images.length <= 1) return;
        setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
      } else if (e.key === 'ArrowRight') {
        if (!product?.images?.length || product.images.length <= 1) return;
        setActiveImage((prev) => (prev + 1) % product.images.length);
      }
    };

    window.addEventListener('keydown', handleMainImageKeyDown);
    return () => window.removeEventListener('keydown', handleMainImageKeyDown);
  }, [product?.images, selectedReviewImageIndex]);

  // --- Touchpad / Trackpad Horizontal Wheel Swipe ---
  const handleWheelSwipe = (e) => {
    if (!product?.images?.length || product.images.length <= 1 || isZoomed) return;
    if (wheelCooldownRef.current) return;

    if (Math.abs(e.deltaX) > 20) {
      wheelCooldownRef.current = true;
      if (e.deltaX > 20) {
        setActiveImage((prev) => (prev + 1) % product.images.length);
      } else if (e.deltaX < -20) {
        setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
      }
      setTimeout(() => {
        wheelCooldownRef.current = false;
      }, 350);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!product?.images?.length || product.images.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 40) {
      setActiveImage((prev) => (prev + 1) % product.images.length);
    } else if (diff < -40) {
      setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handlePrevImage = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!product?.images?.length || product.images.length <= 1) return;
    setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleNextImage = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!product?.images?.length || product.images.length <= 1) return;
    setActiveImage((prev) => (prev + 1) % product.images.length);
  };

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

  const uploadFileHandler = async (e) => {
    const formData = new FormData();
    formData.append('image', e.target.files[0]);
    try {
      const res = await uploadProductImage(formData).unwrap();
      setImage(res.image);
      toast.success(res.message);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  // --- Submit a review ---
  const submitReviewHandler = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error('Please select a star rating');
      return;
    }
    try {
      await createReview({ productId, rating, comment, image }).unwrap();
      toast.success('Review submitted successfully');
      setRating(0);
      setComment('');
      setImage('');
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
            className={`aspect-square overflow-hidden rounded-lg border bg-white flex items-center justify-center relative select-none ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheelSwipe}
          >
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className={`h-full w-full object-contain p-2 transition-transform duration-75 ${isZoomed ? 'scale-[2.5]' : 'scale-100'}`}
              style={isZoomed ? zoomStyle : {}}
            />

            {/* Navigation Arrows & Counter Overlay */}
            {product.images?.length > 1 && !isZoomed && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-slate-950 shadow-md border border-slate-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20 cursor-pointer"
                  aria-label="Previous image"
                  title="Previous image (Left Arrow Key)"
                >
                  <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-slate-950 shadow-md border border-slate-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20 cursor-pointer"
                  aria-label="Next image"
                  title="Next image (Right Arrow Key)"
                >
                  <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/60 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
                  {activeImage + 1} / {product.images.length}
                </div>
              </>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img + idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-16 overflow-hidden rounded-md border-2 transition-all ${
                    activeImage === idx ? 'border-brand-600 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
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
                {review.image && (
                  <img
                    src={review.image}
                    alt="Review attachment"
                    onClick={() => openReviewLightbox(review.image)}
                    className="mt-3 max-h-32 rounded object-cover cursor-pointer hover:opacity-90 transition-opacity border hover:border-brand-500 shadow-sm"
                    title="Click to view full screen"
                  />
                )}
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
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Add Photo (Optional)</label>
                <input
                  type="file"
                  id="review-image-upload"
                  accept="image/*"
                  onChange={uploadFileHandler}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
                {loadingUpload && <Loader />}
                {image && (
                  <div className="relative inline-block mt-2">
                    <img src={image} alt="Preview" className="max-h-24 rounded object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImage('');
                        document.getElementById('review-image-upload').value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
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
      {/* ── Review Image Full-Screen Lightbox Modal ────────────── */}
      {selectedReviewImageIndex !== null && allReviewImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={closeReviewLightbox}
        >
          {/* Close / Cross Button */}
          <button
            onClick={closeReviewLightbox}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-50 shadow-lg border border-white/20"
            aria-label="Close image preview"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Arrow Button */}
          {allReviewImages.length > 1 && (
            <button
              onClick={handlePrevReviewImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-50 shadow-xl border border-white/20"
              aria-label="Previous review image"
              title="Previous image"
            >
              <svg className="w-7 h-7 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Main Fit-To-Screen Image */}
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={allReviewImages[selectedReviewImageIndex]}
              alt="Review full screen preview"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none"
            />
            {allReviewImages.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md">
                {selectedReviewImageIndex + 1} / {allReviewImages.length}
              </div>
            )}
          </div>

          {/* Next Arrow Button */}
          {allReviewImages.length > 1 && (
            <button
              onClick={handleNextReviewImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-50 shadow-xl border border-white/20"
              aria-label="Next review image"
              title="Next image"
            >
              <svg className="w-7 h-7 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductScreen;
