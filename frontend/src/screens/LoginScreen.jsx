import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useLoginMutation } from '../features/api/usersApiSlice';
import { setCredentials } from '../features/auth/authSlice';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isSellerUser } from '../utils/userRoles';
import Loader from '../components/Loader';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const [login, { isLoading }] = useLoginMutation();
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      if (redirect && redirect !== '/' && redirect !== '/home') {
        navigate(redirect);
      } else if (isSuperAdminUser(userInfo)) {
        navigate('/superadmin/userlist');
      } else if (isPlatformAdmin(userInfo)) {
        navigate('/admin/userlist');
      } else if (isSellerUser(userInfo) && !isPlatformAdmin(userInfo) && !isSuperAdminUser(userInfo)) {
        navigate('/seller/productlist');
      } else {
        navigate('/home');
      }
    }
  }, [userInfo, redirect, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();

      if (isSuperAdminUser(res) || isPlatformAdmin(res)) {
        toast.error('Please use the correct administrator portal.');
        return;
      }
      if (isSellerUser(res)) {
        toast.error('Please use the seller portal to sign in.');
        return;
      }

      dispatch(setCredentials(res));
      toast.success('Successfully signed in');
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16 font-sans flex flex-col items-center">
      {/* Buybee Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <svg viewBox="0 0 100 100" className="w-9 h-9 hover:scale-105 transition-transform" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent font-display">
          Buybee
        </span>
      </Link>

      {/* Sign-in card */}
      <div className="w-full bg-white border border-gray-200 rounded-xl p-7 shadow-sm text-left">
        <h1 className="text-[26px] font-black text-gray-900 mb-1 leading-tight">Sign in</h1>
        <p className="text-xs text-gray-500 mb-5">Sign in with your customer account.</p>

        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-1">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              required
              autoFocus
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="block text-[13px] font-bold text-gray-900">
                Password
              </label>
              <a href="#" className="text-[12px] text-brand-600 hover:text-brand-700 hover:underline">
                Forgot Password?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              required
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white transition-colors"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-bold shadow-sm transition duration-150 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 text-xs leading-relaxed text-gray-500">
          By continuing, you agree to Buybee's{' '}
          <a href="#" className="text-brand-600 hover:underline">Conditions of Use</a> and{' '}
          <a href="#" className="text-brand-600 hover:underline">Privacy Notice</a>.
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" id="keep" className="rounded text-brand-500 focus:ring-brand-500" />
          <label htmlFor="keep">Keep me signed in</label>
        </div>
      </div>

      {/* New to Buybee */}
      <div className="w-full mt-5">
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-3 text-xs text-gray-500">New to Buybee?</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <Link
          to="/signup"
          id="login-create-account-link"
          className="mt-2 block w-full text-center bg-slate-50 hover:bg-slate-100 border border-gray-300 py-2.5 rounded-lg text-xs font-bold text-gray-700 shadow-sm transition duration-150"
        >
          Create your Buybee account
        </Link>
      </div>
    </div>
  );
};

export default LoginScreen;
