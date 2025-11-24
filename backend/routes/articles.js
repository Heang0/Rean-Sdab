const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { upload } = require('../middleware/upload'); // ← ADD DESTRUCTURING

// GET /api/articles - Get all articles
router.get('/', articleController.getArticles);

// GET /api/articles/:id - Get single article
router.get('/:id', articleController.getArticle);

// POST /api/articles - Create new article
router.post('/', upload, articleController.createArticle);

// PUT /api/articles/:id - Update article
router.put('/:id', upload, articleController.updateArticle);

// DELETE /api/articles/:id - Delete article
router.delete('/:id', articleController.deleteArticle);

module.exports = router;