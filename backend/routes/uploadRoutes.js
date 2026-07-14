import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import express from 'express';
import { protect, seller } from '../middleware/authMiddleware.js';
import { uploadLimiter } from '../middleware/securityMiddleware.js';
import { logSecurity } from '../utils/logger.js';

const router = express.Router();

// Define allowed extensions and MIME types strictly
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Stores uploaded images on local disk under /uploads securely
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    // Generate a cryptographically secure random filename to prevent collision and enumeration
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uniqueToken = crypto.randomBytes(16).toString('hex');
    cb(null, `img-${uniqueToken}-${Date.now()}${fileExtension}`);
  },
});

function checkFileType(file, cb) {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(fileExtension);
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mimeType);

  if (isExtensionAllowed && isMimeAllowed) {
    return cb(null, true);
  }
  
  logSecurity('FILE_UPLOAD_BLOCKED_UNSUPPORTED_TYPE', { mimeType, originalname: file.originalname });
  cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'));
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // restrict to 5MB max
    files: 1, // upload 1 file at a time
  },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// @desc   Upload a single product image
// @route  POST /api/upload
// @access Private/Seller (Sellers can create products, admins/superadmins can too)
router.post('/', protect, seller, uploadLimiter, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      logSecurity('FILE_UPLOAD_MULTER_ERROR', { error: err.message, userId: req.user.id });
      res.status(400);
      return next(new Error(`Upload error: ${err.message}`));
    } else if (err) {
      logSecurity('FILE_UPLOAD_ERROR', { error: err.message, userId: req.user.id });
      res.status(400);
      return next(err);
    }

    if (!req.file) {
      res.status(400);
      return next(new Error('No image file uploaded'));
    }

    logSecurity('FILE_UPLOAD_SUCCESS', { filename: req.file.filename, userId: req.user.id });
    
    // Normalize response path structure
    res.status(201).json({
      message: 'Image uploaded successfully',
      image: `/uploads/${req.file.filename}`,
    });
  });
});

export default router;
