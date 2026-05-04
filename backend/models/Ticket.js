const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  sn: { type: String, required: true },

  ticketRef: {
    type: String,
    unique: true,
    sparse: true,
    match: /^TT-[1-9]\d{0,6}$/
  },

  typeProbleme: {
    type: String,
    enum: [
      "COUPURE_TOTALE",
      "QUALITE_DEGRADEE",
      "MODEM_DEFECTUEUX",
      "CABLE_ENDOMMAGE",
      "CONFIG_MODEM",
      "DEBIT_FAIBLE"
    ],
    required: true
  },

  // 🔹 Description optionnelle du problème
  description: {
    type: String,
    default: null
  },

  statut: {
    type: String,
    enum: ["OUVERT", "EN_COURS", "CLOTURE"],
    default: "OUVERT"
  },

  localisation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true
  },

  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur"
  },

  technicienId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur"
  },

  creationDate: {
    type: Date,
    default: Date.now
  },

  assignationDate: { type: Date }, // date à laquelle le ticket est assigné
  clotureDate: { type: Date },    // date à laquelle le ticket est clôturé

  aiScore: {
    type: Number,
    min: 0,
    max: 100
  }, // score IA dynamique

  priorite: {
    type: String,
    enum: ["BASSE", "MOYENNE", "ELEVEE", "TRES_ELEVEE"]
  }, // optionnel, IA peut remplir
  tempsReponsePrevu: { type: Number } // rempli par IA

}); 

module.exports = mongoose.model("Ticket", ticketSchema);
