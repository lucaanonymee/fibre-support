const Ticket = require("../models/Ticket");

// Voir tickets assignés à un technicien
exports.ticketsAssignes = async (req, res) => {
  try {
    // 🔹 On cherche par champ correct "technicienId"
    const tickets = await Ticket.find({ technicienId: req.user.id })
      .populate("clientId", "nom email numTelephone")  // infos client + téléphone
      .populate("technicienId", "nom email")  // infos technicien
      .populate("adminId", "nom email");     // infos admin qui a assigné

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: "Aucun ticket assigné à ce technicien" });
    }

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mettre à jour statut d’un ticket
exports.mettreAJourTicket = async (req, res) => {
  try {
    // 🔹 Chercher le ticket par ID et peupler client et technicien
    const ticket = await Ticket.findById(req.params.id)
      .populate("clientId", "nom email")
      .populate("technicienId", "nom email")
      .populate("adminId", "nom email");

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
      await ticket.save();
      
      return res.json({
        message: "Ticket clôturé avec succès",
        ticket
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
      .populate("clientId", "nom email numTelephone")
      .populate("technicienId", "nom email")
      .populate("adminId", "nom email")
      .sort({ creationDate: -1 }); // du plus récent au plus ancien

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: `Aucun ticket trouvé pour le SN : ${sn}` });
    }

    res.json({
      sn,
      totalTickets: tickets.length,
      tickets
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
