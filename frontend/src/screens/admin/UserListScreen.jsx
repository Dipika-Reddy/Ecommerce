import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useGetUsersQuery, useDeleteUserMutation } from '../../features/api/usersApiSlice';
import { isSuperAdminUser } from '../../utils/userRoles';
import Loader from '../../components/Loader';
import Message from '../../components/Message';

const UserListScreen = () => {
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();
  const [deleteUser, { isLoading: loadingDelete }] = useDeleteUserMutation();

  const { userInfo } = useSelector((state) => state.auth);
  const location = useLocation();
  const staffBasePath = location.pathname.startsWith('/superadmin') ? '/superadmin' : '/admin';

  const deleteHandler = async (id) => {
    if (window.confirm('Delete this user account?')) {
      try {
        await deleteUser(id).unwrap();
        toast.success('User deleted successfully');
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete user');
      }
    }
  };


  return (
    <div className="mx-auto max-w-5xl px-4 py-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">User Directory &amp; Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Superadmin Control Panel: manage system roles and user profiles.</p>
        </div>
      </div>

      {loadingDelete && <Loader />}

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message || 'Error loading users'}</Message>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Access Tier Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => userInfo?.isSuperAdmin || !u.isSuperAdmin)
                .map((user) => {
                const currentRole = user.isSuperAdmin
                  ? 'superadmin'
                  : user.isAdmin
                    ? 'admin'
                    : user.isSupport
                      ? 'support'
                      : user.sellerStatus === 'APPROVED'
                        ? 'seller'
                        : user.isDeliveryAgent
                          ? 'delivery'
                          : 'customer';

                const isSelf = user._id === userInfo?._id;

                return (
                  <tr key={user._id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 select-all">
                      {user._id}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{user.name}</span>
                        {isSelf && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal border border-amber-200 font-sans">You</span>}
                        {user.sellerStatus === 'PENDING' && (
                          <span className="text-[9px] font-black tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                            Pending Seller
                          </span>
                        )}
                        {user.sellerStatus === 'APPROVED' && (
                          <span className="text-[9px] font-bold tracking-wider bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full uppercase">
                            Approved Seller
                          </span>
                        )}
                        {user.sellerStatus === 'REJECTED' && (
                          <span className="text-[9px] font-bold tracking-wider bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                            Rejected Seller
                          </span>
                        )}
                        {user.isDeliveryAgent && user.deliveryStatus === 'APPROVED' && (
                          <span className="text-[9px] font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4.13-5.69z" clipRule="evenodd" />
                            </svg>
                            Verified Agent
                          </span>
                        )}
                        {user.isDeliveryAgent && user.deliveryStatus === 'PENDING' && (
                          <span className="text-[9px] font-black tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                            Pending Agent
                          </span>
                        )}
                        {user.isDeliveryAgent && user.deliveryStatus === 'REJECTED' && (
                          <span className="text-[9px] font-bold tracking-wider bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                            Rejected Agent
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const roleLabels = {
                          superadmin: { text: 'Superadmin', bg: 'bg-purple-100', textCol: 'text-purple-800', border: 'border-purple-200' },
                          admin: { text: 'Admin', bg: 'bg-red-105', textCol: 'text-red-800', border: 'border-red-200' },
                          support: { text: 'Support Team', bg: 'bg-pink-50', textCol: 'text-pink-700', border: 'border-pink-200' },
                          seller: { text: 'Seller', bg: 'bg-green-50', textCol: 'text-green-700', border: 'border-green-200' },
                          delivery: { text: 'Delivery Agent', bg: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200' },
                          customer: { text: 'Customer', bg: 'bg-slate-100', textCol: 'text-slate-700', border: 'border-slate-200' },
                        };
                        const role = roleLabels[currentRole] || roleLabels.customer;
                        return (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${role.bg} ${role.textCol} border ${role.border}`}>
                            {role.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic font-sans">Self protection active</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {(user.sellerStatus === 'PENDING' || (user.isDeliveryAgent && user.deliveryStatus === 'PENDING')) && (
                            <Link
                              to={`${staffBasePath}/verifysellers`}
                              className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 px-2.5 py-1.5 rounded transition font-sans animate-pulse"
                            >
                              Verify Docs
                            </Link>
                          )}
                          {user.isSuperAdmin && !userInfo?.isSuperAdmin ? (
                            <span className="text-xs text-gray-400 italic font-sans">Protected</span>
                          ) : (
                            <button
                              onClick={() => deleteHandler(user._id)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded transition font-sans"
                            >
                              Delete Account
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserListScreen;
