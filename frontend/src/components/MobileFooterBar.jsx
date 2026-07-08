import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useLogoutMutation } from '../features/api/usersApiSlice';
import { logout } from '../features/auth/authSlice';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isDeliveryAgent, getStaffBasePath } from '../utils/userRoles';

const CATEGORIES = ['Fashion', 'Creative', 'Mobiles', 'Furniture', 'Beauty', 'Electronics'];

const MobileFooterBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.auth);
  const [logoutApiCall] = useLogoutMutation();

  const isDelivery = userInfo && isDeliveryAgent(userInfo);
  const isManagement = userInfo && (isApprovedSeller(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo) || isDelivery);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const cartCount = cartItems.length;

  const menuRef = useRef(null);
  const profileRef = useRef(null);

  // Close panels on outside tap
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Close panels on route change
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  const logoutHandler = async () => {
    try { await logoutApiCall().unwrap(); } catch (_) {}
    navigate('/');
    dispatch(logout());
    setProfileOpen(false);
  };

  const handleCategoryNav = (cat) => {
    setMenuOpen(false);
    navigate(`/home?category=${encodeURIComponent(cat)}`);
  };

  const isHome = location.pathname === '/home' && !location.search;

  return (
    <>
      {/* ── Sliding overlays ───────────────────────────────────── */}

      {/* Menu panel – slides up from bottom */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-16 left-0 right-0 z-[200] bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl animate-slide-up pb-safe"
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Browse Categories</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 p-5">
            {CATEGORIES.map((cat) => {
              const icons = {
                Fashion: '👗',
                Creative: '🏺',
                Accessories: '🕶️',
                Mobiles: '📱',
                Furniture: '🛋️',
                Beauty: '💄',
                Electronics: '🎧',
              };
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryNav(cat)}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-100 transition-all active:scale-95"
                >
                  <span className="text-2xl">{icons[cat]}</span>
                  <span className="text-[11px] font-bold text-slate-700">{cat}</span>
                </button>
              );
            })}
          </div>
          {/* All products shortcut */}
          <div className="px-5 pb-5">
            <button
              onClick={() => { setMenuOpen(false); navigate('/home'); }}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-extrabold text-sm hover:bg-orange-600 active:scale-95 transition-all shadow-sm"
            >
              View All Products
            </button>
          </div>
        </div>
      )}

      {/* Profile panel – slides up from bottom */}
      {profileOpen && (
        <div
          ref={profileRef}
          className="fixed bottom-16 left-0 right-0 z-[200] bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl pb-safe"
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white font-extrabold text-sm border border-orange-600 shadow-sm shrink-0">
                {userInfo ? userInfo.name.charAt(0).toUpperCase() : (
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Your Account</p>
                <p className="text-sm font-bold text-slate-800 truncate max-w-[180px]">
                  {userInfo ? userInfo.name : 'Guest User'}
                </p>
              </div>
            </div>
            <button onClick={() => setProfileOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-1">
            {!userInfo ? (
              <Link
                to="/login"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-orange-500 text-white font-extrabold text-sm hover:bg-orange-600 transition active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In to Your Account
              </Link>
            ) : (
              <>
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Your Profile
                </Link>
              </>
            )}

            {isApprovedSeller(userInfo) && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Seller Controls
                  </p>
                </div>
                <Link
                  to="/seller/productlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Products
                </Link>
                <Link
                  to="/seller/orderlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Orders
                </Link>
                <Link
                  to="/seller/paymentlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Payments
                </Link>
              </>
            )}

            {(isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo)) && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {isSuperAdminUser(userInfo) ? 'Superadmin Controls' : 'Admin Controls'}
                  </p>
                </div>
                <Link
                  to={`${getStaffBasePath(userInfo)}/userlist`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Users
                </Link>
                <Link
                  to={`${getStaffBasePath(userInfo)}/verifysellers`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Verify Users
                </Link>
                <Link
                  to="/seller/productlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Products
                </Link>
                <Link
                  to="/seller/orderlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Orders
                </Link>
                <Link
                  to="/seller/paymentlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Payments
                </Link>
              </>
            )}

            {isDelivery && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Delivery Controls
                  </p>
                </div>
                <Link
                  to="/delivery/orderlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Orders
                </Link>
                <Link
                  to="/delivery/paymentlist"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
                >
                  Manage Payments
                </Link>
              </>
            )}

            {userInfo && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  onClick={logoutHandler}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-50 transition text-sm font-semibold text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {(menuOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-[190] bg-black/30 backdrop-blur-[2px]"
          onClick={() => { setMenuOpen(false); setProfileOpen(false); }}
        />
      )}

      {/* ── Bottom Tab Bar ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[195] md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-stretch h-16">
        {/* Home */}
        {!isDelivery && (
          <Link
            to="/home"
            id="mobile-nav-home"
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${isHome ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <svg className="h-5 w-5" fill={isHome ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 0 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-bold">Home</span>
          </Link>
        )}

        {/* Menu */}
        {!isDelivery && (
          <button
            id="mobile-nav-menu"
            onClick={() => { setMenuOpen((o) => !o); setProfileOpen(false); }}
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${menuOpen ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] font-bold">Menu</span>
          </button>
        )}

        {/* Delivery Orders */}
        {isDelivery && (
          <Link
            to="/delivery/orderlist"
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${location.pathname === '/delivery/orderlist' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <span className="text-[10px] font-bold">Orders</span>
          </Link>
        )}

        {/* Cart */}
        {!isManagement && (
          <Link
            to="/cart"
            id="mobile-nav-cart"
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors relative ${location.pathname === '/cart' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <div className="relative">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white border border-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">Cart</span>
          </Link>
        )}

        {/* Profile */}
        <button
          id="mobile-nav-profile"
          onClick={() => { setProfileOpen((o) => !o); setMenuOpen(false); }}
          className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${profileOpen ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {userInfo ? (
            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-xs border-2 ${profileOpen ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>

      {/* Bottom padding spacer so page content doesn't hide behind the tab bar */}
      <div className="md:hidden h-16" />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default MobileFooterBar;
