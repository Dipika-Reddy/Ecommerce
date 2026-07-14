import { logError } from '../utils/logger.js';

// Catches any request that doesn't match a defined route
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Final error handler — formats all thrown errors as consistent JSON.
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Log error with details on the server side
  logError(`Express error on ${req.method} ${req.originalUrl}`, err);

  // CastError translation
  if (err.name === 'CastError' || err.message?.includes('Cast to ObjectId')) {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Prevent leaking Database, SQL, or Prisma internals in production
  if (process.env.NODE_ENV === 'production') {
    if (err.message && (
      err.message.includes('PrismaClient') ||
      err.message.includes('database') ||
      err.message.includes('SQL') ||
      err.message.includes('select') ||
      err.message.includes('insert')
    )) {
      message = 'A database error occurred. Please contact support.';
    }
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };
