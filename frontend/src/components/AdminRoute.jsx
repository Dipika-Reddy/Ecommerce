import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { isPlatformAdmin } from '../utils/userRoles';

const AdminRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  return userInfo && isPlatformAdmin(userInfo) ? <Outlet /> : <Navigate to="/admin" replace />;
};

export default AdminRoute;
