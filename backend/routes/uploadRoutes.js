import path from 'path';
import multer from 'multer';
import express from 'express';

const router = express.Router();

// Stores uploaded images on local disk under /uploads.
// In a real production deployment swap this for S3/Cloudinary storage,
// but the controller/route contract below stays identical.
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function checkFileType(file, cb) {
  const allowedTypes = /jpe?g|png|webp/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }
  cb(new Error('Images only (jpg, jpeg, png, webp)'));
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// @desc   Upload a single product image
// @route  POST /api/upload
// @access Private/Admin
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file uploaded');
  }
  res.status(201).json({
    message: 'Image uploaded successfully',
    image: `/${req.file.path.replace(/\\/g, '/')}`,
  });
});

export default router;
