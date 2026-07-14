import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db.js';
import { isApprovedSeller, isStaff } from '../utils/userRoles.js';
import { logSecurity } from '../utils/logger.js';

// Verifies the JWT sent in the Authorization header (Bearer token)
// and attaches the corresponding user to req.user.
const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const parts = authHeader.split(' ');
      if (parts.length !== 2) {
        logSecurity('MALFORMED_AUTHORIZATION_HEADER', { ip: req.ip, path: req.originalUrl });
        res.status(401);
        throw new Error('Not authorized, malformed token header');
      }

      token = parts[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        logSecurity('USER_NOT_FOUND_FOR_JWT', { id: decoded.id, ip: req.ip });
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // If user is locked out, block requests
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        logSecurity('AUTHENTICATED_LOCKED_OUT_USER_BLOCKED', { id: user.id, email: user.email });
        res.status(403);
        throw new Error('Your account is currently locked due to multiple failed login attempts.');
      }

      // Exclude sensitive fields from the attached req.user object
      const { password, resetOtp, resetOtpExpiry, failedLoginAttempts, lockoutUntil, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;

      next();
    } catch (error) {
      logSecurity('JWT_VERIFICATION_FAILED', { error: error.message, ip: req.ip, path: req.originalUrl });
      res.status(401);
      throw new Error('Not authorized, token failed or expired');
    }
  } else {
    logSecurity('MISSING_JWT_TOKEN', { ip: req.ip, path: req.originalUrl });
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
});

// Platform admin or superadmin. Must run AFTER `protect`.
const admin = (req, res, next) => {
  if (req.user && isStaff(req.user)) {
    next();
  } else {
    logSecurity('ADMIN_AUTHORIZATION_BYPASS_ATTEMPT', { userId: req.user?.id, role: req.user?.isAdmin, path: req.originalUrl });
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};

// Approved seller or delivery agent. Must run AFTER `protect`.
const seller = (req, res, next) => {
  if (req.user && (isApprovedSeller(req.user) || isStaff(req.user) || req.user.isDeliveryAgent)) {
    next();
  } else {
    logSecurity('SELLER_AUTHORIZATION_BYPASS_ATTEMPT', { userId: req.user?.id, path: req.originalUrl });
    res.status(403);
    throw new Error('Not authorized as a seller or delivery agent');
  }
};

// Restricts a route to superadmin users only. Must run AFTER `protect`.
const superAdmin = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    next();
  } else {
    logSecurity('SUPERADMIN_AUTHORIZATION_BYPASS_ATTEMPT', { userId: req.user?.id, path: req.originalUrl });
    res.status(403);
    throw new Error('Not authorized as a superadmin');
  }
};

const optionalProtect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const parts = authHeader.split(' ');
      if (parts.length === 2) {
        const token = parts[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.id }
        });

        if (user && (!user.lockoutUntil || user.lockoutUntil <= new Date())) {
          const { password, resetOtp, resetOtpExpiry, failedLoginAttempts, lockoutUntil, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
        }
      }
    } catch (error) {
      // Fail silently since authentication is optional for this helper
    }
  }
  next();
});

export { protect, admin, seller, superAdmin, optionalProtect };
