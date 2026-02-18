const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant ou invalide" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    next();
  };
};
