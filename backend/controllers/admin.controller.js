const Utilisateur = require("../models/Utilisateur");
const Ticket = require("../models/Ticket");
const { envoyerEmailBienvenueCompte } = require("../config/email");

// 🔹 Vérifier si la date de présence est aujourd'hui
const estPresentAujourdhui = (user) => {
  if (!user.estPresent || !user.datePresence) return false;
  const today = new Date();
  const dp = new Date(user.datePresence);
  return dp.getFullYear() === today.getFullYear() &&
         dp.getMonth() === today.getMonth() &&
         dp.getDate() === today.getDate();
};

// 🔹 Fonction de validation mot de passe
const validatePassword = (motDePasse) => {
  // Au moins 8 caractères, 1 lettre minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(motDePasse);
};

// 🔹 Création Technicien par admin (hérite zone)
exports.creerTechnicien = async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();
    
    // 🔹 Vérifier que tous les champs obligatoires sont fournis et non vides
    if (!nom?.trim() || !emailNormalise || !motDePasse?.trim()) {
      return res.status(400).json({ 
        message: "Tous les champs sont obligatoires : nom, email et mot de passe" 
      });
    }
    
    const admin = await Utilisateur.findById(req.user.id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: "Compte admin désactivé" });
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
        message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)" 
      });
    }

    // 🔹 Valider la catégorie (obligatoire pour technicien)
    if (!req.body.categorie || !['UGS', 'ULS'].includes(req.body.categorie)) {
      return res.status(400).json({ 
        message: "La catégorie est obligatoire pour un technicien (UGS ou ULS)" 
      });
    }

    const technicien = await Utilisateur.create({
      nom,
      email: emailNormalise,
      motDePasse,
      role: "TECHNICIEN",
      creePar: admin._id,
      zoneIntervention: admin.zoneIntervention,
      categorie: req.body.categorie,
      emailVerifie: true // Technicien créé par admin → pas de vérification email
    });

    // 🔹 Envoyer l'email de bienvenue avec identifiants temporaires
    try {
      await envoyerEmailBienvenueCompte({
        email: emailNormalise,
        nom,
        role: "TECHNICIEN",
        motDePasseTemporaire: motDePasse
      });
    } catch (emailErr) {
      console.error("Erreur envoi email bienvenue technicien:", emailErr.message);
    }

    // ✅ Ne jamais retourner le mot de passe
    const technicienResponse = {
      _id: technicien._id,
      nom: technicien.nom,
      email: technicien.email,
      role: technicien.role,
      creePar: technicien.creePar,
      zoneIntervention: technicien.zoneIntervention,
      categorie: technicien.categorie,
      createdAt: technicien.createdAt,
      updatedAt: technicien.updatedAt
    };

    res.status(201).json({ 
      message: "Technicien créé avec succès. Un email de bienvenue a été envoyé.", 
      user: technicienResponse 
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Assigner un ticket existant à un technicien
exports.assignerTicket = async (req, res) => {
  try {
    const { ticketId, technicienId } = req.body;
    const adminId = req.user.id;

    const admin = await Utilisateur.findById(adminId);
    if (!admin || admin.role !== "ADMIN" || !admin.isActive) {
      return res.status(403).json({ message: "Accès admin invalide" });
    }

    // Vérifie que le ticket existe
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket non trouvé" });

    if (!ticket.adminId || ticket.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Ce ticket n'appartient pas à cet admin" });
    }

     // ✅ Seuls les tickets OUVERT peuvent être assignés
    if (ticket.statut !== "OUVERT") {
      return res.status(400).json({ 
        message: `Impossible d'assigner un ticket avec le statut ${ticket.statut}. Seuls les tickets OUVERT peuvent être assignés.` 
      });
    }

    // Vérifie que le technicien existe et est TECHNICIEN
    const tech = await Utilisateur.findById(technicienId);
    if (!tech || tech.role !== "TECHNICIEN") {
      return res.status(400).json({ message: "Technicien invalide" });
    }

    if (!tech.creePar || tech.creePar.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Ce technicien n'est pas géré par cet admin" });
    }

    // 🔹 Vérifier que le technicien est actif
    if (!tech.isActive) {
      return res.status(400).json({ message: "Ce technicien est désactivé" });
    }

    // 🔹 Vérifier que le technicien est présent aujourd'hui
    if (!estPresentAujourdhui(tech)) {
      return res.status(400).json({ message: "Ce technicien n'est pas marqué comme présent aujourd'hui" });
    }

     // 🔹 UGS = CONFIG_MODEM + DEBIT_FAIBLE | ULS = tous les autres
    const typesUGS = ["CONFIG_MODEM", "DEBIT_FAIBLE"];
    if (
      (tech.categorie === "UGS" && !typesUGS.includes(ticket.typeProbleme)) ||
      (tech.categorie === "ULS" && typesUGS.includes(ticket.typeProbleme))
    ) {
      return res.status(400).json({ message: "Ce technicien ne peut pas traiter ce type de problème" });
    }

    // 🔹 UGS = max 10 tickets actifs | ULS = max 5 tickets actifs
    const maxTickets = tech.categorie === "UGS" ? 10 : 5;
    const ticketsActifs = await Ticket.countDocuments({
      technicienId,
      statut: { $in: ["EN_COURS"] }
    });

    if (ticketsActifs >= maxTickets) {
      return res.status(400).json({ message: `Technicien a atteint le nombre maximum de tickets actifs (${maxTickets})` });
    }

    // ✅ ADMIN assigne → OUVERT devient EN_COURS automatiquement
    ticket.technicienId = technicienId;
    ticket.adminId = adminId;
    ticket.statut = "EN_COURS"; // ✅ L'admin fait passer à EN_COURS
    ticket.assignationDate = new Date(); // ✅ Enregistre la date d'assignation
    
    await ticket.save();

    // Repeupler pour retourner les infos complètes
    await ticket.populate("clientId", "nom email");
    await ticket.populate("technicienId", "nom email");
    await ticket.populate("adminId", "nom email");

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Désactiver un technicien ou client (soft delete)
exports.desactiverUtilisateur = async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 🔹 L'admin ne peut désactiver que des techniciens
    if (user.role !== "TECHNICIEN") {
      return res.status(403).json({ message: "L'admin ne peut désactiver que des techniciens" });
    }

    // 🔹 Vérifier que le technicien appartient à cet admin
    if (!user.creePar || user.creePar.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Ce technicien n'est pas géré par cet admin" });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: "Technicien déjà désactivé" });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: `Technicien ${user.nom} désactivé avec succès` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Réactiver un technicien ou client
exports.reactiverUtilisateur = async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 🔹 L'admin ne peut réactiver que des techniciens
    if (user.role !== "TECHNICIEN") {
      return res.status(403).json({ message: "L'admin ne peut réactiver que des techniciens" });
    }

    // 🔹 Vérifier que le technicien appartient à cet admin
    if (!user.creePar || user.creePar.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Ce technicien n'est pas géré par cet admin" });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "Technicien déjà actif" });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: `Technicien ${user.nom} réactivé avec succès` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};// 🔹 Marquer un technicien comme présent (pour aujourd'hui)
exports.marquerPresent = async (req, res) => {
  try {
    // Vérifier que l'admin existe
    const admin = await Utilisateur.findById(req.user.id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: "Compte admin désactivé" });
    }

    const tech = await Utilisateur.findById(req.params.id);
    if (!tech || tech.role !== "TECHNICIEN") {
      return res.status(404).json({ message: "Technicien introuvable" });
    }

    if (!tech.creePar || tech.creePar.toString() !== admin._id.toString()) {
      return res.status(403).json({ message: "Ce technicien n'est pas géré par cet admin" });
    }

    if (!tech.isActive) {
      return res.status(400).json({ message: "Ce technicien est désactivé" });
    }

    // Vérifier si déjà présent aujourd'hui
    if (estPresentAujourdhui(tech)) {
      return res.status(400).json({ message: "Ce technicien est déjà marqué comme présent aujourd'hui" });
    }

    tech.estPresent = true;
    tech.datePresence = new Date();
    await tech.save();

    res.json({ message: `Technicien ${tech.nom} marqué comme présent` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Marquer un technicien comme absent
exports.marquerAbsent = async (req, res) => {
  try {
    // Vérifier que l'admin existe
    const admin = await Utilisateur.findById(req.user.id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: "Compte admin désactivé" });
    }

    const tech = await Utilisateur.findById(req.params.id);
    if (!tech || tech.role !== "TECHNICIEN") {
      return res.status(404).json({ message: "Technicien introuvable" });
    }

    if (!tech.creePar || tech.creePar.toString() !== admin._id.toString()) {
      return res.status(403).json({ message: "Ce technicien n'est pas géré par cet admin" });
    }

    if (!estPresentAujourdhui(tech)) {
      return res.status(400).json({ message: "Ce technicien n'est pas marqué comme présent" });
    }

    tech.estPresent = false;
    tech.datePresence = null;
    await tech.save();

    res.json({ message: `Technicien ${tech.nom} marqué comme absent` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Lister les techniciens d'un admin (avec filtre présence)
// Query param: ?present=true ou ?present=false (optionnel)
exports.listerTechniciens = async (req, res) => {
  try {
    const admin = await Utilisateur.findById(req.user.id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    // Récupérer les techniciens créés par cet admin
    const techniciens = await Utilisateur.find({
      role: "TECHNICIEN",
      creePar: admin._id,
      isActive: true
    }).select("-motDePasse -codeVerification -codeVerificationExpire -codeResetVerifie");

    // Ajouter le statut de présence (vérifier si datePresence = aujourd'hui)
    const result = techniciens.map(tech => {
      const techObj = tech.toObject();
      techObj.presentAujourdhui = estPresentAujourdhui(tech);
      return techObj;
    });

    // Filtrer si le query param 'present' est fourni
    const filtre = req.query.present;
    if (filtre === "true") {
      return res.json(result.filter(t => t.presentAujourdhui));
    } else if (filtre === "false") {
      return res.json(result.filter(t => !t.presentAujourdhui));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// 🔹 Consulter tickets d’un admin
exports.ticketsAdmin = async (req, res) => {
  try {
    const tickets = await Ticket.find({ adminId: req.user.id })
      .populate("clientId", "nom email")
      .populate("technicienId", "nom email")
      .populate("adminId", "nom email");

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({
        message: "Aucun ticket pour cet admin"
      });
    }

    res.json(tickets);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
