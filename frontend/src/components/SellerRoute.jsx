import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { isSellerUser, isPlatformAdmin, isSuperAdminUser } from '../utils/userRoles';

const SellerRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const allowed =
    isSellerUser(userInfo) || isPlatformAdmin(userInfo) || isSuperAdminUser(userInfo);
  return allowed ? <Outlet /> : <Navigate to="/seller" replace />;
};

export default SellerRoute;
