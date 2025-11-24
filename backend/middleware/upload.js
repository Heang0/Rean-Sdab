const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudStorage'); // ADD THIS IMPORT

// Memory storage - files will be stored in memory as buffers
const storage = multer.memoryStorage();

// Configure multer for multiple files
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for audio files
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      // Accept audio files
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Please upload an audio file (MP3, WAV, M4A, etc.)'), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      // Accept image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Please upload an image file (JPG, PNG, WebP, etc.)'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  }
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// ADD THESE BACK for your upload routes
const uploadAudio = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an audio file (MP3, WAV, M4A, etc.)'), false);
    }
  },
  limits: { 
    fileSize: 500 * 1024 * 1024,
    files: 1
  }
}).single('audio');

const uploadThumbnail = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image file (JPG, PNG, WebP, etc.)'), false);
    }
  },
  limits: { 
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
}).single('thumbnail');

// Middleware to handle Cloudinary upload
const handleCloudUpload = (resourceType, folder) => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        req.file.buffer, 
        folder, 
        resourceType
      );

      // Add Cloudinary result to request object
      req.cloudinaryResult = result;
      next();
    } catch (error) {
      res.status(500).json({ error: `Upload failed: ${error.message}` });
    }
  };
};

module.exports = {
  upload, // For article creation
  uploadAudio, // For upload routes
  uploadThumbnail, // For upload routes
  handleCloudUpload
};