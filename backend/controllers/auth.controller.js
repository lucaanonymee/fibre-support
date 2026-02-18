const Utilisateur = require("../models/Utilisateur");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { genererCodeVerification, envoyerCodeVerification, envoyerCodeResetPassword } = require("../config/email");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

// 🔹 Fonction de validation mot de passe
const validatePassword = (motDePasse) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
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

// 🔹 Login client/admin/technicien
exports.login = async (req, res) => {
  try {
    const email = req.body.email?.trim()?.toLowerCase();
    const motDePasse = req.body.motDePasse;

    if (!email || !motDePasse) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const user = await Utilisateur.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Login incorrect" });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: "Login incorrect" });
    }

    // 🔹 Vérifier si le compte est actif (soft delete)
    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé. Contactez l'administrateur." });
    }

    // 🔹 Vérifier si l'email est vérifié (uniquement pour les clients)
    if (user.role === "CLIENT" && !user.emailVerifie) {
      return res.status(403).json({ message: "Email non vérifié. Vérifiez votre boite mail." });
    }

    // ✅ Ne jamais retourner le mot de passe
    const userResponse = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      creePar: user.creePar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Ajouter zoneIntervention pour ADMIN et TECHNICIEN
    if (user.role === "ADMIN" || user.role === "TECHNICIEN") {
      userResponse.zoneIntervention = user.zoneIntervention;
    }

    // Ajouter categorie pour TECHNICIEN
    if (user.role === "TECHNICIEN" && user.categorie) {
      userResponse.categorie = user.categorie;
    }

    // Ajouter info SUPER_ADMIN
    if (user.role === "SUPER_ADMIN") {
      userResponse.role = "SUPER_ADMIN";
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    userResponse.token = token;

    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Register client
exports.registerClient = async (req, res) => {
  try {
    const { nom, email, motDePasse, numTelephone } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    // 🔹 Vérifier que tous les champs obligatoires sont fournis et non vides
    if (!nom?.trim() || !emailNormalise || !motDePasse?.trim() || !numTelephone?.trim()) {
      return res.status(400).json({ 
        message: "Tous les champs sont obligatoires : nom, email, mot de passe et numéro de téléphone" 
      });
    }

    // 🔹 Valider le format de l'email
    if (!validateEmail(emailNormalise)) {
      return res.status(400).json({ 
        message: "Format d'email invalide" 
      });
    }

    // 🔹 Valider et normaliser le numéro de téléphone
    const telNormalise = normaliserTelephone(numTelephone);
    if (!telNormalise) {
      return res.status(400).json({ 
        message: "Numéro de téléphone invalide. Format attendu: 8 chiffres (ex: 12345678) ou +216 12345678" 
      });
    }

    // 🔹 Vérifier si l'email existe déjà
    const emailExiste = await Utilisateur.findOne({ email: emailNormalise });
    if (emailExiste) {
      return res.status(400).json({ 
        message: "Cette adresse email est déjà utilisée" 
      });
    }

    // 🔹 Vérifier si le nom existe déjà
    const nomExiste = await Utilisateur.findOne({ nom });
    if (nomExiste) {
      return res.status(400).json({ 
        message: "Ce nom d'utilisateur est déjà pris" 
      });
    }

    // 🔹 Valider la complexité du mot de passe
    if (!validatePassword(motDePasse)) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial" 
      });
    }

    const user = await Utilisateur.create({
      nom,
      email: emailNormalise,
      motDePasse,
      numTelephone: telNormalise,  // 🔹 Numéro normalisé (+216XXXXXXXX)
      role: "CLIENT"
    });

    // 🔹 Générer et envoyer le code de vérification
    const code = genererCodeVerification();
    user.codeVerification = code;
    user.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await envoyerCodeVerification(emailNormalise, code);
    
    // ✅ Ne jamais retourner le mot de passe
    const userResponse = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      numTelephone: user.numTelephone,
      role: user.role,
      emailVerifie: user.emailVerifie,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.status(201).json({ 
      message: "Compte créé. Un code de vérification a été envoyé à votre email.", 
      user: userResponse 
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 🔹 Vérifier le code email
exports.verifierEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    if (!emailNormalise || !code?.trim()) {
      return res.status(400).json({ message: "Email et code sont requis" });
    }

    const user = await Utilisateur.findOne({ email: emailNormalise });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.emailVerifie) {
      return res.status(400).json({ message: "Email déjà vérifié" });
    }

    if (user.codeVerification !== code) {
      return res.status(400).json({ message: "Code de vérification incorrect" });
    }

    if (user.codeVerificationExpire < new Date()) {
      return res.status(400).json({ message: "Code de vérification expiré. Demandez un nouveau code." });
    }

    user.emailVerifie = true;
    user.codeVerification = null;
    user.codeVerificationExpire = null;
    await user.save();

    res.json({ message: "✅ Email vérifié avec succès. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Renvoyer le code de vérification
exports.renvoyerCode = async (req, res) => {
  try {
    const { email } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    if (!emailNormalise) {
      return res.status(400).json({ message: "Email requis" });
    }

    const user = await Utilisateur.findOne({ email: emailNormalise });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.emailVerifie) {
      return res.status(400).json({ message: "Email déjà vérifié" });
    }

    const code = genererCodeVerification();
    user.codeVerification = code;
    user.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await envoyerCodeVerification(emailNormalise, code);

    res.json({ message: "Nouveau code de vérification envoyé à votre email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Étape 1 : Mot de passe oublié - Envoyer un code de réinitialisation
// Body: { email }
exports.motDePasseOublie = async (req, res) => {
  try {
    const { email } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    if (!emailNormalise) {
      return res.status(400).json({ message: "Email requis" });
    }

    if (!validateEmail(emailNormalise)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    const user = await Utilisateur.findOne({ email: emailNormalise });

    if (!user) {
      return res.status(404).json({ message: "Aucun compte associé à cet email" });
    }

    // 🔹 Le Super Admin ne peut pas utiliser "mot de passe oublié"
    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé. Contactez l'administrateur." });
    }

    // 🔹 Générer le code et l'enregistrer
    const code = genererCodeVerification();
    user.codeVerification = code;
    user.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    user.codeResetVerifie = false;
    await user.save();

    // 🔹 Envoyer l'email
    await envoyerCodeResetPassword(emailNormalise, code);

    res.json({ message: "Un code de réinitialisation a été envoyé à votre email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Étape 2 : Vérifier le code de réinitialisation
// Body: { email, code }
exports.verifierCodeReset = async (req, res) => {
  try {
    const { email, code } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    if (!emailNormalise || !code?.trim()) {
      return res.status(400).json({ message: "Email et code requis" });
    }

    // 🔹 Chercher l'utilisateur par son code de réinitialisation
    const user = await Utilisateur.findOne({ 
      email: emailNormalise,
      codeVerification: code,
      codeVerificationExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Code incorrect ou expiré" });
    }

    // 🔹 Marquer le code comme vérifié et nettoyer
    user.codeResetVerifie = true;
    user.codeVerification = null;
    user.codeVerificationExpire = null;
    await user.save();

    res.json({ message: "✅ Code vérifié avec succès. Vous pouvez maintenant réinitialiser votre mot de passe." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Étape 3 : Réinitialiser le mot de passe
// Body: { email, nouveauMotDePasse, confirmationMotDePasse }
exports.resetMotDePasse = async (req, res) => {
  try {
    const { email, nouveauMotDePasse, confirmationMotDePasse } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    // 🔹 Vérifier champs requis
    if (!emailNormalise || !nouveauMotDePasse?.trim() || !confirmationMotDePasse?.trim()) {
      return res.status(400).json({ message: "Email, nouveau mot de passe et confirmation sont requis" });
    }

    // 🔹 Vérifier que les 2 mots de passe correspondent
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
    }

    // 🔹 Valider la complexité du nouveau mot de passe
    if (!validatePassword(nouveauMotDePasse)) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial" 
      });
    }

    // 🔹 Trouver l'utilisateur dont le code a été vérifié
    const user = await Utilisateur.findOne({ email: emailNormalise, codeResetVerifie: true });

    if (!user) {
      return res.status(400).json({ message: "Aucune demande de réinitialisation en cours. Recommencez le processus." });
    }

    // 🔹 Vérifier que le nouveau mdp n'est pas l'ancien
    const memeMotDePasse = await bcrypt.compare(nouveauMotDePasse, user.motDePasse);
    if (memeMotDePasse) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien" });
    }

    // 🔹 Mettre à jour le mot de passe et nettoyer
    user.motDePasse = nouveauMotDePasse;
    user.codeResetVerifie = false;
    await user.save();

    res.json({ message: "✅ Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};