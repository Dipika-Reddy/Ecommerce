export const isSellerUser = (user) => user?.sellerStatus === 'APPROVED';

export const isApprovedSeller = (user) =>
  isSellerUser(user) && !user?.isAdmin && !user?.isSuperAdmin;

export const isPlatformAdmin = (user) =>
  user?.isAdmin && !user?.isSuperAdmin;

export const isSuperAdminUser = (user) => !!user?.isSuperAdmin;

export const isStaff = (user) => isPlatformAdmin(user) || isSuperAdminUser(user);

export const canManageCatalog = (user) => isApprovedSeller(user) || isStaff(user);
