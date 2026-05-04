const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const { envoyerEmailClotureTicket } = require("../config/email");

const TICKET_REF_REGEX = /^TT-[1-9]\d{0,6}$/;

const hideAiMetricsForTechnicien = (ticketDoc) => {
  const ticket = ticketDoc?.toObject ? ticketDoc.toObject() : { ...ticketDoc };

  delete ticket.aiScore;
  delete ticket.priorite;
  delete ticket.tempsReponsePrevu;

  return ticket;
};

const findTicketByIdentifier = async (identifier) => {
  const value = identifier?.toString().trim();

  if (!value) {
    return null;
  }

  if (mongoose.isValidObjectId(value)) {
    return Ticket.findById(value);
  }

  if (TICKET_REF_REGEX.test(value)) {
    return Ticket.findOne({ ticketRef: value });
  }

  return null;
};

// Voir tickets assignés à un technicien
exports.ticketsAssignes = async (req, res) => {
  try {
    // 🔹 On cherche par champ correct "technicienId"
    const tickets = await Ticket.find({ technicienId: req.user.id })
      .populate("clientId", "nom email numTelephone photoUrl")  // infos client + téléphone
      .populate("technicienId", "nom email photoUrl")  // infos technicien
      .populate("adminId", "nom email photoUrl")     // infos admin qui a assigné
      .sort({ assignationDate: 1, creationDate: 1 }); // ordre d'assignation admin

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: "Aucun ticket assigné à ce technicien" });
    }

    const ticketsSanitizes = tickets.map(hideAiMetricsForTechnicien);

    res.json(ticketsSanitizes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mettre à jour statut d’un ticket
exports.mettreAJourTicket = async (req, res) => {
  try {
    // 🔹 Chercher le ticket par ID (_id MongoDB ou reference metier TT-x)
    const ticket = await findTicketByIdentifier(req.params.id);

    if (ticket) {
      await ticket.populate("clientId", "nom email photoUrl");
      await ticket.populate("technicienId", "nom email photoUrl");
      await ticket.populate("adminId", "nom email photoUrl");
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }

    if (!ticket.technicienId || ticket.technicienId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Accès refusé. Ce ticket n'est pas assigné à ce technicien." });
    }

    const nouveauStatut = req.body.statut; // ex: "CLOTURE"
    
    // 🔹 Interdire modifications si ticket déjà clôturé
    if (ticket.statut === "CLOTURE") {
      return res.status(400).json({ message: "Ticket déjà clôturé, impossible de modifier" });
    }

    // Si ticket OUVERT → Technicien ne peut PAS le toucher
    if (ticket.statut === "OUVERT") {
      return res.status(403).json({ 
        message: "Accès refusé. Le ticket doit d'abord être assigné par un admin." 
      });
    }

    // Si ticket EN_COURS → Seule action autorisée = CLOTURE
    if (ticket.statut === "EN_COURS") {
      if (nouveauStatut !== "CLOTURE") {
        return res.status(400).json({ 
          message: `Action non autorisée. Un technicien ne peut que clôturer un ticket EN_COURS. (Statut reçu: ${nouveauStatut})` 
        });
      }
      
      // Clôturer le ticket
      ticket.statut = "CLOTURE";
      ticket.clotureDate = new Date();
      ticket.aiScore = undefined;
      ticket.priorite = undefined;
      await ticket.save();

      // 🔹 Envoyer un email de notification au client
      try {
        if (ticket.clientId && ticket.clientId.email) {
          await envoyerEmailClotureTicket(ticket.clientId.email, ticket);
        }
      } catch (emailErr) {
        console.error("Erreur envoi email clôture:", emailErr.message);
        // Ne pas bloquer la clôture si l'email échoue
      }
      
      return res.json({
        message: "Ticket clôturé avec succès",
        ticket: hideAiMetricsForTechnicien(ticket)
      });
    }

  // État invalide
    return res.status(400).json({ 
      message: `État du ticket invalide: ${ticket.statut}` 
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Voir l'historique des tickets par SN (numéro de série)
exports.historiqueBySN = async (req, res) => {
  try {
    const { sn } = req.params;

    if (!sn?.trim()) {
      return res.status(400).json({ message: "Numéro de série (SN) requis" });
    }

    const tickets = await Ticket.find({ sn: sn })
      .populate("clientId", "nom email numTelephone photoUrl")
      .populate("technicienId", "nom email photoUrl")
      .populate("adminId", "nom email photoUrl")
      .sort({ creationDate: -1 }); // du plus récent au plus ancien

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: `Aucun ticket trouvé pour le SN : ${sn}` });
    }

    res.json({
      sn,
      totalTickets: tickets.length,
      tickets: tickets.map(hideAiMetricsForTechnicien)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
