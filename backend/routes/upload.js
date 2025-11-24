const express = require('express');
const router = express.Router();
const { uploadAudio, uploadThumbnail, handleCloudUpload } = require('../middleware/upload');
const { adminAuth } = require('../middleware/auth');

// Upload audio file to Cloudinary
router.post('/audio', 
  adminAuth,
  uploadAudio, // REMOVE .single('audio') - it's already configured
  handleCloudUpload('video', 'audio'),
  (req, res) => {
    try {
      res.json({
        message: 'Audio uploaded successfully to cloud',
        fileUrl: req.cloudinaryResult.secure_url,
        publicId: req.cloudinaryResult.public_id,
        duration: req.cloudinaryResult.duration,
        format: req.cloudinaryResult.format,
        size: req.cloudinaryResult.bytes,
        originalName: req.file.originalname
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Upload thumbnail to Cloudinary
router.post('/thumbnail', 
  adminAuth,
  uploadThumbnail, // REMOVE .single('thumbnail') - it's already configured
  handleCloudUpload('image', 'thumbnails'),
  (req, res) => {
    try {
      res.json({
        message: 'Thumbnail uploaded successfully to cloud',
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