import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { addToCart } from '../features/cart/cartSlice';
import Rating from './Rating';
import { Heart } from 'lucide-react';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isDeliveryAgent } from '../utils/userRoles';
import { addToWishlist, removeFromWishlist } from '../features/wishlist/wishlistSlice';
const Product = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo) || isDeliveryAgent(userInfo));
  
  const inWishlist = wishlistItems.some((item) => item._id === product._id);

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      dispatch(removeFromWishlist(product._id));
      toast.info('Removed from wishlist');
    } else {
      dispatch(addToWishlist({
        _id: product._id,
        name: product.name,
        image: product.images?.[0] || '/uploads/seed/placeholder.jpg',
        price: product.price,
      }));
      toast.success('Added to wishlist');
    }
  };

  // Simulate an original price and a discount (e.g., 20% off)
  const originalPrice = product.price * 1.25;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isManagement) {
      toast.error("Management accounts cannot add items to cart");
      return;
    }

    dispatch(
      addToCart({
        _id: product._id,
        name: product.name,
        image: product.images?.[0] || '/uploads/seed/placeholder.jpg',
        price: product.price,
        countInStock: product.countInStock,
        qty: 1,
        size: product.sizes?.[0] || '',
        color: product.colors?.[0] || '',
      })
    );
    toast.success('Added to cart');
    navigate('/cart');
  };

  const handleOrderNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (userInfo && (userInfo.sellerStatus === 'APPROVED' || userInfo.isAdmin || userInfo.isSuperAdmin)) {
      toast.error("Management accounts cannot checkout");
      return;
    }

    dispatch(
      addToCart({
        _id: product._id,
        name: product.name,
        image: product.images?.[0] || '/uploads/seed/placeholder.jpg',
        price: product.price,
        countInStock: product.countInStock,
        qty: 1,
        size: product.sizes?.[0] || '',
        color: product.colors?.[0] || '',
      })
    );
    navigate('/shipping');
  };

  return (
    <div className="group flex flex-col bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-shadow duration-150 p-4 relative justify-between">
      {/* Wishlist Heart */}
      {!isManagement && (
        <button 
          onClick={toggleWishlist}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shadow-sm"
          title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart 
            className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} 
          />
        </button>
      )}
      
      <Link to={`/product/${product._id}`} className="flex flex-col flex-1">
        {/* Centered Image */}
        <div className="w-full aspect-square bg-white flex items-center justify-center overflow-hidden mb-3">
          <img
            src={product.images?.[0] || '/uploads/seed/placeholder.jpg'}
            alt={product.name}
            className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>

        {/* Product details */}
        <div className="flex flex-col flex-1">
          {/* Brand & Category */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span>{product.brand}</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] uppercase text-gray-600">{product.category}</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-normal text-gray-900 line-clamp-2 mt-1 leading-snug group-hover:text-brand-600 transition-colors duration-150">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <Rating value={product.rating} numReviews={product.numReviews} />
          </div>

          {/* Pricing */}
          <div className="mt-2.5 flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-normal text-gray-800">₹</span>
              <span className="text-xl font-bold text-gray-950 leading-none">
                {Math.floor(product.price)}
              </span>
              <span className="text-xs font-bold text-gray-950 leading-none">
                {((product.price % 1) * 100).toFixed(0).padStart(2, '0')}
              </span>
              
              {/* Savings */}
              <span className="text-xs text-gray-500 line-through ml-1.5">
                ₹{originalPrice.toFixed(2)}
              </span>
              <span className="text-xs text-red-700 font-medium ml-1">
                (20% off)
              </span>
            </div>
          </div>

          {/* Delivery */}
          <div className="mt-2 flex flex-col gap-0.5">
            <p className="text-[11px] text-gray-500">
              Get it by <span className="font-semibold text-gray-800">Tomorrow</span>
            </p>

            {/* Stock status */}
            <div className="mt-2 text-xs font-medium">
              {product.countInStock === 0 ? (
                <span className="text-red-600">Currently unavailable.</span>
              ) : product.countInStock <= 5 ? (
                <span className="text-[#b12704]">Only {product.countInStock} left in stock - order soon.</span>
              ) : (
                <span className="text-green-700">In stock</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Action Buttons at the very bottom */}
      {!isManagement && (
        <div className="mt-3">
          {product.countInStock === 0 ? (
            <button
              disabled
              className="block w-full text-center bg-slate-200 text-slate-400 py-2 rounded-lg text-xs font-bold cursor-not-allowed"
            >
              Out of Stock
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 text-center bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-xs font-bold transition duration-150 shadow-sm"
              >
                Add to Cart
              </button>
              <button
                onClick={handleOrderNow}
                className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-xs font-bold transition duration-150 shadow-sm"
              >
                Order Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Product;
