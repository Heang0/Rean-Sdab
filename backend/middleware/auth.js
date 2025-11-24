const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Token is not valid' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const validateAdminCredentials = (username, password) => {
  return username === process.env.ADMIN_USERNAME && 
         password === process.env.ADMIN_PASSWORD;
};

module.exports = { adminAuth, validateAdminCredentials };