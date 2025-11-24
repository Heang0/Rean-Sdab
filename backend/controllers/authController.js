const jwt = require('jsonwebtoken');

const generateToken = (username) => {
  return jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Debug function to check credentials
const debugCredentials = (username, password) => {
  console.log('🔐 Login attempt:', { 
    username, 
    password, 
    expectedUsername: process.env.ADMIN_USERNAME,
    expectedPassword: process.env.ADMIN_PASSWORD,
    match: username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD
  });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Debug the credentials
    debugCredentials(username, password);

    // Validate against .env credentials
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      console.log('❌ Invalid credentials');
      return res.status(400).json({ error: 'Invalid admin credentials' });
    }

    // Generate token
    const token = generateToken(username);

    console.log('✅ Login successful for user:', username);
    
    res.json({
      message: 'Admin login successful',
      token,
      user: {
        username: username,
        email: process.env.ADMIN_EMAIL,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.verifyAdmin = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      valid: true,
      user: {
        username: decoded.username,
        email: process.env.ADMIN_EMAIL,
        role: 'admin'
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};