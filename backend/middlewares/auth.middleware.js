const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");

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
exports.authenticateToken = async (req, res, next) => {
  try {
    // 🔒 Lire le token depuis le cookie httpOnly
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Token manquant — veuillez vous connecter" });
    }

    // 🔒 Vérifier et décoder le JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔒 Charger l'utilisateur depuis la base pour vérifier son statut réel
    const user = await Utilisateur.findById(decoded.id).select("_id role email isActive");

    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Compte désactivé ou introuvable. Accès refusé." });
    }

    // 🔹 Attacher les infos utilisateur à la requête
    req.user = {
      id: user._id,
      role: user.role,
      email: user.email
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }

    return res.status(500).json({ message: "Erreur interne lors de l'authentification" });
  }
};
