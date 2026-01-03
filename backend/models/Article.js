const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  audioUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  audioPublicId: {
    type: String,
    required: true
  },
  thumbnailPublicId: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  durationCalculationMethod: {
    type: String,
    default: 'unknown'
  },
  category: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  published: {
    type: Boolean,
    default: true
  },
  plays: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
  // REMOVED: shortId field
});

module.exports = mongoose.model('Article', articleSchema);