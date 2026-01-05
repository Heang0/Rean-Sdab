const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudStorage');
const audioCompressor = require('./audioCompressor'); // ADD THIS

// Memory storage
const storage = multer.memoryStorage();

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Reduced to 50MB for faster uploads
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      // Accept audio files
      const audioTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg',
        'audio/webm'
      ];
      
      if (audioTypes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error('Please upload MP3, WAV, M4A, OGG, or WEBM files'), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Please upload an image file'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  }
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Simple compression middleware
const compressAudio = async (req, res, next) => {
  if (req.file && req.file.mimetype.startsWith('audio/')) {
    try {
      console.log('🔧 Processing audio file:', req.file.originalname);
      console.log('📊 Original size:', (req.file.size / (1024 * 1024)).toFixed(2), 'MB');
      
      // Get accurate duration
      const duration = await audioCompressor.getAudioDuration(req.file.buffer);
      req.audioDuration = duration;
      
      console.log('✅ Duration detected:', duration, 'seconds');
      
    } catch (error) {
      console.error('❌ Audio processing error:', error.message);
      req.audioDuration = 0;
    }
  }
  next();
};

// Upload handlers
const uploadAudio = (req, res, next) => {
  const uploader = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const audioTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg',
        'audio/webm'
      ];
      
      if (audioTypes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported audio format'), false);
      }
    },
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 1
    }
  }).single('audio');
  
  uploader(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

const uploadThumbnail = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image file'), false);
    }
  },
  limits: { 
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
}).single('thumbnail');

// Cloudinary upload middleware
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

      req.cloudinaryResult = result;
      
      // Add duration if it's audio
      if (req.audioDuration) {
        req.cloudinaryResult.duration = req.audioDuration;
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: `Upload failed: ${error.message}` });
    }
  };
};

module.exports = {
  upload,
  uploadAudio,
  uploadThumbnail,
  handleCloudUpload,
  compressAudio,
  audioCompressor // Export for use elsewhere
};