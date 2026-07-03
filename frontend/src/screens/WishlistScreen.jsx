import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { removeFromWishlist } from '../features/wishlist/wishlistSlice';
import { addToCart } from '../features/cart/cartSlice';

const WishlistScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { wishlistItems } = useSelector((state) => state.wishlist);
  const { userInfo } = useSelector((state) => state.auth);

  const handleAddToCart = (item) => {
    dispatch(
      addToCart({
        _id: item._id,
        name: item.name,
        image: item.image,
        price: item.price,
        countInStock: item.countInStock ?? 10,
        qty: 1,
        size: item.size || '',
        color: item.color || '',
      })
    );
    toast.success('Added to cart!');
  };

  const handleBuyNow = (item) => {
    handleAddToCart(item);
    navigate(userInfo ? '/shipping' : '/login?redirect=/shipping');
  };

  const handleRemove = (id) => {
    dispatch(removeFromWishlist(id));
    toast.info('Removed from wishlist');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 min-h-[70vh]">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-700">Your wishlist is empty</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Save items you love by clicking the heart on any product.
          </p>
          <Link
            to="/home"
            className="mt-2 inline-block px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            Discover Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {wishlistItems.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 group flex flex-col"
            >
              {/* Product Image */}
              <Link to={`/product/${item._id}`} className="relative block overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Remove button */}
                <button
                  onClick={(e) => { e.preventDefault(); handleRemove(item._id); }}
                  className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                  title="Remove from wishlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Link>

              {/* Product Info */}
              <div className="p-3 flex flex-col flex-1">
                <Link to={`/product/${item._id}`}>
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-brand-600 transition-colors mb-1">
                    {item.name}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-gray-900 mb-4">
                  {'\u20b9'}{item.price.toFixed(2)}
                </p>

                {/* Action Buttons */}
                <div className="mt-auto flex flex-row gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                  >
                    🛒 Add to Cart
                  </button>
                  <button
                    onClick={() => handleBuyNow(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                  >
                    ⚡ Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistScreen;
