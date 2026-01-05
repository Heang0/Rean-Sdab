const express = require('express');
const router = express.Router();
const { uploadAudio, uploadThumbnail, handleCloudUpload, compressAudio } = require('../middleware/upload'); // ADD compressAudio
const { adminAuth } = require('../middleware/auth');

// Upload audio file to Cloudinary WITH COMPRESSION
router.post('/audio', 
  adminAuth,
  uploadAudio,
  compressAudio,  // ADD THIS MIDDLEWARE
  handleCloudUpload('video', 'audio'),
  (req, res) => {
    try {
      const result = {
        message: 'Audio uploaded and compressed successfully',
        fileUrl: req.cloudinaryResult.secure_url,
        publicId: req.cloudinaryResult.public_id,
        duration: req.cloudinaryResult.duration || 0,
        format: 'mp3', // Always MP3 after compression
        size: req.cloudinaryResult.bytes,
        originalName: req.file.originalname
      };
      
      console.log('✅ Upload complete:', result);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Upload thumbnail (no changes needed)
router.post('/thumbnail', 
  adminAuth,
  uploadThumbnail,
  handleCloudUpload('image', 'thumbnails'),
  (req, res) => {
    try {
      res.json({
        message: 'Thumbnail uploaded successfully',
        fileUrl: req.cloudinaryResult.secure_url,
        publicId: req.cloudinaryResult.public_id,
        format: req.cloudinaryResult.format,
        size: req.cloudinaryResult.bytes,
        width: req.cloudinaryResult.width,
        height: req.cloudinaryResult.height,
        originalName: req.file.originalname
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;