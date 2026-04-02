const Ticket = require("../models/Ticket");
const Utilisateur = require("../models/Utilisateur");


// 🔹 Validation du SN : 16 caractères, uniquement majuscules et chiffres
const validateSN = (sn) => {
  const regex = /^[A-Z0-9]{16}$/;
  return regex.test(sn);
};

// 🔹 Créer un ticket + assigner automatiquement un admin selon localisation
exports.creerTicket = async (req, res) => {
  try {
    const { sn, typeProbleme, localisation, description } = req.body;
    const clientId = req.user.id;

    // 🔹 Vérifier que tous les champs sont fournis
    if (!sn || !typeProbleme || !localisation || localisation.lat == null || localisation.lng == null) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires : sn, typeProbleme et localisation (lat, lng)"
      });
    }

    // 🔹 Valider le format du SN
    if (!validateSN(sn)) {
      return res.status(400).json({
        message: "Le SN doit contenir exactement 16 caractères : lettres majuscules et chiffres uniquement (ex: AB12CD34EF56GH78)"
      });
    }

    // 🔹 Chercher tous les admins dont la zone contient le point
    const admins = await Utilisateur.find({
      role: "ADMIN",
      isActive: true, // 🔹 Ne chercher que les admins actifs
      zoneIntervention: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [localisation.lng, localisation.lat] // lng, lat
          }
        }
      }
    });

    if (!admins || admins.length === 0) {
      return res.status(404).json({
        message: "Aucun admin trouvé pour cette zone"
      });
    }

    // 🔹 Si plusieurs admins → choisir celui avec le moins de tickets (OUVERT + EN_COURS)
    // En cas d'égalité sur la somme, choisir celui avec le moins de tickets OUVERT.
    const adminIds = admins.map((admin) => admin._id);

    const chargesAdmins = await Ticket.aggregate([
      {
        $match: {
          adminId: { $in: adminIds },
          statut: { $in: ["OUVERT", "EN_COURS"] }
        }
      },
      {
        $group: {
          _id: "$adminId",
          total: { $sum: 1 },
          ouverts: {
            $sum: {
              $cond: [{ $eq: ["$statut", "OUVERT"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const chargeParAdmin = new Map();
    for (const charge of chargesAdmins) {
      chargeParAdmin.set(charge._id.toString(), {
        total: charge.total,
        ouverts: charge.ouverts
      });
    }

    let adminSelectionne = admins[0];
    let meilleurTotal = Infinity;
    let meilleurOuverts = Infinity;

    for (const admin of admins) {
      const charge = chargeParAdmin.get(admin._id.toString()) || { total: 0, ouverts: 0 };

      const estMeilleurTotal = charge.total < meilleurTotal;
      const egaliteTotalMaisMoinsOuverts = charge.total === meilleurTotal && charge.ouverts < meilleurOuverts;

      if (estMeilleurTotal || egaliteTotalMaisMoinsOuverts) {
        adminSelectionne = admin;
        meilleurTotal = charge.total;
        meilleurOuverts = charge.ouverts;
      }
    }

    // 🔹 Création ticket (statut OUVERT, assignationDate vide)
    const ticket = await Ticket.create({
      sn,
      typeProbleme,
      description: description || null,
      localisation,
      clientId,
      adminId: adminSelectionne._id
    });

    // 🔹 Peupler admin pour retour
    await ticket.populate("adminId", "nom email");

    res.status(201).json({
      message: "Ticket créé et assigné automatiquement à un admin",
      ticket
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// 🔹 Consulter les tickets d’un client
exports.consulterTicketsClient = async (req, res) => {
  try {
    const clientId = req.user.id;

    const tickets = await Ticket.find({ clientId })
      .populate("adminId", "nom email")
      .populate("technicienId", "nom email")
      .sort({ creationDate: -1 }); // plus récent en premier

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({
        message: "Aucun ticket trouvé pour ce client"
      });
    }

    res.json(tickets);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
