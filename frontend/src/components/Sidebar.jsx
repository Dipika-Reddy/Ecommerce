import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useLogoutMutation } from '../features/api/usersApiSlice';
import { logout } from '../features/auth/authSlice';
import {
  isApprovedSeller,
  isPlatformAdmin,
  isSuperAdminUser,
} from '../utils/userRoles';

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebar-collapsed') === 'true');
  const [width, setWidth] = useState(parseInt(localStorage.getItem('sidebar-width')) || 256);
  const [logoutApiCall] = useLogoutMutation();

  if (!userInfo) return null;

  const isSeller = isApprovedSeller(userInfo);
  const isAdmin = isPlatformAdmin(userInfo);
  const isSuperAdmin = isSuperAdminUser(userInfo);
  const isDelivery = userInfo.isDeliveryAgent;
  const isSupport = userInfo.isSupport;

  const toggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  const logoutHandler = async () => {
    const confirmLogout = window.confirm('Are you sure you want to sign out?');
    if (!confirmLogout) return;

    try {
      await logoutApiCall().unwrap();
    } catch (err) {
    } finally {
      navigate('/');
      dispatch(logout());
    }
  };

  const startResizing = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    
    const startWidth = width;
    const startX = mouseDownEvent.clientX;

    const doDrag = (mouseMoveEvent) => {
      const newWidth = startWidth + (mouseMoveEvent.clientX - startX);
      if (newWidth >= 180 && newWidth <= 450) {
        setWidth(newWidth);
        localStorage.setItem('sidebar-width', String(newWidth));
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const getStaffBasePath = (user) => {
    if (user?.isSuperAdmin) return '/superadmin';
    if (user?.isAdmin) return '/admin';
    return '';
  };

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Superadmin';
    if (isAdmin) return 'Admin';
    if (isSeller) return 'Seller';
    if (isDelivery) return 'Delivery';
    if (isSupport) return 'Support';
    return 'Customer';
  };

  // Build Links list based on role
  const menuItems = [];

  // Profile link (always present)
  menuItems.push({
    path: '/profile',
    label: 'Your Profile',
    icon: '👤',
  });

  if (isSupport) {
    menuItems.push(
      {
        path: '/support/orders',
        label: 'Help Desk Orders',
        icon: '📋',
      },
      {
        path: '/support/helpline',
        label: 'Helpline Workspace',
        icon: '📞',
      }
    );
  }

  if (isDelivery) {
    menuItems.push(
      {
        path: '/delivery/orderlist',
        label: 'Manage Orders',
        icon: '📦',
      },
      {
        path: '/delivery/paymentlist',
        label: 'Manage Payments',
        icon: '💳',
      }
    );
  }

  if (isSeller) {
    menuItems.push(
      {
        path: '/seller/productlist',
        label: 'Manage Products',
        icon: '🏷️',
      },
      {
        path: '/seller/orderlist',
        label: 'Manage Orders',
        icon: '📦',
      },
      {
        path: '/seller/paymentlist',
        label: 'Manage Payments',
        icon: '💳',
      }
    );
  }

  if (isAdmin || isSuperAdmin) {
    const basePath = getStaffBasePath(userInfo);
    menuItems.push(
      {
        path: `${basePath}/userlist`,
        label: 'Manage Users',
        icon: '👥',
      },
      {
        path: `${basePath}/verifysellers`,
        label: 'Verify Users',
        icon: '✓',
      },
      {
        path: `${basePath}/couponlist`,
        label: 'Manage Coupons',
        icon: '🎟️',
      },
      {
        path: '/seller/productlist',
        label: 'Manage Products',
        icon: '🏷️',
      },
      {
        path: '/seller/orderlist',
        label: 'Manage Orders',
        icon: '📦',
      },
      {
        path: '/seller/paymentlist',
        label: 'Manage Payments',
        icon: '💳',
      },
      {
        path: `${basePath}/call-history`,
        label: 'Call History Log',
        icon: '📞',
      }
    );
  }

  return (
    <aside
      style={{ width: isCollapsed ? '80px' : `${width}px` }}
      className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 h-[calc(100vh-90px)] sticky top-[90px] p-4 shrink-0 relative transition-[width] duration-300 z-30`}
    >
      {/* Resizing Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-brand-500/20 active:bg-brand-500/40 transition-colors z-50 select-none"
        />
      )}

      <div className={`flex items-center gap-2 mb-6 ${isCollapsed ? 'flex-col-reverse justify-center' : 'flex-row justify-between'}`}>
        {/* User Quick Info */}
        <div className={`flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 transition-all flex-1 min-w-0 ${
          isCollapsed ? 'justify-center w-full' : ''
        }`}>
          <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
            {userInfo.name.slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-sm font-bold text-slate-800 truncate">{userInfo.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{getRoleLabel()}</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 transition-colors shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 select-none overflow-y-auto pr-1 scrollbar-thin">
        {!isCollapsed && (
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-3 mb-2 animate-fade-in">
            {isSuperAdmin
              ? 'Superadmin Controls'
              : isAdmin
                ? 'Admin Controls'
                : isSeller
                  ? 'Seller Controls'
                  : isDelivery
                    ? 'Delivery Controls'
                    : isSupport
                      ? 'Support Controls'
                      : 'Navigation Controls'}
          </p>
        )}
        {menuItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center rounded-xl text-sm font-semibold transition-all ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-100/30'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <span className="text-base select-none leading-none shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="animate-fade-in truncate">{item.label}</span>}
            </Link>
          );
        })}

      </nav>

      {/* Sign Out Button (Pinned to Bottom of Page) */}
      {!isCollapsed && (
        <div className="mt-auto pt-4 border-t border-slate-100">
          <button
            onClick={logoutHandler}
            className="w-full flex items-center rounded-xl text-sm font-semibold transition-all text-red-600 hover:bg-red-50 gap-3 px-3 py-2.5"
          >
            <span className="text-base select-none leading-none shrink-0">🚪</span>
            <span className="animate-fade-in truncate">Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
