const Utilisateur = require("../models/Utilisateur");

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

// 🔹 Note : Le Super Admin est injecté directement dans la base de données
// (pas de route de création). Il se connecte via POST /api/login.

// 🔹 Création d'un Admin par le Super Admin
exports.creerAdmin = async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    // 🔹 Vérifier que le Super Admin existe et a le bon rôle
    const superAdmin = await Utilisateur.findById(req.user.id);
    if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Accès refusé. Seul le Super Admin peut créer un admin." });
    }

    // 🔹 Vérifier que le Super Admin est actif
    if (!superAdmin.isActive) {
      return res.status(403).json({ message: "Compte Super Admin désactivé" });
    }

    // 🔹 Vérifier que tous les champs obligatoires sont fournis
    if (!nom?.trim() || !emailNormalise || !motDePasse?.trim()) {
      return res.status(400).json({ 
        message: "Tous les champs sont obligatoires : nom, email et mot de passe" 
      });
    }

    // 🔹 Valider le format de l'email
    if (!validateEmail(emailNormalise)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    // 🔹 Vérifier si l'email existe déjà
    const emailExiste = await Utilisateur.findOne({ email: emailNormalise });
    if (emailExiste) {
      return res.status(400).json({ message: "Cette adresse email est déjà utilisée" });
    }

    // 🔹 Vérifier si le nom existe déjà
    const nomExiste = await Utilisateur.findOne({ nom });
    if (nomExiste) {
      return res.status(400).json({ message: "Ce nom d'utilisateur est déjà pris" });
    }

    // 🔹 Valider la complexité du mot de passe
    if (!validatePassword(motDePasse)) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)" 
      });
    }

    // 🔹 La zone d'intervention est obligatoire pour un admin
    if (!req.body.zoneIntervention) {
      return res.status(400).json({ 
        message: "La zone d'intervention est obligatoire pour un admin" 
      });
    }

    const admin = await Utilisateur.create({
      nom,
      email: emailNormalise,
      motDePasse,
      role: "ADMIN",
      creePar: superAdmin._id,
      zoneIntervention: req.body.zoneIntervention,
      emailVerifie: true // Admin créé par Super Admin → email vérifié automatiquement
    });

    const adminResponse = {
      _id: admin._id,
      nom: admin.nom,
      email: admin.email,
      role: admin.role,
      creePar: admin.creePar,
      zoneIntervention: admin.zoneIntervention,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    };

    res.status(201).json({ 
      message: "Admin créé avec succès", 
      user: adminResponse 
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 🔹 Lister tous les admins
exports.listerAdmins = async (req, res) => {
  try {
    // Vérifier que le Super Admin existe
    const superAdmin = await Utilisateur.findById(req.user.id);
    if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const admins = await Utilisateur.find({ role: "ADMIN" })
      .select("-motDePasse -codeVerification -codeVerificationExpire -codeResetVerifie")
      .sort({ createdAt: -1 });

    res.json({
      total: admins.length,
      admins
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Désactiver un admin (par Super Admin)
exports.desactiverAdmin = async (req, res) => {
  try {
    // Vérifier que le Super Admin existe
    const superAdmin = await Utilisateur.findById(req.user.id);
    if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const admin = await Utilisateur.findById(req.params.id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    if (!admin.isActive) {
      return res.status(400).json({ message: "Admin déjà désactivé" });
    }

    admin.isActive = false;
    await admin.save();

    res.json({ message: `Admin ${admin.nom} désactivé avec succès` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Réactiver un admin (par Super Admin)
exports.reactiverAdmin = async (req, res) => {
  try {
    // Vérifier que le Super Admin existe
    const superAdmin = await Utilisateur.findById(req.user.id);
    if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const admin = await Utilisateur.findById(req.params.id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    if (admin.isActive) {
      return res.status(400).json({ message: "Admin déjà actif" });
    }

    admin.isActive = true;
    await admin.save();

    res.json({ message: `Admin ${admin.nom} réactivé avec succès` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
