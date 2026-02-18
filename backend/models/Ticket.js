const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  sn: { type: String, required: true },

  typeProbleme: {
    type: String,
    enum: [
      "COUPURE_TOTALE",
      "QUALITE_DEGRADEE",
      "MODEM_DEFECTUEUX",
      "CONFIG_MODEM",
      "CABLE_ENDOMMAGE",
      "DEBIT_FAIBLE"
    ],
    required: true
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

  priorite: { type: Number }, // optionnel, IA peut remplir
  tempsReponsePrevu: { type: Number } // rempli par IA

}); 

module.exports = mongoose.model("Ticket", ticketSchema);
