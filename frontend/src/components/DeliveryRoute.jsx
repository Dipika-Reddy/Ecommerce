import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { isDeliveryAgent } from '../utils/userRoles';

const DeliveryRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  return userInfo && isDeliveryAgent(userInfo) ? <Outlet /> : <Navigate to="/login" replace />;
};

export default DeliveryRoute;
