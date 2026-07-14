import { logSecurity } from '../utils/logger.js';

// Validate UUID formats
export const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Middleware to validate route ID parameters
export const validateIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !isValidUUID(id)) {
      logSecurity('INVALID_ID_PARAMETER', { path: req.originalUrl, param: paramName, value: id });
      res.status(400);
      throw new Error(`Invalid identifier format for parameter: ${paramName}`);
    }
    next();
  };
};

// Check for unexpected extra fields in request body
export const restrictFields = (allowedFields) => {
  return (req, res, next) => {
    const keys = Object.keys(req.body);
    const extraFields = keys.filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      logSecurity('UNEXPECTED_FIELDS_REJECTED', { extraFields, path: req.originalUrl, ip: req.ip });
      res.status(400);
      throw new Error(`Unexpected fields in request body: ${extraFields.join(', ')}`);
    }
    next();
  };
};

// Sanitize output to prevent XSS (basic HTML escape helper)
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Input validation rules helper
export const validateRegistration = (req, res, next) => {
  const { name, email, password, phoneNumber } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 50) {
    res.status(400);
    throw new Error('Name must be between 2 and 50 characters');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 100) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }
  // Strong password requirements
  if (!password || password.length < 8 || password.length > 100) {
    res.status(400);
    throw new Error('Password must be between 8 and 100 characters');
  }
  if (phoneNumber && (typeof phoneNumber !== 'string' || phoneNumber.length < 8 || phoneNumber.length > 15)) {
    res.status(400);
    throw new Error('Invalid phone number format');
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    res.status(400);
    throw new Error('Password is required');
  }
  next();
};

export const validateCoupon = (req, res, next) => {
  const { code, discountType, discountValue, minPurchase } = req.body;
  if (req.method === 'POST') {
    if (!code || typeof code !== 'string' || code.trim().length < 2 || code.length > 20) {
      res.status(400);
      throw new Error('Coupon code is required (2-20 characters)');
    }
    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      res.status(400);
      throw new Error('Discount type must be PERCENTAGE or FIXED');
    }
    if (typeof discountValue !== 'number' || discountValue <= 0) {
      res.status(400);
      throw new Error('Discount value must be a positive number');
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      res.status(400);
      throw new Error('Percentage discount cannot exceed 100%');
    }
    if (minPurchase !== undefined && (typeof minPurchase !== 'number' || minPurchase < 0)) {
      res.status(400);
      throw new Error('Minimum purchase must be a non-negative number');
    }
  }
  next();
};
