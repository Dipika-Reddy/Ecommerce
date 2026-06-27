export const isSellerUser = (user) => user?.sellerStatus === 'APPROVED';

export const isApprovedSeller = (user) =>
  isSellerUser(user) && !user?.isAdmin && !user?.isSuperAdmin;

export const isPlatformAdmin = (user) =>
  user?.isAdmin && !user?.isSuperAdmin;

export const isSuperAdminUser = (user) => !!user?.isSuperAdmin;

export const canManageCatalog = (user) => isApprovedSeller(user);

export const getStaffBasePath = (user) =>
  isSuperAdminUser(user) ? '/superadmin' : '/admin';

export const getCatalogBasePath = () => '/seller';

export const getCatalogBaseFromPath = (pathname) => {
  if (pathname.startsWith('/superadmin')) return '/superadmin';
  if (pathname.startsWith('/admin')) return '/admin';
  return '/seller';
};
