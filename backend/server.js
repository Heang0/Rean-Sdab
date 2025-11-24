const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upload', require('./routes/upload'));

// API test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// ========== FIXED CLEAN URL ROUTES ==========
// Clean URL routes - serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// FIX THIS ROUTE - was serving index.html instead of article.html
app.get('/article', (req, res) => {
  console.log('📄 Serving article.html for URL:', req.url);
  res.sendFile(path.join(__dirname, '../frontend/article.html')); // CHANGED THIS LINE
});

// Admin pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/upload.html'));
});

app.get('/manage-categories', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/manage-categories.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Handle all other routes - serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Server started successfully!');
  console.log(`📍 Backend API: http://localhost:${PORT}/api`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`🔐 Admin Login: http://localhost:${PORT}/login`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`📄 Article Pages: http://localhost:${PORT}/article?id=ARTICLE_ID`);
});