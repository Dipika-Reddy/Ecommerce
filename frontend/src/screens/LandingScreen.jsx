import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isSellerUser } from '../utils/userRoles';

/* ── Inline Bee SVG (shared branding) ── */
const BeeLogo = ({ size = 48 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="38" cy="35" rx="14" ry="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" transform="rotate(-30 38 35)" />
    <ellipse cx="62" cy="35" rx="14" ry="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" transform="rotate(30 62 35)" />
    <rect x="35" y="45" width="30" height="40" rx="15" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
    <path d="M37 56h26M36 68h28" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    <path d="M45 45c-2-8-6-10-10-8M55 45c2-8 6-10 10-8" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
    <circle cx="43" cy="52" r="2.5" fill="#1e293b" />
    <circle cx="57" cy="52" r="2.5" fill="#1e293b" />
  </svg>
);

const LandingScreen = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Redirect already-logged-in users straight to the store
  useEffect(() => {
    if (userInfo) {
      if (isSuperAdminUser(userInfo)) {
        navigate('/superadmin/userlist', { replace: true });
      } else if (isPlatformAdmin(userInfo)) {
        navigate('/admin/userlist', { replace: true });
      } else if (isSellerUser(userInfo) && !isPlatformAdmin(userInfo) && !isSuperAdminUser(userInfo)) {
        navigate('/seller/productlist', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [userInfo, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-sky-50/40 flex flex-col">
      {/* ── Navbar strip ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BeeLogo size={36} />
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
              Buybee
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors duration-150"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm transition-colors duration-150"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center">
        <div className="relative mb-6 inline-flex">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl scale-150" />
          <BeeLogo size={80} />
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight mb-4">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
            Buybee
          </span>
        </h1>
        <p className="max-w-xl text-lg text-slate-600 mb-10 leading-relaxed">
          India's fastest-growing handcrafted marketplace — shop unique finds or grow your store with powerful seller tools.
        </p>

        {/* ── CTA Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:justify-center">
          <Link
            to="/login"
            id="landing-signin-btn"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-base font-bold shadow-sm transition-all duration-150 hover:border-slate-400 hover:shadow"
          >
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In
          </Link>
          <Link
            to="/signup"
            id="landing-signup-btn"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-base font-bold shadow-md shadow-amber-200 transition-all duration-150 hover:shadow-lg hover:shadow-amber-300 hover:-translate-y-0.5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create Account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Buybee · All rights reserved</p>
      </footer>
    </div>
  );
};

export default LandingScreen;
