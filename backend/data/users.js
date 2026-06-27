import bcrypt from 'bcryptjs';

// Plain-text passwords here get hashed by seeder.js before insertion
const users = [
  {
    name: 'Superadmin User',
    email: 'superadmin@buybee.com',
    password: bcrypt.hashSync('superadmin123', 10),
    isAdmin: true,
    isSuperAdmin: true,
    sellerStatus: 'NONE',
  },
  {
    name: 'Admin User',
    email: 'admin@buybee.com',
    password: bcrypt.hashSync('admin123', 10),
    isAdmin: true,
    isSuperAdmin: false,
    sellerStatus: 'NONE',
  },
  {
    name: 'Seller User',
    email: 'seller@buybee.com',
    password: bcrypt.hashSync('seller123', 10),
    isAdmin: false,
    isSuperAdmin: false,
    sellerStatus: 'APPROVED',
  },
  {
    name: 'Dipika Customer',
    email: 'buyer@buybee.com',
    password: bcrypt.hashSync('buyer123', 10),
    isAdmin: false,
    isSuperAdmin: false,
    sellerStatus: 'NONE',
  },
];

export default users;
