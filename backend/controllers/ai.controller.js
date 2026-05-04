const { runPythonPrediction } = require("../services/ai.service");
const Ticket = require("../models/Ticket");

const VALID_TYPES = new Set([
  "COUPURE_TOTALE",
  "QUALITE_DEGRADEE",
  "MODEM_DEFECTUEUX",
  "CABLE_ENDOMMAGE",
  "CONFIG_MODEM",
  "DEBIT_FAIBLE",
]);

const validateTypeProbleme = (typeProbleme) => {
  if (!typeProbleme || !VALID_TYPES.has(typeProbleme)) {
    return "typeProbleme invalide";
  }
  return null;
};

const normalizeCreationDate = (creationDate) => {
  const dateValue = creationDate || new Date().toISOString();
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return { error: "creationDate invalide (format ISO attendu)" };
  }

  return { isoDate: parsedDate.toISOString() };
};

exports.predict = (req, res) =>
  res.status(410).json({
    message:
      "Endpoint /predict desactive. La prediction IA est executee automatiquement dans le flux applicatif.",
  });

exports.predictFromAdminLoad = async (req, res) => {
  try {
    const { typeProbleme, creationDate } = req.body || {};

    if (!typeProbleme) {
      return res.status(400).json({
        message: "Champ requis: typeProbleme",
      });
    }

    const typeError = validateTypeProbleme(typeProbleme);
    if (typeError) {
      return res.status(400).json({
        message: typeError,
      });
    }

    const { isoDate, error: dateError } = normalizeCreationDate(creationDate);
    if (dateError) {
      return res.status(400).json({
        message: dateError,
      });
    }

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "Non authentifie" });
    }

    const nbTicketsOuvertsAdmin = await Ticket.countDocuments({
      adminId,
      statut: { $in: ["OUVERT", "EN_COURS"] },
    });

    const prediction = await runPythonPrediction({
      typeProbleme,
      nbTicketsOuverts_admin: nbTicketsOuvertsAdmin,
      creationDate: isoDate,
    });

    if (
      typeof prediction?.tempsReponsePrevu !== "number"
      || typeof prediction?.score !== "number"
      || typeof prediction?.priorite !== "string"
    ) {
      return res.status(500).json({
        message: "Reponse invalide du module IA",
      });
    }

    return res.json({
      adminId,
      nbTicketsOuverts_admin: nbTicketsOuvertsAdmin,
      tempsReponsePrevu: prediction.tempsReponsePrevu,
      score: prediction.score,
      priorite: prediction.priorite,
    });
  } catch (err) {
    console.error("Erreur prediction IA admin:", err.message);
    return res.status(500).json({
      message: "Erreur lors du calcul IA admin",
      details: err.message,
    });
  }
};
