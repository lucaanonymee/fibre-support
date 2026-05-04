const Utilisateur = require("../models/Utilisateur");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { genererCodeVerification, envoyerCodeVerification, envoyerCodeResetPassword } = require("../config/email");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + "_refresh";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const MAX_CODE_FAILURES = Number.isFinite(Number(process.env.MAX_CODE_FAILURES)) && Number(process.env.MAX_CODE_FAILURES) > 0
  ? Math.floor(Number(process.env.MAX_CODE_FAILURES))
  : 5;
const CODE_BLOCK_MINUTES = Number.isFinite(Number(process.env.CODE_BLOCK_MINUTES)) && Number(process.env.CODE_BLOCK_MINUTES) > 0
  ? Number(process.env.CODE_BLOCK_MINUTES)
  : 15;

// ═══════════════════════════════════════════════════════════════════
// 🔒 Configuration des cookies httpOnly
// ═══════════════════════════════════════════════════════════════════
// httpOnly: true  → JavaScript ne peut PAS lire le cookie (protection XSS)
// secure: true    → Cookie envoyé uniquement via HTTPS (production)
// sameSite: strict → Cookie jamais envoyé cross-site (protection CSRF)
// ═══════════════════════════════════════════════════════════════════
const cookieOptions = {
  httpOnly: true,                                    // 🔒 Inaccessible au JavaScript
  secure: process.env.NODE_ENV === "production",     // 🔒 HTTPS uniquement en production
  sameSite: "strict",                                // 🔒 Bloque les requêtes cross-site
  path: "/"                                          // Disponible sur toutes les routes
};

// 🔹 Options pour le cookie Access Token (courte durée)
const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 24 * 60 * 60 * 1000   // 1 jour (en millisecondes)
};

// 🔹 Options pour le cookie Refresh Token (longue durée)
const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 jours
  path: "/api/refresh-token"          // 🔒 Cookie envoyé UNIQUEMENT pour cette route
};

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

const getBlockedMinutes = (blockedUntil) => {
  if (!(blockedUntil instanceof Date)) {
    return 0;
  }

  const remainingMs = blockedUntil.getTime() - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(remainingMs / 60000));
};

const isCodeTemporarilyBlocked = (user) => {
  if (!user?.blocageCodeJusqua) {
    return false;
  }

  const blockedUntil = new Date(user.blocageCodeJusqua);
  return blockedUntil > new Date();
};

const buildCodeBlockedMessage = (user) => {
  const blockedUntil = user?.blocageCodeJusqua ? new Date(user.blocageCodeJusqua) : null;
  const remainingMinutes = getBlockedMinutes(blockedUntil);

  if (remainingMinutes <= 0) {
    return "Trop de codes incorrects. Réessayez plus tard.";
  }

  return `Trop de codes incorrects. Réessayez dans ${remainingMinutes} minute(s).`;
};

const clearInvalidCodeProtection = (user) => {
  user.tentativesCodeInvalide = 0;
  user.blocageCodeJusqua = null;
};

const registerInvalidCodeAttempt = async (user) => {
  const currentAttempts = Number.isFinite(Number(user.tentativesCodeInvalide))
    ? Number(user.tentativesCodeInvalide)
    : 0;

  const nextAttempts = currentAttempts + 1;
  const shouldBlock = nextAttempts >= MAX_CODE_FAILURES;

  if (shouldBlock) {
    user.tentativesCodeInvalide = 0;
    user.blocageCodeJusqua = new Date(Date.now() + CODE_BLOCK_MINUTES * 60 * 1000);
  } else {
    user.tentativesCodeInvalide = nextAttempts;
  }

  await user.save();
  return shouldBlock;
};

const verifyRecaptchaToken = async (token, remoteIp) => {
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      ok: false,
      status: 400,
      message: "Validation reCAPTCHA requise"
    };
  }

  if (!RECAPTCHA_SECRET_KEY) {
    return {
      ok: false,
      status: 500,
      message: "Configuration reCAPTCHA manquante cote serveur"
    };
  }

  const params = new URLSearchParams({
    secret: RECAPTCHA_SECRET_KEY,
    response: token.trim(),
  });

  if (remoteIp) {
    params.append("remoteip", remoteIp);
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        message: "Service reCAPTCHA indisponible. Reessayez plus tard"
      };
    }

    const payload = await response.json();

    if (!payload?.success) {
      return {
        ok: false,
        status: 400,
        message: "Validation reCAPTCHA invalide. Cochez \"I'm not a robot\" puis reessayez"
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      message: "Service reCAPTCHA indisponible. Reessayez plus tard"
    };
  }
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
      return res.status(401).json({ message: "Email invalide ou inexistant." });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
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

    // 🔹 Générer le Refresh Token
    const refreshToken = jwt.sign(
      { id: user._id },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // 🔹 Sauvegarder le refresh token en base
    user.refreshToken = refreshToken;
    await user.save();

    // ═══════════════════════════════════════════════════════════════
    // 🔒 Envoyer les tokens dans des cookies httpOnly
    // ═══════════════════════════════════════════════════════════════
    // Avant : token envoyé dans le body JSON → stocké en localStorage → vulnérable XSS
    // Après : token dans cookie httpOnly → invisible au JavaScript → protégé XSS
    // Le navigateur envoie automatiquement les cookies à chaque requête
    res.cookie("accessToken", token, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    // 🔹 Le body ne contient plus les tokens (seulement les infos utilisateur)
    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Register client
exports.registerClient = async (req, res) => {
  try {
    const { nom, email, motDePasse, numTelephone, recaptchaToken } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    // 🔹 Vérifier que tous les champs obligatoires sont fournis et non vides
    if (!nom?.trim() || !emailNormalise || !motDePasse?.trim() || !numTelephone?.trim()) {
      return res.status(400).json({ 
        message: "Tous les champs sont obligatoires : nom, email, mot de passe et numéro de téléphone" 
      });
    }

    const recaptcha = await verifyRecaptchaToken(recaptchaToken, req.ip);
    if (!recaptcha.ok) {
      return res.status(recaptcha.status).json({ message: recaptcha.message });
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
    clearInvalidCodeProtection(user);
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
    const codeSaisi = code?.trim();

    if (!emailNormalise || !codeSaisi) {
      return res.status(400).json({ message: "Email et code sont requis" });
    }

    const user = await Utilisateur.findOne({ email: emailNormalise });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.role !== "CLIENT") {
      return res.status(403).json({ message: "La vérification email est réservée aux comptes client" });
    }

    if (user.emailVerifie) {
      return res.status(400).json({ message: "Email déjà vérifié" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé. Contactez l'administrateur." });
    }

    if (isCodeTemporarilyBlocked(user)) {
      return res.status(429).json({ message: buildCodeBlockedMessage(user) });
    }

    if (user.codeVerification !== codeSaisi) {
      const userBlocked = await registerInvalidCodeAttempt(user);

      if (userBlocked) {
        return res.status(429).json({ message: buildCodeBlockedMessage(user) });
      }

      return res.status(400).json({ message: "Code de vérification incorrect" });
    }

    if (user.codeVerificationExpire < new Date()) {
      return res.status(400).json({ message: "Code de vérification expiré. Demandez un nouveau code." });
    }

    user.emailVerifie = true;
    user.codeVerification = null;
    user.codeVerificationExpire = null;
    clearInvalidCodeProtection(user);

    // Ouvre directement une session apres verification reussie.
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    user.refreshToken = refreshToken;
    await user.save();

    const userResponse = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      creePar: user.creePar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (user.role === "ADMIN" || user.role === "TECHNICIEN") {
      userResponse.zoneIntervention = user.zoneIntervention;
    }

    if (user.role === "TECHNICIEN" && user.categorie) {
      userResponse.categorie = user.categorie;
    }

    if (user.role === "SUPER_ADMIN") {
      userResponse.role = "SUPER_ADMIN";
    }

    res.cookie("accessToken", token, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    res.json({
      message: "✅ Email vérifié avec succès. Connexion automatique effectuée.",
      user: userResponse
    });
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

    if (user.role !== "CLIENT") {
      return res.status(403).json({ message: "La vérification email est réservée aux comptes client" });
    }

    if (user.emailVerifie) {
      return res.status(400).json({ message: "Email déjà vérifié" });
    }

    const code = genererCodeVerification();
    user.codeVerification = code;
    user.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000);
    clearInvalidCodeProtection(user);
    await user.save();

    await envoyerCodeVerification(emailNormalise, code);

    res.json({ message: "Nouveau code de vérification envoyé à votre email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Modifier l'email avant vérification
// Body: { ancienEmail, nouvelEmail }
exports.modifierEmail = async (req, res) => {
  try {
    const { ancienEmail, nouvelEmail } = req.body;
    const ancienNormalise = ancienEmail?.trim()?.toLowerCase();
    const nouveauNormalise = nouvelEmail?.trim()?.toLowerCase();

    // 🔹 Vérifier que les deux champs sont fournis
    if (!ancienNormalise || !nouveauNormalise) {
      return res.status(400).json({ message: "Ancien et nouvel email sont requis" });
    }

    // 🔹 Vérifier que le nouvel email est différent de l'ancien
    if (ancienNormalise === nouveauNormalise) {
      return res.status(400).json({ message: "Le nouvel email doit être différent de l'ancien" });
    }

    // 🔹 Valider le format du nouvel email
    if (!validateEmail(nouveauNormalise)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    // 🔹 Trouver le compte non vérifié avec l'ancien email
    const user = await Utilisateur.findOne({ email: ancienNormalise, emailVerifie: false });
    if (!user) {
      return res.status(404).json({ message: "Compte introuvable ou email déjà vérifié" });
    }

    if (user.role !== "CLIENT") {
      return res.status(403).json({ message: "La vérification email est réservée aux comptes client" });
    }

    // 🔹 Vérifier que le nouvel email n'est pas déjà utilisé par un autre compte
    const emailExiste = await Utilisateur.findOne({ email: nouveauNormalise });
    if (emailExiste) {
      return res.status(400).json({ message: "Cette adresse email est déjà utilisée" });
    }

    // 🔹 Mettre à jour l'email et générer un nouveau code
    const code = genererCodeVerification();
    user.email = nouveauNormalise;
    user.codeVerification = code;
    user.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    clearInvalidCodeProtection(user);
    await user.save();

    // 🔹 Envoyer le code au nouvel email
    await envoyerCodeVerification(nouveauNormalise, code);

    res.json({ 
      message: "Email modifié avec succès. Un nouveau code de vérification a été envoyé.",
      email: nouveauNormalise
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Étape 1 : Mot de passe oublié - Envoyer un code de réinitialisation
// Body: { email }
exports.motDePasseOublie = async (req, res) => {
  try {
    const { email, recaptchaToken } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    if (!emailNormalise) {
      return res.status(400).json({ message: "Email requis" });
    }

    if (!validateEmail(emailNormalise)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    const recaptcha = await verifyRecaptchaToken(recaptchaToken, req.ip);
    if (!recaptcha.ok) {
      return res.status(recaptcha.status).json({ message: recaptcha.message });
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
    clearInvalidCodeProtection(user);
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
    const codeSaisi = code?.trim();

    if (!emailNormalise || !codeSaisi) {
      return res.status(400).json({ message: "Email et code requis" });
    }

    // 🔹 Chercher l'utilisateur pour vérifier le code
    const user = await Utilisateur.findOne({ email: emailNormalise });

    if (!user) {
      return res.status(400).json({ message: "Code incorrect ou expiré" });
    }

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    if (isCodeTemporarilyBlocked(user)) {
      return res.status(429).json({ message: buildCodeBlockedMessage(user) });
    }

    const codeValide =
      user.codeVerification
      && user.codeVerificationExpire
      && user.codeVerification === codeSaisi
      && user.codeVerificationExpire > new Date();

    if (!codeValide) {
      const userBlocked = await registerInvalidCodeAttempt(user);

      if (userBlocked) {
        return res.status(429).json({ message: buildCodeBlockedMessage(user) });
      }

      return res.status(400).json({ message: "Code incorrect ou expiré" });
    }

    // 🔹 Marquer le code comme vérifié et nettoyer
    user.codeResetVerifie = true;
    user.codeVerification = null;
    user.codeVerificationExpire = null;
    clearInvalidCodeProtection(user);
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

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Fonctionnalité non disponible pour le Super Admin" });
    }

    // 🔹 Vérifier que le nouveau mdp n'est pas l'ancien
    const memeMotDePasse = await bcrypt.compare(nouveauMotDePasse, user.motDePasse);
    if (memeMotDePasse) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien" });
    }

    // 🔹 Mettre à jour le mot de passe et nettoyer
    user.motDePasse = nouveauMotDePasse;
    user.codeResetVerifie = false;
    clearInvalidCodeProtection(user);
    await user.save();

    res.json({ message: "✅ Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Refresh Token — Renouveler l'access token sans se reconnecter
// 🔒 Lit le refresh token depuis le cookie httpOnly (plus depuis le body)
exports.refreshToken = async (req, res) => {
  try {
    // 🔒 Lire le refresh token depuis le cookie httpOnly
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token requis" });
    }

    // Vérifier le refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Refresh token invalide ou expiré" });
    }

    // Vérifier que le refresh token correspond à celui en base
    const user = await Utilisateur.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token invalide" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé" });
    }

    // Générer un nouveau access token
    const newToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Générer un nouveau refresh token (rotation)
    const newRefreshToken = jwt.sign(
      { id: user._id },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    // 🔒 Envoyer les nouveaux tokens dans des cookies httpOnly
    res.cookie("accessToken", newToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    res.json({ message: "Token renouvelé avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Logout — Supprimer les cookies et le refresh token en base
// 🔒 Efface les cookies httpOnly côté navigateur
exports.logout = async (req, res) => {
  try {
    // 🔒 Lire le refresh token depuis le cookie pour le supprimer en base
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const user = await Utilisateur.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    // 🔒 Supprimer les cookies côté navigateur
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/refresh-token" });
    res.clearCookie("csrf-token", { path: "/" });

    res.json({ message: "Déconnexion réussie" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Session courante — retourne l'utilisateur authentifié
exports.me = async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.user.id)
      .select("_id nom email role isActive createdAt updatedAt");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Session invalide" });
    }

    res.json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};