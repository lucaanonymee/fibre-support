const Utilisateur = require("../models/Utilisateur");
const bcrypt = require("bcryptjs");

// 🔹 Fonction de validation mot de passe
const validatePassword = (motDePasse) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(motDePasse);
};

// 🔹 Fonction de validation format email
const validateEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

// 🔹 Fonction de validation et normalisation numéro téléphone tunisien
const normaliserTelephone = (numero) => {
  // Enlever tous les espaces, tirets, parenthèses
  let clean = numero.replace(/[\s\-\(\)]/g, "");
  
  // Format: +216XXXXXXXX (déjà international)
  if (clean.match(/^\+216\d{8}$/)) {
    return clean;
  }
  
  // Format: 216XXXXXXXX (sans +)
  if (clean.match(/^216\d{8}$/)) {
    return "+" + clean;
  }
  
  // Format: 8 chiffres uniquement
  if (clean.match(/^\d{8}$/)) {
    return "+216" + clean;
  }
  
  // Format invalide
  return null;
};

// 🔹 Mise à jour du profil utilisateur
exports.updateProfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Utilisateur.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 🔹 Le Super Admin ne peut pas modifier son profil
    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé" });
    }

    // 🔹 Champs modifiables par l'utilisateur
    if (req.body.nom?.trim()) {
      // Vérifier si le nouveau nom n'existe pas déjà
      if (req.body.nom.trim() !== user.nom) {
        const nomExiste = await Utilisateur.findOne({ nom: req.body.nom });
        if (nomExiste) {
          return res.status(400).json({ message: "Ce nom d'utilisateur est déjà pris" });
        }
      }
      user.nom = req.body.nom.trim();
    }
    
    if (req.body.email?.trim()) {
      const emailNormalise = req.body.email.trim().toLowerCase();
      // Valider le format de l'email
      if (!validateEmail(emailNormalise)) {
        return res.status(400).json({ message: "Format d'email invalide" });
      }
      // Vérifier si le nouvel email n'existe pas déjà
      if (emailNormalise !== user.email) {
        const emailExiste = await Utilisateur.findOne({ email: emailNormalise });
        if (emailExiste) {
          return res.status(400).json({ message: "Cette adresse email est déjà utilisée" });
        }
      }
      user.email = emailNormalise;
    }
    
    if (req.body.motDePasse?.trim()) {
      // Valider la complexité du nouveau mot de passe
      if (!validatePassword(req.body.motDePasse)) {
        return res.status(400).json({ 
          message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)" 
        });
      }

      const memeMotDePasse = await bcrypt.compare(req.body.motDePasse, user.motDePasse);
      if (memeMotDePasse) {
        return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien" });
      }

      user.motDePasse = req.body.motDePasse;
    } 

    // 🔹 Modification du numéro de téléphone (CLIENT uniquement)
    if (req.body.numTelephone?.trim()) {
      if (user.role === "CLIENT") {
        const telNormalise = normaliserTelephone(req.body.numTelephone.trim());
        if (!telNormalise) {
          return res.status(400).json({ 
            message: "Numéro de téléphone invalide. Format attendu: 8 chiffres (ex: 12345678) ou +216 12345678" 
          });
        }
        user.numTelephone = telNormalise;
      }
    }

    await user.save();

    // ✅ Ne jamais retourner le mot de passe
    const userResponse = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Ajouter numTelephone pour CLIENT
    if (user.role === "CLIENT") {
      userResponse.numTelephone = user.numTelephone;
    }

    if (user.role === "ADMIN" || user.role === "TECHNICIEN") {
      userResponse.zoneIntervention = user.zoneIntervention;
    }
    if (user.role === "TECHNICIEN" && user.categorie) {
      userResponse.categorie = user.categorie;
    }

    res.json({ message: "Profil mis à jour avec succès", user: userResponse });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 🔹 Consulter le profil d'un utilisateur
exports.getProfil = async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 🔹 Le Super Admin n'a pas de page profil
    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé" });
    }

    // ✅ Ne jamais retourner le mot de passe
    const userResponse = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Ajouter numTelephone pour CLIENT
    if (user.role === "CLIENT") {
      userResponse.numTelephone = user.numTelephone;
    }

    if (user.role === "ADMIN" || user.role === "TECHNICIEN") {
      userResponse.zoneIntervention = user.zoneIntervention;
    }
    if (user.role === "TECHNICIEN" && user.categorie) {
      userResponse.categorie = user.categorie;
    }

    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};