import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useLoginMutation } from '../features/api/usersApiSlice';
import { setCredentials } from '../features/auth/authSlice';
import { isSellerUser, isPlatformAdmin, isSuperAdminUser } from '../utils/userRoles';
import Loader from '../components/Loader';

const SellerLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [login, { isLoading }] = useLoginMutation();
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo && isSellerUser(userInfo) && !isPlatformAdmin(userInfo) && !isSuperAdminUser(userInfo)) {
      navigate('/seller/productlist', { replace: true });
    }
  }, [userInfo, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();

      if (!isSellerUser(res) || isPlatformAdmin(res) || isSuperAdminUser(res)) {
        toast.error('Access denied. This portal is for approved sellers only.');
        return;
      }

      dispatch(setCredentials(res));
      toast.success(`Welcome back, ${res.name}`);
      navigate('/seller/productlist');
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(251,191,36,0.08) 0, transparent 50%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.06) 0, transparent 50%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/60 border border-slate-600 shadow-xl mb-4">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-1 tracking-tight">Seller Portal</h1>
          <p className="text-slate-400 text-sm">Buybee Store Management</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={submitHandler} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                Seller Email
              </label>
              <input
                id="seller-email"
                type="email"
                value={email}
                required
                autoFocus
                placeholder="seller@buybee.com"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                Password
              </label>
              <input
                id="seller-password"
                type="password"
                value={password}
                required
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>

            <button
              id="seller-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-amber-900/30 transition-all duration-150 flex items-center justify-center gap-2 mt-1"
            >
              {isLoading ? <Loader /> : 'Sign In to Seller Portal'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a
            href="/"
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors underline underline-offset-2"
          >
            ← Back to Buybee Store
          </a>
        </div>
      </div>
    </div>
  );
};

export default SellerLoginScreen;
