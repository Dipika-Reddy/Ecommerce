import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { isSupportUser } from '../utils/userRoles';

const SupportRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  return userInfo && isSupportUser(userInfo) ? <Outlet /> : <Navigate to="/login" replace />;
};

export default SupportRoute;
