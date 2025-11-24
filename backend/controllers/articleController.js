const Article = require('../models/Article');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudStorage');
const getAudioDuration = require('get-audio-duration');
const fs = require('fs');
const path = require('path');

// Get all published articles
exports.getArticles = async (req, res) => {
  try {
    const { category, featured, limit = 10, page = 1 } = req.query;
    let query = { published: true };
    
    if (category) query.category = category;
    if (featured) query.featured = featured === 'true';
    
    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Article.countDocuments(query);
    
    res.json({
      articles,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single article
exports.getArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Increment play count
    article.plays += 1;
    await article.save();
    
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create article with Cloudinary uploads and dynamic duration
exports.createArticle = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    if (!req.files || !req.files.audio || !req.files.thumbnail) {
      return res.status(400).json({ 
        error: 'Audio file and thumbnail image are required' 
      });
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save audio file temporarily to calculate duration
    const tempAudioPath = path.join(tempDir, `temp-audio-${Date.now()}.mp3`);
    
    let audioDuration = 0;
// In articleController.js - createArticle method
// Make sure this part is working:
try {
  // Write audio buffer to temporary file
  fs.writeFileSync(tempAudioPath, req.files.audio[0].buffer);
  
  // Calculate actual audio duration from the file
  audioDuration = await getAudioDuration(tempAudioPath);
  console.log('🎵 Calculated audio duration:', audioDuration, 'seconds');
  
  // Delete temporary file
  fs.unlinkSync(tempAudioPath);
} catch (durationError) {
  console.error('❌ Error calculating audio duration:', durationError);
  // If calculation fails, use provided duration or default to 0
  audioDuration = parseInt(req.body.duration) || 0;
}

    // Upload audio to Cloudinary
    const audioUpload = await uploadToCloudinary(
      req.files.audio[0].buffer,
      'audio',
      'video'
    );

    // Upload thumbnail to Cloudinary
    const thumbnailUpload = await uploadToCloudinary(
      req.files.thumbnail[0].buffer,
      'thumbnails',
      'image'
    );

    // Create article with ACTUAL calculated duration
    const articleData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      content: req.body.content || 'Audio content',
      duration: Math.round(audioDuration),
      audioUrl: audioUpload.secure_url,
      thumbnailUrl: thumbnailUpload.secure_url,
      audioPublicId: audioUpload.public_id,
      thumbnailPublicId: thumbnailUpload.public_id,
      published: req.body.published === 'true',
      featured: req.body.featured === 'true'
    };

    const article = new Article(articleData);
    await article.save();
    
    console.log('✅ Article created with dynamic duration:', audioDuration, 'seconds');
    res.status(201).json(article);
  } catch (error) {
    console.error('❌ Error creating article:', error);
    res.status(400).json({ error: error.message });
  }
};

// Update article with optional file uploads
exports.updateArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const updateData = { ...req.body };

    // Handle thumbnail upload if provided
    if (req.files && req.files.thumbnail) {
      const thumbnailUpload = await uploadToCloudinary(
        req.files.thumbnail[0].buffer,
        'thumbnails',
        'image'
      );
      updateData.thumbnailUrl = thumbnailUpload.secure_url;
      updateData.thumbnailPublicId = thumbnailUpload.public_id;
      
      // Delete old thumbnail from Cloudinary
      if (article.thumbnailPublicId) {
        await deleteFromCloudinary(article.thumbnailPublicId, 'image');
      }
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedArticle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete article and remove files from Cloudinary
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Delete audio from Cloudinary
    if (article.audioPublicId) {
      await deleteFromCloudinary(article.audioPublicId, 'video');
    }

    // Delete thumbnail from Cloudinary
    if (article.thumbnailPublicId) {
      await deleteFromCloudinary(article.thumbnailPublicId, 'image');
    }

    // Delete from database
    await Article.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Article and associated files deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: error.message });
  }
};