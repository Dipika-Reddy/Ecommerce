import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isApprovedSeller, isPlatformAdmin, isSuperAdminUser, isSellerUser } from './utils/userRoles';

import Header from './components/Header';
import Footer from './components/Footer';
import MobileFooterBar from './components/MobileFooterBar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import SellerRoute from './components/SellerRoute';
import DeliveryRoute from './components/DeliveryRoute';
import SupportRoute from './components/SupportRoute';
import SupportCallPanel from './components/SupportCallPanel';

// Landing & auth (bare layout — no shared Header/Footer)
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import RegisterScreen from './screens/RegisterScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import SuperAdminLoginScreen from './screens/SuperAdminLoginScreen';
import SellerLoginScreen from './screens/SellerLoginScreen';
import DeliveryLoginScreen from './screens/DeliveryLoginScreen';
import SupportLoginScreen from './screens/SupportLoginScreen';

// Public catalog
import HomeScreen from './screens/HomeScreen';
import ProductScreen from './screens/ProductScreen';
import CartScreen from './screens/CartScreen';
import WishlistScreen from './screens/WishlistScreen';

// Checkout + account (protected)
import ShippingScreen from './screens/ShippingScreen';
import PaymentScreen from './screens/PaymentScreen';
import PlaceOrderScreen from './screens/PlaceOrderScreen';
import OrderScreen from './screens/OrderScreen';
import ProfileScreen from './screens/ProfileScreen';

// Seller screens
import ProductListScreen from './screens/admin/ProductListScreen';
import ProductEditScreen from './screens/admin/ProductEditScreen';
import OrderListScreen from './screens/admin/OrderListScreen';
import AdminPaymentsScreen from './screens/admin/AdminPaymentsScreen';
import DeliveryPaymentsScreen from './screens/admin/DeliveryPaymentsScreen';

// Platform admin screens (shared UI for admin + superadmin)
import UserListScreen from './screens/admin/UserListScreen';
import VerifySellersScreen from './screens/admin/VerifySellersScreen';
import CouponListScreen from './screens/admin/CouponListScreen';

const StandardLayout = ({ children }) => (
  <div className="flex min-h-screen flex-col">
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
    <MobileFooterBar />
  </div>
);

const App = () => {
  const { userInfo } = useSelector((state) => state.auth);

  return (
    <>
      <Routes>
        {/* Bare-layout routes */}
        <Route path="/" element={<LandingScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/seller" element={<SellerLoginScreen />} />
      <Route path="/admin" element={<AdminLoginScreen />} />
      <Route path="/superadmin" element={<SuperAdminLoginScreen />} />
      <Route path="/delivery" element={<DeliveryLoginScreen />} />
      <Route path="/support" element={<SupportLoginScreen />} />

      {/* Standard layout routes */}
      <Route path="/home" element={
        userInfo?.isDeliveryAgent ? <Navigate to="/delivery/orderlist" replace /> : 
        userInfo?.isSupport ? <Navigate to="/support/orders" replace /> :
        <StandardLayout><HomeScreen /></StandardLayout>
      } />
      <Route path="/search/:keyword" element={userInfo?.isDeliveryAgent ? <Navigate to="/delivery/orderlist" replace /> : userInfo?.isSupport ? <Navigate to="/support/orders" replace /> : <StandardLayout><HomeScreen /></StandardLayout>} />
      <Route path="/product/:id" element={userInfo?.isDeliveryAgent ? <Navigate to="/delivery/orderlist" replace /> : userInfo?.isSupport ? <Navigate to="/support/orders" replace /> : <StandardLayout><ProductScreen /></StandardLayout>} />
      <Route path="/cart" element={userInfo?.isDeliveryAgent ? <Navigate to="/delivery/orderlist" replace /> : userInfo?.isSupport ? <Navigate to="/support/orders" replace /> : <StandardLayout><CartScreen /></StandardLayout>} />
      <Route path="/wishlist" element={userInfo?.isDeliveryAgent ? <Navigate to="/delivery/orderlist" replace /> : userInfo?.isSupport ? <Navigate to="/support/orders" replace /> : <StandardLayout><WishlistScreen /></StandardLayout>} />

      <Route path="/login" element={<StandardLayout><LoginScreen /></StandardLayout>} />
      <Route path="/register" element={<StandardLayout><RegisterScreen /></StandardLayout>} />

      <Route
        path="/buyer-dashboard"
        element={userInfo && !isSellerUser(userInfo) && !isPlatformAdmin(userInfo) && !isSuperAdminUser(userInfo) && !userInfo.isDeliveryAgent ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/seller-dashboard"
        element={isSellerUser(userInfo) && !isPlatformAdmin(userInfo) && !isSuperAdminUser(userInfo) ? <Navigate to="/seller/productlist" replace /> : <Navigate to="/seller" replace />}
      />
      <Route
        path="/admin-dashboard"
        element={isPlatformAdmin(userInfo) ? <Navigate to="/admin/userlist" replace /> : <Navigate to="/admin" replace />}
      />
      <Route
        path="/superadmin-dashboard"
        element={isSuperAdminUser(userInfo) ? <Navigate to="/superadmin/userlist" replace /> : <Navigate to="/superadmin" replace />}
      />
      <Route
        path="/delivery-dashboard"
        element={userInfo?.isDeliveryAgent ? <Navigate to="/delivery/orderlist" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/support-dashboard"
        element={userInfo?.isSupport ? <Navigate to="/support/orders" replace /> : <Navigate to="/login" replace />}
      />

      <Route element={<PrivateRoute />}>
        <Route path="/shipping" element={<StandardLayout><ShippingScreen /></StandardLayout>} />
        <Route path="/payment" element={<StandardLayout><PaymentScreen /></StandardLayout>} />
        <Route path="/placeorder" element={<StandardLayout><PlaceOrderScreen /></StandardLayout>} />
        <Route path="/order/:id" element={<StandardLayout><OrderScreen /></StandardLayout>} />
        <Route path="/profile" element={<StandardLayout><ProfileScreen /></StandardLayout>} />
        <Route path="/myorders" element={<StandardLayout><ProfileScreen /></StandardLayout>} />
      </Route>

      {/* Seller dashboard */}
      <Route element={<SellerRoute />}>
        <Route path="/seller/productlist" element={<StandardLayout><ProductListScreen /></StandardLayout>} />
        <Route path="/seller/productlist/:pageNumber" element={<StandardLayout><ProductListScreen /></StandardLayout>} />
        <Route path="/seller/product/:id/edit" element={<StandardLayout><ProductEditScreen /></StandardLayout>} />
        <Route path="/seller/orderlist" element={<StandardLayout><OrderListScreen /></StandardLayout>} />
        <Route path="/seller/paymentlist" element={<StandardLayout><AdminPaymentsScreen /></StandardLayout>} />
      </Route>

      {/* Delivery Agent dashboard */}
      <Route element={<DeliveryRoute />}>
        <Route path="/delivery/orderlist" element={<StandardLayout><OrderListScreen /></StandardLayout>} />
        <Route path="/delivery/paymentlist" element={<StandardLayout><DeliveryPaymentsScreen /></StandardLayout>} />
      </Route>

      {/* Platform admin dashboard */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/userlist" element={<StandardLayout><UserListScreen /></StandardLayout>} />
        <Route path="/admin/verifysellers" element={<StandardLayout><VerifySellersScreen /></StandardLayout>} />
        <Route path="/admin/couponlist" element={<StandardLayout><CouponListScreen /></StandardLayout>} />
      </Route>

      {/* Super admin dashboard (same pages as admin) */}
      <Route element={<SuperAdminRoute />}>
        <Route path="/superadmin/userlist" element={<StandardLayout><UserListScreen /></StandardLayout>} />
        <Route path="/superadmin/verifysellers" element={<StandardLayout><VerifySellersScreen /></StandardLayout>} />
        <Route path="/superadmin/couponlist" element={<StandardLayout><CouponListScreen /></StandardLayout>} />
      </Route>
      {/* Support Team dashboard */}
      <Route element={<SupportRoute />}>
        <Route path="/support/orders" element={<StandardLayout><OrderListScreen /></StandardLayout>} />
        <Route path="/support/userlist" element={<StandardLayout><UserListScreen /></StandardLayout>} />
        <Route path="/support/verifysellers" element={<StandardLayout><VerifySellersScreen /></StandardLayout>} />
      </Route>
    </Routes>
    <SupportCallPanel />
    </>
  );
};

export default App;
