const Category = require('../models/Category');
const Article = require('../models/Article');

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    
    // Update article counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Article.countDocuments({ 
          category: category.name,
          published: true 
        });
        return {
          ...category.toObject(),
          articleCount: count
        };
      })
    );
    
    res.json(categoriesWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const category = new Category({
      name,
      slug,
      description
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, slug, description },
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Update category article counts
exports.updateCategoryCount = async (req, res) => {
  try {
    const categories = await Category.find();
    
    for (let category of categories) {
      const count = await Article.countDocuments({ 
        category: category.name,
        published: true 
      });
      category.articleCount = count;
      await category.save();
    }
    
    res.json({ message: 'Category counts updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};