import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useRegisterMutation } from '../features/api/usersApiSlice';
import { useUploadProductImageMutation } from '../features/api/productsApiSlice';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isSellerUser } from '../utils/userRoles';
import Loader from '../components/Loader';

/* ── Bee Logo ── */
const BeeLogo = () => (
  <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="38" cy="35" rx="14" ry="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" transform="rotate(-30 38 35)" />
    <ellipse cx="62" cy="35" rx="14" ry="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" transform="rotate(30 62 35)" />
    <rect x="35" y="45" width="30" height="40" rx="15" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
    <path d="M37 56h26M36 68h28" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    <path d="M45 45c-2-8-6-10-10-8M55 45c2-8 6-10 10-8" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
    <circle cx="43" cy="52" r="2.5" fill="#1e293b" />
    <circle cx="57" cy="52" r="2.5" fill="#1e293b" />
  </svg>
);

const ROLES = [
  { id: 'buyer', label: 'Buyer' },
  { id: 'seller', label: 'Seller' },
];

const colorMap = {
  buyer: {
    ring: 'ring-sky-500 border-sky-400 bg-sky-50',
  },
  seller: {
    ring: 'ring-amber-500 border-amber-400 bg-amber-50',
  },
};

const SignupScreen = () => {
  const [step, setStep] = useState(1); // 1 = role select, 2 = registration form
  const [selectedRole, setSelectedRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Business verification fields for Sellers
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [licensePicture, setLicensePicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isPendingSeller, setIsPendingSeller] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [register, { isLoading }] = useRegisterMutation();
  const [uploadProductImage] = useUploadProductImageMutation();
  const { userInfo } = useSelector((state) => state.auth);

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      const res = await uploadProductImage(formData).unwrap();
      setLicensePicture(res.image);
      toast.success('License picture uploaded successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to upload license picture');
    } finally {
      setUploading(false);
    }
  };

  // Pre-select role from URL param (e.g. /signup?role=seller)
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'seller') setSelectedRole('seller');
    else if (roleParam === 'buyer') setSelectedRole('buyer');
  }, [searchParams]);

  // Already logged in → redirect
  useEffect(() => {
    if (userInfo) {
      if (isSuperAdminUser(userInfo)) navigate('/superadmin/userlist', { replace: true });
      else if (isPlatformAdmin(userInfo)) navigate('/admin/userlist', { replace: true });
      else if (isSellerUser(userInfo) && !isPlatformAdmin(userInfo) && !isSuperAdminUser(userInfo)) navigate('/seller/productlist', { replace: true });
      else navigate('/home', { replace: true });
    }
  }, [userInfo, navigate]);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setStep(2);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (selectedRole === 'seller') {
      if (!panNumber) {
        toast.error('PAN card number is required for seller registration');
        return;
      }
      if (!gstNumber) {
        toast.error('GST number is required for seller registration');
        return;
      }
      if (!licensePicture) {
        toast.error('License picture is required for seller registration');
        return;
      }
    }
    try {
      const res = await register({
        name,
        email,
        password,
        phoneNumber,
        isSellerRequested: selectedRole === 'seller',
        panNumber: selectedRole === 'seller' ? panNumber : undefined,
        gstNumber: selectedRole === 'seller' ? gstNumber : undefined,
        licensePicture: selectedRole === 'seller' ? licensePicture : undefined,
      }).unwrap();
      if (res.sellerStatus === 'PENDING') {
        setIsPendingSeller(true);
        toast.info('Your seller registration has been submitted and is pending verification. 🎉');
      } else {
        toast.success(`Welcome to Buybee, ${res.name}! Registration successful. Please sign in to open the site for the first time. 🎉`);
        navigate('/login');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed');
    }
  };
  if (isPendingSeller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-sky-50/30 flex flex-col items-center justify-center px-4 py-12">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <BeeLogo />
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
            Buybee
          </span>
        </Link>
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-center">
          <div className="text-5xl mb-4">⌛</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Application Submitted!</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Thank you for registering as a Seller on Buybee. Your PAN, GST, and license details have been sent to the system administrator for review.
          </p>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Application Details</div>
            <div className="text-xs text-slate-700"><strong>Name:</strong> {name}</div>
            <div className="text-xs text-slate-700"><strong>Email:</strong> {email}</div>
            <div className="text-xs text-slate-700"><strong>PAN:</strong> {panNumber}</div>
            <div className="text-xs text-slate-700"><strong>GST:</strong> {gstNumber}</div>
          </div>
          <Link
            to="/login"
            className="block w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition-all text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-sky-50/30 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <BeeLogo />
        <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
          Buybee
        </span>
      </Link>

      <div className="w-full max-w-2xl">
        {/* ══ STEP 1: Role Selection ══ */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map((role) => {
              const c = colorMap[role.id];
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  id={`role-select-${role.id}`}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  className={`rounded-xl border-2 p-10 transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? `ring-2 ${c.ring}`
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-slate-900 text-lg">{role.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ══ STEP 2: Registration Form ══ */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8">
            {/* Role badge */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Go back"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                selectedRole === 'seller'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-sky-100 text-sky-700'
              }`}>
                {selectedRole === 'seller' ? 'Seller' : 'Buyer'}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 mb-1">Create your account</h1>
            <p className="text-sm text-slate-500 mb-6">Fill in your details to get started on Buybee.</p>

            <form onSubmit={submitHandler} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  required
                  autoFocus
                  placeholder="John Doe"
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  required
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  required
                  placeholder="Enter 10-digit mobile number"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  required
                  placeholder="Re-enter your password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                />
              </div>

              {selectedRole === 'seller' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Business Verification</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      value={panNumber}
                      required
                      placeholder="Enter 10-digit PAN number"
                      maxLength={10}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={gstNumber}
                      required
                      placeholder="Enter 15-digit GSTIN"
                      maxLength={15}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      License Picture
                    </label>
                    <div className="mt-1 flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        required={!licensePicture}
                        onChange={uploadFileHandler}
                        className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                      />
                      {uploading && <div className="text-xs text-amber-600 font-bold">Uploading license image...</div>}
                      {licensePicture && (
                        <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          License uploaded successfully!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <Loader /> : `Create ${selectedRole === 'seller' ? 'Seller' : 'Buyer'} Account`}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-600 hover:text-amber-700 font-semibold underline underline-offset-2">
                Sign In
              </Link>
            </p>

            <p className="text-center text-[10px] text-slate-400 mt-3 leading-relaxed">
              By creating an account, you agree to Buybee's{' '}
              <a href="#" className="underline">Terms of Use</a> and{' '}
              <a href="#" className="underline">Privacy Policy</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupScreen;
