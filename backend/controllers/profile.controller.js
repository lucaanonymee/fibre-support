const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcryptjs");
const Utilisateur = require("../models/Utilisateur");

const PROFILE_URL_PREFIX = "/uploads/profiles/";
const PROFILE_UPLOAD_DIR = path.resolve(path.join(__dirname, "..", "uploads", "profiles"));

const serializeUser = (user) => ({
  id: user._id,
  name: user.nom,
  email: user.email,
  role: user.role,
  photoUrl: user.photoUrl || null,
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null,
});

const validatePassword = (motDePasse) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(motDePasse);
};

const validateEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

const normaliserTelephone = (numero) => {
  const clean = numero.replace(/[\s\-\(\)]/g, "");

  if (clean.match(/^\+216\d{8}$/)) {
    return clean;
  }

  if (clean.match(/^216\d{8}$/)) {
    return `+${clean}`;
  }

  if (clean.match(/^\d{8}$/)) {
    return `+216${clean}`;
  }

  return null;
};

const buildUserProfileResponse = (user) => {
  const userResponse = {
    _id: user._id,
    nom: user.nom,
    email: user.email,
    role: user.role,
    photoUrl: user.photoUrl || null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (user.role === "CLIENT") {
    userResponse.numTelephone = user.numTelephone;
  }

  if (user.role === "ADMIN" || user.role === "TECHNICIEN") {
    userResponse.zoneIntervention = user.zoneIntervention;
  }

  if (user.role === "TECHNICIEN" && user.categorie) {
    userResponse.categorie = user.categorie;
  }

  return userResponse;
};

const removeProfilePhotoFromDisk = async (photoUrl) => {
  if (typeof photoUrl !== "string" || !photoUrl.startsWith(PROFILE_URL_PREFIX)) {
    return;
  }

  const relativePath = photoUrl.replace(/^\/+/, "");
  const filePath = path.resolve(path.join(__dirname, "..", relativePath));

  if (!filePath.startsWith(PROFILE_UPLOAD_DIR)) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.error("Erreur suppression ancienne photo profil:", err.message);
    }
  }
};

const getActiveUser = async (userId) => {
  const user = await Utilisateur.findById(userId);

  if (!user) {
    return {
      error: {
        status: 404,
        message: "Utilisateur introuvable",
      },
    };
  }

  if (!user.isActive) {
    return {
      error: {
        status: 403,
        message: "Compte desactive",
      },
    };
  }

  return { user };
};

exports.getProfile = async (req, res) => {
  try {
    const { user, error } = await getActiveUser(req.user.id);

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.json({
      success: true,
      user: serializeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo requise (champ "photo").' });
    }

    const { user, error } = await getActiveUser(req.user.id);

    if (error) {
      await removeProfilePhotoFromDisk(`/uploads/profiles/${req.file.filename}`);
      return res.status(error.status).json({ message: error.message });
    }

    const previousPhotoUrl = user.photoUrl;
    const nextPhotoUrl = `${PROFILE_URL_PREFIX}${req.file.filename}`;

    user.photoUrl = nextPhotoUrl;

    try {
      await user.save();
    } catch (saveError) {
      await removeProfilePhotoFromDisk(nextPhotoUrl);
      throw saveError;
    }

    if (previousPhotoUrl && previousPhotoUrl !== nextPhotoUrl) {
      await removeProfilePhotoFromDisk(previousPhotoUrl);
    }

    return res.json({
      success: true,
      user: serializeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getProfil = async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé" });
    }

    const userResponse = buildUserProfileResponse(user);
    return res.json(userResponse);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateProfil = async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé" });
    }

    if (req.body.nom?.trim()) {
      const nomNormalise = req.body.nom.trim();
      if (nomNormalise !== user.nom) {
        const nomExiste = await Utilisateur.findOne({ nom: nomNormalise });
        if (nomExiste) {
          return res.status(400).json({ message: "Ce nom d'utilisateur est déjà pris" });
        }
      }
      user.nom = nomNormalise;
    }

    if (req.body.email?.trim()) {
      const emailNormalise = req.body.email.trim().toLowerCase();
      if (!validateEmail(emailNormalise)) {
        return res.status(400).json({ message: "Format d'email invalide" });
      }

      if (emailNormalise !== user.email) {
        const emailExiste = await Utilisateur.findOne({ email: emailNormalise });
        if (emailExiste) {
          return res.status(400).json({ message: "Cette adresse email est déjà utilisée" });
        }
      }

      user.email = emailNormalise;
    }

    const hasCurrentPassword = typeof req.body.motDePasseActuel === "string" && req.body.motDePasseActuel.trim().length > 0;
    const hasNewPassword = typeof req.body.motDePasse === "string" && req.body.motDePasse.trim().length > 0;
    const hasPasswordConfirmation = typeof req.body.confirmationMotDePasse === "string" && req.body.confirmationMotDePasse.trim().length > 0;

    if (hasCurrentPassword && !hasNewPassword) {
      return res.status(400).json({ message: "Nouveau mot de passe requis" });
    }

    if (!hasCurrentPassword && hasNewPassword) {
      return res.status(400).json({ message: "Mot de passe actuel requis pour le changement" });
    }

    if (hasNewPassword) {
      const motDePasseActuel = req.body.motDePasseActuel.trim();
      const motDePasseNouveau = req.body.motDePasse.trim();

      if (hasPasswordConfirmation && motDePasseNouveau !== req.body.confirmationMotDePasse.trim()) {
        return res.status(400).json({ message: "La confirmation du nouveau mot de passe est incorrecte" });
      }

      const motDePasseActuelValide = await bcrypt.compare(motDePasseActuel, user.motDePasse);
      if (!motDePasseActuelValide) {
        return res.status(400).json({ message: "Mot de passe actuel incorrect" });
      }

      if (!validatePassword(motDePasseNouveau)) {
        return res.status(400).json({
          message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)"
        });
      }

      const memeMotDePasse = await bcrypt.compare(motDePasseNouveau, user.motDePasse);
      if (memeMotDePasse) {
        return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien" });
      }

      user.motDePasse = motDePasseNouveau;
    }

    if (req.body.numTelephone?.trim() && user.role === "CLIENT") {
      const telNormalise = normaliserTelephone(req.body.numTelephone.trim());
      if (!telNormalise) {
        return res.status(400).json({
          message: "Numéro de téléphone invalide. Format attendu: 8 chiffres (ex: 12345678) ou +216 12345678"
        });
      }
      user.numTelephone = telNormalise;
    }

    await user.save();

    const userResponse = buildUserProfileResponse(user);
    return res.json({ message: "Profil mis à jour avec succès", user: userResponse });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
