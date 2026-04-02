const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// ═══════════════════════════════════════════════════════════════════
// 🔒 authMiddleware — Vérifie le token JWT depuis le cookie httpOnly
// ═══════════════════════════════════════════════════════════════════
// Avant : le token était lu depuis le header "Authorization: Bearer <token>"
//         → Le frontend devait stocker le token en localStorage (vulnérable XSS)
// Après : le token est lu depuis le cookie httpOnly "accessToken"
//         → Le navigateur l'envoie automatiquement, JavaScript ne peut pas y accéder
//         → Protection complète contre le vol de token par XSS
// ═══════════════════════════════════════════════════════════════════
exports.authenticateToken = (req, res, next) => {
  try {
    // 🔒 Lire le token depuis le cookie httpOnly
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Token manquant — veuillez vous connecter" });
    }

    // 🔒 Vérifier et décoder le JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔹 Attacher les infos utilisateur à la requête
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
