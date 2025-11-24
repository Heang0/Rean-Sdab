const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { adminAuth } = require('../middleware/auth');

router.get('/', categoryController.getCategories);
router.post('/', adminAuth, categoryController.createCategory);
router.put('/update-counts', adminAuth, categoryController.updateCategoryCount);
router.delete('/:id', adminAuth, categoryController.deleteCategory);  // ADD THIS LINE
router.put('/:id', adminAuth, categoryController.updateCategory);

module.exports = router;