const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const rawToken = token.replace(/^Bearer\s+/i, '').trim();
    if (!rawToken || rawToken === 'null' || rawToken === 'undefined') {
      return res.status(401).json({ error: 'Token is not valid' });
    }
    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    req.user = decoded; // Contains id
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
