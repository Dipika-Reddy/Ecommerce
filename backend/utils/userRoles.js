export const isSellerUser = (user) => user?.sellerStatus === 'APPROVED';

export const isApprovedSeller = (user) =>
  isSellerUser(user) && !user?.isAdmin && !user?.isSuperAdmin;

export const isPlatformAdmin = (user) =>
  user?.isAdmin && !user?.isSuperAdmin;

export const isSuperAdminUser = (user) => !!user?.isSuperAdmin;

export const isDeliveryAgent = (user) => !!user?.isDeliveryAgent;

export const isSupportUser = (user) => !!user?.isSupport;

export const isStaff = (user) => isPlatformAdmin(user) || isSuperAdminUser(user) || isSupportUser(user);

export const canManageCatalog = (user) => isApprovedSeller(user) || isPlatformAdmin(user) || isSuperAdminUser(user);
