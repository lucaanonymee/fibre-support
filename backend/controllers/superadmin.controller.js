const mongoose = require("mongoose");
const Utilisateur = require("../models/Utilisateur");
const Ticket = require("../models/Ticket");
const SuperAdminAction = require("../models/SuperAdminAction");
const { envoyerEmailBienvenueCompte } = require("../config/email");

const MANAGED_ROLES = ["ADMIN", "CLIENT", "TECHNICIEN"];
const ACTION_TYPES = {
  CREATION: "CREATION",
  DESACTIVATION: "DESACTIVATION",
  REACTIVATION: "REACTIVATION",
};

const validatePassword = (motDePasse) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(motDePasse);
};

const validateEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

const isValidPolygonZone = (zone) => {
  return (
    zone
    && zone.type === "Polygon"
    && Array.isArray(zone.coordinates)
    && Array.isArray(zone.coordinates[0])
    && zone.coordinates[0].length >= 4
  );
};

const pointOnSegment = (point, a, b) => {
  const [x, y] = point;
  const [x1, y1] = a;
  const [x2, y2] = b;

  const squaredLength = (x2 - x1) ** 2 + (y2 - y1) ** 2;

  if (squaredLength <= 1e-20) {
    return Math.abs(x - x1) <= 1e-10 && Math.abs(y - y1) <= 1e-10;
  }

  const cross = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-10) {
    return false;
  }

  const dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1);
  if (dot < -1e-10) {
    return false;
  }

  if (dot - squaredLength > 1e-10) {
    return false;
  }

  return true;
};

const pointInRing = (point, ring) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    if (pointOnSegment(point, ring[j], ring[i])) {
      return true;
    }

    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

const zoneContainsZone = (candidateZone, targetZone) => {
  if (!isValidPolygonZone(candidateZone) || !isValidPolygonZone(targetZone)) {
    return false;
  }

  const candidateOuterRing = candidateZone.coordinates[0];
  const targetOuterRing = targetZone.coordinates[0];

  return targetOuterRing.every((point) => pointInRing(point, candidateOuterRing));
};

const getRoleLabel = (role) => {
  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "CLIENT") {
    return "Client";
  }

  if (role === "TECHNICIEN") {
    return "Technicien";
  }

  return "Utilisateur";
};

const getSafeUserSelect = () => {
  return "_id nom email role photoUrl creePar zoneIntervention categorie numTelephone isActive createdAt updatedAt";
};

const getModifiedCount = (result) => result?.modifiedCount ?? result?.nModified ?? 0;

const logSuperAdminAction = async ({ actorId, actionType, targetUser, session = null }) => {
  if (!actorId || !targetUser) {
    return;
  }

  const actionPayload = {
    actorId,
    actionType,
    targetId: targetUser._id,
    targetRole: targetUser.role,
    targetName: targetUser.nom || "",
  };

  if (session) {
    await SuperAdminAction.create([actionPayload], { session });
    return;
  }

  await SuperAdminAction.create(actionPayload);
};

const assertActiveSuperAdmin = async (superAdminId, session = null) => {
  const query = Utilisateur.findById(superAdminId);

  if (session) {
    query.session(session);
  }

  const superAdmin = await query;

  if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") {
    throw new Error("SUPER_ADMIN_FORBIDDEN");
  }

  if (!superAdmin.isActive) {
    throw new Error("SUPER_ADMIN_DISABLED");
  }

  return superAdmin;
};

const findReplacementAdmin = async (admin, session) => {
  if (!isValidPolygonZone(admin.zoneIntervention)) {
    throw new Error("ADMIN_ZONE_INVALID");
  }

  const adminsActifs = await Utilisateur.find({
    role: "ADMIN",
    isActive: true,
    _id: { $ne: admin._id },
  })
    .select("_id zoneIntervention createdAt")
    .session(session);

  const adminsEligibles = adminsActifs.filter((candidate) =>
    zoneContainsZone(candidate.zoneIntervention, admin.zoneIntervention)
  );

  if (adminsEligibles.length === 0) {
    throw new Error("NO_REPLACEMENT_ADMIN");
  }

  const adminIds = adminsEligibles.map((candidate) => candidate._id);

  const chargesAdmins = await Ticket.aggregate([
    {
      $match: {
        adminId: { $in: adminIds },
        statut: { $in: ["OUVERT", "EN_COURS"] },
      },
    },
    {
      $group: {
        _id: "$adminId",
        total: { $sum: 1 },
        ouverts: {
          $sum: {
            $cond: [{ $eq: ["$statut", "OUVERT"] }, 1, 0],
          },
        },
      },
    },
  ]).session(session);

  const chargeParAdmin = new Map();
  for (const charge of chargesAdmins) {
    chargeParAdmin.set(charge._id.toString(), {
      total: charge.total,
      ouverts: charge.ouverts,
    });
  }

  let adminRemplacant = null;
  let meilleurTotal = Infinity;
  let meilleurOuverts = Infinity;
  let meilleureDateCreation = Number.POSITIVE_INFINITY;
  let meilleurId = "~";

  for (const candidate of adminsEligibles) {
    const charge = chargeParAdmin.get(candidate._id.toString()) || { total: 0, ouverts: 0 };
    const createdAtTime = candidate.createdAt
      ? new Date(candidate.createdAt).getTime()
      : Number.POSITIVE_INFINITY;
    const candidateId = candidate._id.toString();

    const isBetter =
      charge.total < meilleurTotal
      || (charge.total === meilleurTotal && charge.ouverts < meilleurOuverts)
      || (
        charge.total === meilleurTotal
        && charge.ouverts === meilleurOuverts
        && createdAtTime < meilleureDateCreation
      )
      || (
        charge.total === meilleurTotal
        && charge.ouverts === meilleurOuverts
        && createdAtTime === meilleureDateCreation
        && candidateId < meilleurId
      );

    if (isBetter) {
      adminRemplacant = candidate;
      meilleurTotal = charge.total;
      meilleurOuverts = charge.ouverts;
      meilleureDateCreation = createdAtTime;
      meilleurId = candidateId;
    }
  }

  if (!adminRemplacant) {
    throw new Error("NO_REPLACEMENT_ADMIN");
  }

  return adminRemplacant;
};

const deactivateAdmin = async (admin, session) => {
  const adminRemplacant = await findReplacementAdmin(admin, session);

  const transferTechniciensResult = await Utilisateur.updateMany(
    {
      role: "TECHNICIEN",
      creePar: admin._id,
    },
    {
      $set: {
        creePar: adminRemplacant._id,
      },
    },
    { session }
  );

  const transferTicketsOuvertsResult = await Ticket.updateMany(
    {
      adminId: admin._id,
      statut: "OUVERT",
    },
    {
      $set: {
        adminId: adminRemplacant._id,
      },
    },
    { session }
  );

  const transferTicketsEnCoursResult = await Ticket.updateMany(
    {
      adminId: admin._id,
      statut: "EN_COURS",
    },
    {
      $set: {
        adminId: adminRemplacant._id,
      },
    },
    { session }
  );

  admin.isActive = false;
  admin.refreshToken = null;
  await admin.save({ session });

  return {
    adminRemplaceId: admin._id.toString(),
    adminRemplacantId: adminRemplacant._id.toString(),
    techniciensTransferes: getModifiedCount(transferTechniciensResult),
    ticketsOuvertsTransferes: getModifiedCount(transferTicketsOuvertsResult),
    ticketsEnCoursTransferes: getModifiedCount(transferTicketsEnCoursResult),
  };
};

const deactivateTechnicien = async (technicien, session) => {
  const reopenResult = await Ticket.updateMany(
    {
      technicienId: technicien._id,
      statut: "EN_COURS",
    },
    {
      $set: {
        statut: "OUVERT",
        technicienId: null,
        assignationDate: null,
      },
    },
    { session }
  );

  technicien.isActive = false;
  technicien.estPresent = false;
  technicien.datePresence = null;
  technicien.refreshToken = null;
  await technicien.save({ session });

  return {
    ticketsRouverts: getModifiedCount(reopenResult),
  };
};

const deactivateClient = async (client, session) => {
  const closeResult = await Ticket.updateMany(
    {
      clientId: client._id,
      statut: "EN_COURS",
    },
    {
      $set: {
        statut: "CLOTURE",
        clotureDate: new Date(),
      },
    },
    { session }
  );

  client.isActive = false;
  client.refreshToken = null;
  await client.save({ session });

  return {
    ticketsClotures: getModifiedCount(closeResult),
  };
};

exports.creerAdmin = async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;
    const emailNormalise = email?.trim()?.toLowerCase();

    const superAdmin = await Utilisateur.findById(req.user.id);
    if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Accès refusé. Seul le Super Admin peut créer un admin." });
    }

    if (!superAdmin.isActive) {
      return res.status(403).json({ message: "Compte Super Admin désactivé" });
    }

    if (!nom?.trim() || !emailNormalise || !motDePasse?.trim()) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires : nom, email et mot de passe",
      });
    }

    if (!validateEmail(emailNormalise)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    const emailExiste = await Utilisateur.findOne({ email: emailNormalise });
    if (emailExiste) {
      return res.status(400).json({ message: "Cette adresse email est déjà utilisée" });
    }

    const nomExiste = await Utilisateur.findOne({ nom });
    if (nomExiste) {
      return res.status(400).json({ message: "Ce nom d'utilisateur est déjà pris" });
    }

    if (!validatePassword(motDePasse)) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 8 caractères, une lettre minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)",
      });
    }

    if (!req.body.zoneIntervention) {
      return res.status(400).json({
        message: "La zone d'intervention est obligatoire pour un admin",
      });
    }

    const admin = await Utilisateur.create({
      nom,
      email: emailNormalise,
      motDePasse,
      role: "ADMIN",
      creePar: superAdmin._id,
      zoneIntervention: req.body.zoneIntervention,
      emailVerifie: true,
    });

    try {
      await envoyerEmailBienvenueCompte({
        email: emailNormalise,
        nom,
        role: "ADMIN",
        motDePasseTemporaire: motDePasse,
      });
    } catch (emailErr) {
      console.error("Erreur envoi email bienvenue admin:", emailErr.message);
    }

    try {
      await logSuperAdminAction({
        actorId: superAdmin._id,
        actionType: ACTION_TYPES.CREATION,
        targetUser: admin,
      });
    } catch (logErr) {
      console.error("Erreur journal action superadmin:", logErr.message);
    }

    const adminResponse = {
      _id: admin._id,
      nom: admin.nom,
      email: admin.email,
      role: admin.role,
      creePar: admin.creePar,
      zoneIntervention: admin.zoneIntervention,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    return res.status(201).json({
      message: "Admin créé avec succès. Un email de bienvenue a été envoyé.",
      user: adminResponse,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.listerUtilisateurs = async (req, res) => {
  try {
    await assertActiveSuperAdmin(req.user.id);

    const users = await Utilisateur.find({
      _id: { $ne: req.user.id },
      role: { $in: MANAGED_ROLES },
    })
      .select(getSafeUserSelect())
      .sort({ createdAt: -1 });

    return res.json({
      total: users.length,
      users,
    });
  } catch (err) {
    if (err.message === "SUPER_ADMIN_FORBIDDEN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (err.message === "SUPER_ADMIN_DISABLED") {
      return res.status(403).json({ message: "Compte Super Admin désactivé" });
    }

    return res.status(500).json({ message: err.message });
  }
};

exports.listerActions = async (req, res) => {
  try {
    await assertActiveSuperAdmin(req.user.id);

    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;

    const actions = await SuperAdminAction.find({})
      .select("_id actionType targetId targetRole targetName createdAt")
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      total: actions.length,
      actions,
    });
  } catch (err) {
    if (err.message === "SUPER_ADMIN_FORBIDDEN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (err.message === "SUPER_ADMIN_DISABLED") {
      return res.status(403).json({ message: "Compte Super Admin désactivé" });
    }

    return res.status(500).json({ message: err.message });
  }
};

exports.desactiverUtilisateur = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const result = {
      userId: null,
      role: null,
      adminRemplaceId: null,
      adminRemplacantId: null,
      techniciensTransferes: 0,
      ticketsOuvertsTransferes: 0,
      ticketsEnCoursTransferes: 0,
      ticketsRouverts: 0,
      ticketsClotures: 0,
    };

    await session.withTransaction(async () => {
      await assertActiveSuperAdmin(req.user.id, session);

      const user = await Utilisateur.findById(req.params.id).session(session);
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user._id.toString() === req.user.id.toString()) {
        throw new Error("CANNOT_DEACTIVATE_SELF");
      }

      if (user.role === "SUPER_ADMIN" || !MANAGED_ROLES.includes(user.role)) {
        throw new Error("ROLE_NOT_ALLOWED");
      }

      if (!user.isActive) {
        throw new Error("USER_ALREADY_DISABLED");
      }

      let roleResult = {};

      if (user.role === "ADMIN") {
        roleResult = await deactivateAdmin(user, session);
      }

      if (user.role === "TECHNICIEN") {
        roleResult = await deactivateTechnicien(user, session);
      }

      if (user.role === "CLIENT") {
        roleResult = await deactivateClient(user, session);
      }

      result.userId = user._id.toString();
      result.role = user.role;
      Object.assign(result, roleResult);

      try {
        await logSuperAdminAction({
          actorId: req.user.id,
          actionType: ACTION_TYPES.DESACTIVATION,
          targetUser: user,
          session,
        });
      } catch (logErr) {
        console.error("Erreur journal action superadmin:", logErr.message);
      }
    });

    const roleLabel = getRoleLabel(result.role);

    if (result.role === "ADMIN") {
      return res.json({
        message: `${roleLabel} désactivé avec succès et transferts effectués`,
        role: result.role,
        userId: result.userId,
        adminRemplaceId: result.adminRemplaceId,
        adminRemplacantId: result.adminRemplacantId,
        techniciensTransferes: result.techniciensTransferes,
        ticketsOuvertsTransferes: result.ticketsOuvertsTransferes,
        ticketsEnCoursTransferes: result.ticketsEnCoursTransferes,
      });
    }

    if (result.role === "TECHNICIEN") {
      return res.json({
        message: `${roleLabel} désactivé avec succès`,
        role: result.role,
        userId: result.userId,
        ticketsRouverts: result.ticketsRouverts,
      });
    }

    return res.json({
      message: `${roleLabel} désactivé avec succès`,
      role: result.role,
      userId: result.userId,
      ticketsClotures: result.ticketsClotures,
    });
  } catch (err) {
    if (err.message === "SUPER_ADMIN_FORBIDDEN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (err.message === "SUPER_ADMIN_DISABLED") {
      return res.status(403).json({ message: "Compte Super Admin désactivé" });
    }

    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (err.message === "CANNOT_DEACTIVATE_SELF") {
      return res.status(403).json({ message: "Le Super Admin ne peut pas se désactiver lui-même" });
    }

    if (err.message === "ROLE_NOT_ALLOWED") {
      return res.status(403).json({ message: "Le Super Admin ne peut pas désactiver ce rôle" });
    }

    if (err.message === "USER_ALREADY_DISABLED") {
      return res.status(400).json({ message: "Utilisateur déjà désactivé" });
    }

    if (err.message === "ADMIN_ZONE_INVALID") {
      return res.status(400).json({ message: "Zone d'intervention admin invalide" });
    }

    if (err.message === "NO_REPLACEMENT_ADMIN") {
      return res.status(400).json({
        message: "Désactivation impossible: aucun admin actif de remplacement ne couvre la zone",
      });
    }

    return res.status(500).json({ message: err.message });
  } finally {
    await session.endSession();
  }
};

exports.reactiverUtilisateur = async (req, res) => {
  try {
    await assertActiveSuperAdmin(req.user.id);

    const user = await Utilisateur.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(403).json({ message: "Le Super Admin ne peut pas se réactiver lui-même" });
    }

    if (user.role === "SUPER_ADMIN" || !MANAGED_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Le Super Admin ne peut pas réactiver ce rôle" });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "Utilisateur déjà actif" });
    }

    user.isActive = true;
    await user.save();

    try {
      await logSuperAdminAction({
        actorId: req.user.id,
        actionType: ACTION_TYPES.REACTIVATION,
        targetUser: user,
      });
    } catch (logErr) {
      console.error("Erreur journal action superadmin:", logErr.message);
    }

    const roleLabel = getRoleLabel(user.role);

    return res.json({
      message: `${roleLabel} ${user.nom} réactivé avec succès`,
      role: user.role,
      userId: user._id.toString(),
    });
  } catch (err) {
    if (err.message === "SUPER_ADMIN_FORBIDDEN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (err.message === "SUPER_ADMIN_DISABLED") {
      return res.status(403).json({ message: "Compte Super Admin désactivé" });
    }

    return res.status(500).json({ message: err.message });
  }
};

// Alias pour compatibilité avec d'anciens imports/routes.
exports.listerAdmins = exports.listerUtilisateurs;
exports.desactiveradmin = exports.desactiverUtilisateur;
exports.reactiveradmin = exports.reactiverUtilisateur;
