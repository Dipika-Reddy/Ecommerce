import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGetUsersQuery, useVerifySellerMutation, useVerifyDeliveryMutation } from '../../features/api/usersApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';

const VerifySellersScreen = () => {
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();
  const [verifySeller, { isLoading: loadingVerifySeller }] = useVerifySellerMutation();
  const [verifyDelivery, { isLoading: loadingVerifyDelivery }] = useVerifyDeliveryMutation();

  const [activeTab, setActiveTab] = useState('sellers'); // 'sellers' or 'delivery'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [zoomedImg, setZoomedImg] = useState(null);

  const handleVerify = async (userId, approve) => {
    try {
      if (activeTab === 'sellers') {
        await verifySeller({ userId, approve }).unwrap();
        toast.success(approve ? 'Seller approved! They can now sign in at the seller portal.' : 'Seller application rejected.');
      } else {
        await verifyDelivery({ userId, approve }).unwrap();
        toast.success(approve ? 'Delivery Agent approved! They can now start delivering orders.' : 'Delivery Agent application rejected.');
      }
      setShowModal(false);
      setSelectedUser(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Verification action failed');
    }
  };

  const pendingSellers = users ? users.filter(user => ['PENDING', 'APPROVED'].includes(user.sellerStatus)) : [];
  const pendingDelivery = users ? users.filter(user => user.isDeliveryAgent && ['PENDING', 'APPROVED', 'REJECTED'].includes(user.deliveryStatus)) : [];

  const currentList = activeTab === 'sellers' ? pendingSellers : pendingDelivery;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 font-sans">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Document Verification</h1>
          <p className="text-sm text-slate-500 mt-1">Review pending applicant documents and approve system access.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => { setActiveTab('sellers'); setSelectedUser(null); setShowModal(false); }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'sellers'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Sellers ({pendingSellers.length})
        </button>
        <button
          onClick={() => { setActiveTab('delivery'); setSelectedUser(null); setShowModal(false); }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'delivery'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Delivery Agents ({pendingDelivery.length})
        </button>
      </div>

      {(loadingVerifySeller || loadingVerifyDelivery) && <Loader />}

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message || 'Error loading applications'}</Message>
      ) : currentList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-slate-800">All caught up!</h3>
          <p className="text-sm text-slate-500 mt-1">There are no pending or active applications in this category.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
              {activeTab === 'sellers' ? (
                <tr>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">PAN Card Number</th>
                  <th className="px-4 py-3">GSTIN Number</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Bike Number Plate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              )}
            </thead>
            <tbody>
              {currentList.map((user) => (
                <tr key={user._id} className="border-t border-slate-100 hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  {activeTab === 'sellers' ? (
                    <>
                      <td className="px-4 py-3 font-mono text-slate-700">{user.panNumber}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{user.gstNumber}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono text-slate-700">{user.bikeNumberPlate || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase border ${
                          user.deliveryStatus === 'APPROVED' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : user.deliveryStatus === 'REJECTED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {user.deliveryStatus}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowModal(true);
                      }}
                      className="text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-lg transition"
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">
                  {activeTab === 'sellers' ? 'Seller Documents Verification' : 'Delivery Agent Documents Verification'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Verify application for {selectedUser.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                  setZoomedImg(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {activeTab === 'sellers' ? (
                <>
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
                          onClick={() => setZoomedImg(zoomedImg === selectedUser.licensePicture ? null : selectedUser.licensePicture)}
                          className={`cursor-zoom-in transition-all duration-300 max-h-60 object-contain ${
                            zoomedImg === selectedUser.licensePicture ? 'scale-150 max-h-none py-10 cursor-zoom-out' : ''
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                        No license image uploaded
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bike Number Plate</span>
                    <span className="text-sm font-extrabold text-slate-800 select-all font-mono">{selectedUser.bikeNumberPlate || 'N/A'}</span>
                  </div>

                  <div className="space-y-4">
                    {/* Passport Photo */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Passport Size Image</span>
                      {selectedUser.passportPhoto ? (
                        <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex justify-center">
                          <img
                            src={selectedUser.passportPhoto}
                            alt="Passport size photo"
                            onClick={() => setZoomedImg(zoomedImg === selectedUser.passportPhoto ? null : selectedUser.passportPhoto)}
                            className={`cursor-zoom-in transition-all duration-300 max-h-40 object-contain ${
                              zoomedImg === selectedUser.passportPhoto ? 'scale-150 max-h-none py-10 cursor-zoom-out' : ''
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                          No passport photo uploaded
                        </div>
                      )}
                    </div>

                    {/* Driving License */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Driving License</span>
                      {selectedUser.drivingLicense ? (
                        <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex justify-center">
                          <img
                            src={selectedUser.drivingLicense}
                            alt="Driving License"
                            onClick={() => setZoomedImg(zoomedImg === selectedUser.drivingLicense ? null : selectedUser.drivingLicense)}
                            className={`cursor-zoom-in transition-all duration-300 max-h-40 object-contain ${
                              zoomedImg === selectedUser.drivingLicense ? 'scale-150 max-h-none py-10 cursor-zoom-out' : ''
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                          No driving license uploaded
                        </div>
                      )}
                    </div>

                    {/* Bike Registration (RC) */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Bike Registration Document (RC)</span>
                      {selectedUser.bikeRegistration ? (
                        <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex justify-center">
                          <img
                            src={selectedUser.bikeRegistration}
                            alt="Bike Registration (RC)"
                            onClick={() => setZoomedImg(zoomedImg === selectedUser.bikeRegistration ? null : selectedUser.bikeRegistration)}
                            className={`cursor-zoom-in transition-all duration-300 max-h-40 object-contain ${
                              zoomedImg === selectedUser.bikeRegistration ? 'scale-150 max-h-none py-10 cursor-zoom-out' : ''
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                          No bike registration document uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              {((activeTab === 'sellers' && selectedUser.sellerStatus === 'PENDING') || (activeTab === 'delivery' && selectedUser.deliveryStatus === 'PENDING')) ? (
                <>
                  <button
                    onClick={() => handleVerify(selectedUser._id, false)}
                    className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(selectedUser._id, true)}
                    className="px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm"
                  >
                    Approve
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                    setZoomedImg(null);
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
