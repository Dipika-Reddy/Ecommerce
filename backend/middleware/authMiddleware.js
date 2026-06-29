import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';
import { isApprovedSeller, isStaff } from '../utils/userRoles.js';

// Verifies the JWT sent in the Authorization header (Bearer token)
// and attaches the corresponding user to req.user.
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Exclude password from the attached req.user object
      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;

      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed or expired');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
});

// Platform admin or superadmin. Must run AFTER `protect`.
const admin = (req, res, next) => {
  if (req.user && isStaff(req.user)) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};

// Approved seller or delivery agent. Must run AFTER `protect`.
const seller = (req, res, next) => {
  if (req.user && (isApprovedSeller(req.user) || isStaff(req.user) || req.user.isDeliveryAgent)) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a seller or delivery agent');
  }
};

// Restricts a route to superadmin users only. Must run AFTER `protect`.
const superAdmin = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a superadmin');
  }
};

const optionalProtect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (user) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      }
    } catch (error) {
      // Fail silently since authentication is optional for this helper
    }
  }
  next();
});

export { protect, admin, seller, superAdmin, optionalProtect };
