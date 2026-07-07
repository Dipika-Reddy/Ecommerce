import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Eye, EyeOff } from 'lucide-react';
import { useLoginMutation, useForgotPasswordMutation, useVerifyOtpMutation, useResetPasswordMutation } from '../features/api/usersApiSlice';
import { setCredentials } from '../features/auth/authSlice';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isSellerUser } from '../utils/userRoles';
import Loader from '../components/Loader';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const [login, { isLoading }] = useLoginMutation();
  const [forgotPassword, { isLoading: isForgotLoading }] = useForgotPasswordMutation();
  const [verifyOtp, { isLoading: isVerifyLoading }] = useVerifyOtpMutation();
  const [resetPassword, { isLoading: isResetLoading }] = useResetPasswordMutation();

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      if (redirect && redirect !== '/' && redirect !== '/home') {
        navigate(redirect);
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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    try {
      if (forgotStep === 1) {
        await forgotPassword({ email: forgotEmail }).unwrap();
        toast.success('OTP sent to your email!');
        setForgotStep(2);
      } else if (forgotStep === 2) {
        await verifyOtp({ email: forgotEmail, otp }).unwrap();
        toast.success('OTP verified!');
        setForgotStep(3);
      } else if (forgotStep === 3) {
        if (newPassword !== confirmPassword) {
          return toast.error('Passwords do not match');
        }
        await resetPassword({ email: forgotEmail, otp, newPassword }).unwrap();
        toast.success('Password reset successful! Please log in.');
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
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
              <button 
                type="button" 
                onClick={() => { setShowForgotModal(true); setForgotStep(1); }} 
                className="text-[12px] text-brand-600 hover:text-brand-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                required
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Forgot Password</h3>
              <button onClick={() => setShowForgotModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-5">
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotStep === 1 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter registered email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </div>
                )}
                {forgotStep === 2 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Enter OTP</label>
                    <p className="text-xs text-gray-500 mb-2">Check your terminal (or Ethereal email) for the OTP.</p>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm tracking-widest font-mono"
                    />
                  </div>
                )}
                {forgotStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>
                  </>
                )}
                
                <button
                  type="submit"
                  disabled={isForgotLoading || isVerifyLoading || isResetLoading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-bold mt-2"
                >
                  {isForgotLoading || isVerifyLoading || isResetLoading ? 'Processing...' : (
                    forgotStep === 1 ? 'Send OTP' : forgotStep === 2 ? 'Verify OTP' : 'Confirm Changes'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
