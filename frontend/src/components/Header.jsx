import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useLogoutMutation } from '../features/api/usersApiSlice';
import { useGetProductCategoriesQuery } from '../features/api/productsApiSlice';
import { logout } from '../features/auth/authSlice';
import DeliveryLocationPicker from './DeliveryLocationPicker';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isDeliveryAgent, getStaffBasePath } from '../utils/userRoles';
import { removeFromWishlist } from '../features/wishlist/wishlistSlice';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.auth);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const isDelivery = userInfo && isDeliveryAgent(userInfo);
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo) || isDelivery);
  const [logoutApiCall] = useLogoutMutation();
  const { data: categories } = useGetProductCategoriesQuery();

  const [searchCategory, setSearchCategory] = useState('All');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const dropdownRef = useRef(null);
  const wishlistRef = useRef(null);

  const cartCount = cartItems.length;
  const wishlistCount = wishlistItems.length;

  // Close the dropdowns when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (wishlistRef.current && !wishlistRef.current.contains(e.target)) {
        setWishlistOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const logoutHandler = async () => {
    try {
      await logoutApiCall().unwrap();
    } catch (err) {
    } finally {
      navigate('/');
      dispatch(logout());
      setDropdownOpen(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();
    if (searchCategory !== 'All') {
      queryParams.set('category', searchCategory);
    }

    if (searchKeyword.trim()) {
      navigate(`/search/${searchKeyword.trim()}?${queryParams.toString()}`);
    } else {
      navigate(searchCategory !== 'All' ? `/home?${queryParams.toString()}` : '/home');
    }
  };

  // Navigates to homepage and filters by selected category from the subbar
  const handleCategoryFilter = (cat) => {
    if (cat === 'All') {
      navigate('/home');
    } else {
      navigate(`/home?category=${encodeURIComponent(cat)}`);
    }
  };

  // Parse active category from URL to highlight it in the sub-navbar
  const activeParams = new URLSearchParams(location.search);
  const activeCategory = activeParams.get('category') || 'All';

  return (
    <header className="sticky top-0 z-50 flex flex-col shadow-sm border-b border-slate-200">
      {/* --- Top Nav Row (buybee Light Theme) --- */}
      <div className="bg-white/95 backdrop-blur-md text-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 min-w-0">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-1 rounded border border-transparent hover:bg-slate-50 transition-colors duration-150 shrink-0 min-w-0">
            <svg viewBox="0 0 100 100" className="w-8 h-8 hover:scale-105 transition-transform" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Wings */}
              <ellipse cx="38" cy="35" rx="14" ry="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" transform="rotate(-30 38 35)"/>
              <ellipse cx="62" cy="35" rx="14" ry="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" transform="rotate(30 62 35)"/>
              {/* Body */}
              <rect x="35" y="45" width="30" height="40" rx="15" fill="#fbbf24" stroke="#d97706" strokeWidth="4"/>
              {/* Stripes */}
              <path d="M37 56h26M36 68h28" stroke="#1e293b" strokeWidth="4" strokeLinecap="round"/>
              {/* Eyes & Antennae */}
              <path d="M45 45c-2-8-6-10-10-8M55 45c2-8 6-10 10-8" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="43" cy="52" r="2.5" fill="#1e293b"/>
              <circle cx="57" cy="52" r="2.5" fill="#1e293b"/>
            </svg>
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent font-display truncate">
              Buybee
            </span>
          </Link>

          {/* Integrated Search Bar (Desktop only) - Hidden for Delivery Agents */}
          {!isDelivery && (
            <form 
              onSubmit={handleSearchSubmit} 
              className="hidden md:flex flex-1 items-center bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 shadow-sm max-w-2xl"
            >
              <div className="pl-3.5 text-slate-400 flex items-center justify-center">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search Buybee..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-2 pr-4 py-2.5 text-sm text-slate-700 flex-1 focus:outline-none h-full bg-white"
              />
            </form>
          )}

          {/* Right Side Options */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
            {/* Delivery location — mobile: top right; desktop: inline dropdown */}
            {!isManagement && (
              <>
                <div className="md:hidden mr-5 sm:mr-6">
                  <DeliveryLocationPicker variant="mobile" />
                </div>
                <div className="hidden md:block">
                  <DeliveryLocationPicker variant="desktop" />
                </div>
              </>
            )}

            {/* Cart Link — hidden on mobile (use footer bar instead) */}
            {!isManagement && (
              <Link
                to="/cart"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-transparent hover:bg-slate-50 transition-colors duration-150 text-slate-700"
              >
                <div className="relative flex items-center">
                  <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {/* Count Badge on Cart */}
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-white border border-white shadow-sm">
                    {cartCount}
                  </span>
                </div>
              </Link>
            )}

            {/* Wishlist Heart Icon — beside cart, hidden on mobile */}
            {!isManagement && (
              <Link
                to="/wishlist"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-transparent hover:bg-slate-50 transition-colors duration-150 text-slate-700"
                title="My Wishlist"
              >
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white border border-white shadow-sm">
                    {wishlistCount}
                  </span>
                </div>
              </Link>
            )}

            {/* Account dropdown — hidden on mobile (use footer bar instead) */}
            <div className="hidden md:relative md:flex items-center" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded border border-transparent hover:bg-slate-50 transition-colors duration-150 text-slate-700"
              >
                {/* Circular Profile Avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white font-extrabold text-sm border border-orange-600 shadow-sm shrink-0">
                  {userInfo ? userInfo.name.charAt(0).toUpperCase() : (
                    <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] leading-tight text-slate-500 font-medium">
                    Hello, {userInfo ? userInfo.name.split(' ')[0] : 'Sign In'}
                  </span>
                  <span className="text-xs font-bold leading-tight flex items-center gap-0.5">
                    Account & Lists <span className="text-[9px] text-slate-400">▼</span>
                  </span>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-1rem)] rounded-xl bg-white py-2 text-slate-800 shadow-2xl z-[100] border border-slate-200 animate-scale-in overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-400">Your Account</p>
                    {userInfo ? (
                      <p className="text-sm font-semibold truncate text-slate-800">{userInfo.name}</p>
                    ) : (
                      <Link
                        to="/login"
                        className="mt-1 block text-center bg-brand-500 hover:bg-brand-600 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Sign In
                      </Link>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Your Profile
                    </Link>
                  </div>

                  {isApprovedSeller(userInfo) && (
                    <div className="border-t border-slate-100 pt-1 mt-1 bg-slate-50/50">
                      <div className="px-4 pt-1 pb-0.5">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Seller Controls
                        </p>
                      </div>
                      <Link
                        to="/seller/productlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Products
                      </Link>
                      <Link
                        to="/seller/orderlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Orders
                      </Link>
                      <Link
                        to="/seller/paymentlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Payments
                      </Link>
                    </div>
                  )}

                  {isDelivery && (
                    <div className="border-t border-slate-100 pt-1 mt-1 bg-slate-50/50">
                      <div className="px-4 pt-1 pb-0.5">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Delivery Controls
                        </p>
                      </div>
                      <Link
                        to="/delivery/orderlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Orders
                      </Link>
                      <Link
                        to="/delivery/paymentlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Payments
                      </Link>
                    </div>
                  )}

                  {(isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo)) && (
                    <div className="border-t border-slate-100 pt-1 mt-1 bg-slate-50/50">
                      <div className="px-4 pt-1 pb-0.5">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          {isSuperAdminUser(userInfo) ? 'Superadmin Controls' : 'Admin Controls'}
                        </p>
                      </div>
                      <Link
                        to={`${getStaffBasePath(userInfo)}/userlist`}
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Users
                      </Link>
                      <Link
                        to={`${getStaffBasePath(userInfo)}/verifysellers`}
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Verify Sellers
                      </Link>
                      <Link
                        to="/seller/productlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Products
                      </Link>
                      <Link
                        to="/seller/orderlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Orders
                      </Link>
                      <Link
                        to="/seller/paymentlist"
                        className="block px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Payments
                      </Link>
                    </div>
                  )}

                  {userInfo && (
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        onClick={logoutHandler}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Search Bar (below logo row, hidden on desktop) ── */}
      {!isDelivery && (
        <div className="md:hidden bg-white border-t border-slate-100 px-3 py-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden focus-within:bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/30 transition-all shadow-sm"
          >
          {/* Search icon */}
          <div className="pl-3.5 flex items-center text-slate-400 shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Text input */}
          <input
            type="text"
            placeholder="Search Buybee..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 bg-transparent py-2.5 pr-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
          />

          {/* Clear button — shown only when there's text */}
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="pr-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="mr-1 flex items-center justify-center rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-1.5 transition-all shrink-0"
            aria-label="Search"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>
      )}

      {/* --- Sub-navbar (Light Grey/Blue Subbar) - hidden on mobile --- */}
      {!isDelivery && (
        <div className="hidden md:block bg-slate-50 border-t border-slate-200/60 text-slate-600 py-1.5">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 text-xs font-semibold overflow-x-auto scrollbar-none">
            {/* Home button */}
            <button
              onClick={() => navigate('/home')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded border transition-colors duration-150 whitespace-nowrap ${
                !activeCategory
                  ? 'border-brand-500 font-bold bg-brand-50 text-brand-650'
                  : 'border-transparent hover:bg-slate-200/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              Home
            </button>
            {/* Divider */}
            <span className="text-slate-300 select-none">|</span>
            {/* Quick category pills */}
            {['Fashion', 'Creative', 'Mobiles', 'Furniture', 'Beauty', 'Electronics'].map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded border transition-colors duration-150 whitespace-nowrap ${
                  activeCategory === cat
                    ? 'border-brand-500 font-bold bg-brand-50 text-brand-650'
                    : 'border-transparent hover:bg-slate-200/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
