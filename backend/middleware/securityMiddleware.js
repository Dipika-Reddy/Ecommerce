import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logSecurity } from '../utils/logger.js';

// Setup secure HTTP headers using Helmet
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Helper function to create rate limiters with security logging
const createLimiter = (windowMs, max, message, eventName) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      logSecurity(eventName, { ip: req.ip, url: req.originalUrl, method: req.method });
      res.status(429).json({ message });
    },
  });
};

// General rate limiter to prevent scraping & abuse
export const generalLimiter = createLimiter(
  15 * 60 * 1000, // 15 mins
  300,
  'Too many requests from this IP, please try again later.',
  'RATE_LIMIT_EXCEEDED_GENERAL'
);

// Auth rate limiter for login & signup
export const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 mins
  10, // 10 attempts
  'Too many authentication requests from this IP. Please try again after 15 minutes.',
  'RATE_LIMIT_EXCEEDED_AUTH'
);

// OTP request/verify rate limiter
export const otpLimiter = createLimiter(
  10 * 60 * 1000, // 10 mins
  5, // 5 attempts
  'Too many OTP requests from this IP. Please try again after 10 minutes.',
  'RATE_LIMIT_EXCEEDED_OTP'
);

// Upload rate limiter
export const uploadLimiter = createLimiter(
  10 * 60 * 1000, // 10 mins
  15, // 15 uploads
  'Too many file uploads from this IP. Please try again after 10 minutes.',
  'RATE_LIMIT_EXCEEDED_UPLOAD'
);

// Payment & Checkout rate limiter
export const paymentLimiter = createLimiter(
  5 * 60 * 1000, // 5 mins
  15, // 15 checkout attempts
  'Too many checkout attempts from this IP. Please try again after 5 minutes.',
  'RATE_LIMIT_EXCEEDED_PAYMENT'
);
