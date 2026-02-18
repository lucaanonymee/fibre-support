const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Définir le schema
const utilisateurSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    unique: true 
  },
  
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  motDePasse: { 
    type: String, 
    required: true
  },

  role: {
    type: String,
    enum: ["CLIENT", "TECHNICIEN", "ADMIN", "SUPER_ADMIN"],
    required: true
  },

  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    default: null
  },

  zoneIntervention: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: function() { 
          return this.role === "ADMIN" || this.role === "TECHNICIEN"; 
        }
      },
      coordinates: {
        type: [[[Number]]],
        required: function() { 
          return this.role === "ADMIN" || this.role === "TECHNICIEN"; 
        }
      }
    },


  categorie: {
  type: String,
  enum: ["UGS", "ULS"], // UGS = interventions à distance, ULS = sur site
  required: function() { return this.role === "TECHNICIEN"; }
  },

  // 🔹 Numéro de téléphone (obligatoire pour CLIENT)
  numTelephone: {
    type: String,
    required: function() { return this.role === "CLIENT"; }
  },

  // 🔹 Vérification email
  emailVerifie: {
    type: Boolean,
    default: false
  },

  codeVerification: {
    type: String,
    default: null
  },

  codeVerificationExpire: {
    type: Date,
    default: null
  },

  // 🔹 Reset mot de passe : code vérifié
  codeResetVerifie: {
    type: Boolean,
    default: false
  },

  // 🔹 Présence technicien (réinitialisée chaque jour)
  estPresent: {
    type: Boolean,
    default: false
  },

  datePresence: {
    type: Date,
    default: null
  },

  // 🔹 Soft delete : compte actif ou désactivé
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

// Créer le model
utilisateurSchema.pre("save", async function(next) {
  if (!this.isModified("motDePasse")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});

const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);
module.exports = Utilisateur;