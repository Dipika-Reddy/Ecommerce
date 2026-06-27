import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { isSuperAdminUser } from '../utils/userRoles';

const SuperAdminRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  return userInfo && isSuperAdminUser(userInfo) ? <Outlet /> : <Navigate to="/superadmin" replace />;
};

export default SuperAdminRoute;
