import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGetUsersQuery, useVerifySellerMutation } from '../../features/api/usersApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';

const VerifySellersScreen = () => {
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();
  const [verifySeller, { isLoading: loadingVerify }] = useVerifySellerMutation();

  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleVerify = async (userId, approve) => {
    try {
      await verifySeller({ userId, approve }).unwrap();
      toast.success(approve ? 'Seller approved! They can now sign in at the seller portal.' : 'Seller application rejected.');
      setShowModal(false);
      setSelectedUser(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Verification action failed');
    }
  };

  // Filter for pending and approved seller applicants
  const pendingSellers = users ? users.filter(user => ['PENDING', 'APPROVED'].includes(user.sellerStatus)) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Verify Sellers</h1>
          <p className="text-sm text-slate-500 mt-1">Review pending business documents (PAN, GST, license) and approve seller access.</p>
        </div>
        <div className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-300">
          {pendingSellers.length} Seller Application{pendingSellers.length !== 1 && 's'}
        </div>
      </div>

      {loadingVerify && <Loader />}

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message || 'Error loading applications'}</Message>
      ) : pendingSellers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-slate-800">No sellers yet!</h3>
          <p className="text-sm text-slate-500 mt-1">There are no seller applications or verified sellers at the moment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Applicant Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">PAN Card Number</th>
                <th className="px-4 py-3">GSTIN Number</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingSellers.map((user) => (
                <tr key={user._id} className="border-t border-slate-100 hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase border ${
                        user.sellerStatus === 'APPROVED' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {user.sellerStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{user.panNumber}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{user.gstNumber}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowModal(true);
                      }}
                      className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3.5 py-2 rounded-lg transition"
                    >
                      Review Docs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Document Verification Modal ── */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Seller Documents Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Verify application for {selectedUser.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                  setIsZoomed(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">PAN Card Number</span>
                  <span className="text-sm font-extrabold text-slate-800 select-all font-mono">{selectedUser.panNumber || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">GST Number</span>
                  <span className="text-sm font-extrabold text-slate-800 select-all font-mono">{selectedUser.gstNumber || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">License Image</span>
                {selectedUser.licensePicture ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex justify-center">
                    <img
                      src={selectedUser.licensePicture}
                      alt="Seller License"
                      onClick={() => setIsZoomed(prev => !prev)}
                      className={`cursor-zoom-in transition-all duration-300 max-h-60 object-contain ${
                        isZoomed ? 'scale-150 max-h-none py-10 cursor-zoom-out' : ''
                      }`}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                    No license image uploaded
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              {selectedUser.sellerStatus === 'PENDING' ? (
                <>
                  <button
                    onClick={() => handleVerify(selectedUser._id, false)}
                    className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(selectedUser._id, true)}
                    className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition shadow-sm"
                  >
                    Approve as Seller
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                    setIsZoomed(false);
                  }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition shadow-sm"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifySellersScreen;
