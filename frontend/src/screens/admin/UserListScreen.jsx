import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useGetUsersQuery, useDeleteUserMutation, useUpdateUserMutation } from '../../features/api/usersApiSlice';
import { isSuperAdminUser } from '../../utils/userRoles';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import CustomSelect from '../../components/CustomSelect';

const UserListScreen = () => {
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();
  const [deleteUser, { isLoading: loadingDelete }] = useDeleteUserMutation();
  const [updateUser, { isLoading: loadingUpdate }] = useUpdateUserMutation();

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

  const roleChangeHandler = async (user, newRole) => {
    let isAdmin = false;
    let isSuperAdmin = false;
    let sellerStatus = 'NONE';
    let isDeliveryAgent = false;

    if (newRole === 'seller') {
      sellerStatus = 'APPROVED';
    } else if (newRole === 'admin') {
      isAdmin = true;
    } else if (newRole === 'superadmin') {
      isAdmin = true;
      isSuperAdmin = true;
    } else if (newRole === 'delivery') {
      isDeliveryAgent = true;
    }

    try {
      await updateUser({
        userId: user._id,
        data: { isAdmin, isSuperAdmin, sellerStatus, isDeliveryAgent },
      }).unwrap();
      toast.success(`Updated role for ${user.name} to ${newRole}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update user role');
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

      {(loadingDelete || loadingUpdate) && <Loader />}

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
              {users.map((user) => {
                // Determine current role string
                const currentRole = user.isSuperAdmin
                  ? 'superadmin'
                  : user.isAdmin
                    ? 'admin'
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
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-200">
                          {isSuperAdminUser(userInfo) ? 'Superadmin (Locked)' : 'Admin (Locked)'}
                        </span>
                      ) : (!isSuperAdminUser(userInfo) && (user.isSuperAdmin || user.isAdmin)) ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800 border border-gray-200">
                          {user.isSuperAdmin ? 'Superadmin (Protected)' : 'Admin (Protected)'}
                        </span>
                      ) : (
                        <CustomSelect
                          value={currentRole}
                          onChange={(v) => roleChangeHandler(user, v)}
                          options={[
                            { value: 'customer', label: 'Customer' },
                            { value: 'seller', label: 'Seller' },
                            { value: 'delivery', label: 'Delivery Agent' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'superadmin', label: 'Superadmin' },
                          ]}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic font-sans">Self protection active</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {user.sellerStatus === 'PENDING' && (
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
