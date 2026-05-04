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
    trim: true,
    required: function() { return this.role === "CLIENT"; }
  },

  // 🔹 URL publique de la photo de profil
  photoUrl: {
    type: String,
    trim: true,
    default: null
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

  // 🔹 Protection brute force sur la saisie des codes email/reset
  tentativesCodeInvalide: {
    type: Number,
    default: 0
  },

  blocageCodeJusqua: {
    type: Date,
    default: null
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
  },

  // 🔹 Refresh Token (OAuth 2.0)
  refreshToken: {
    type: String,
    default: null
  }

}, { timestamps: true });


// Le numéro de téléphone est réservé au rôle CLIENT.
utilisateurSchema.pre("validate", function() {
  if (this.role !== "CLIENT") {
    this.numTelephone = undefined;
  }
});
// 🔹 Supprimer zoneIntervention pour les clients (un client peut avoir plusieurs SN dans différentes zones)
utilisateurSchema.pre("save", function() {
  if (this.role === "CLIENT") {
    this.zoneIntervention = undefined;
  }
});

// Créer le model
utilisateurSchema.pre("save", async function() {
  if (!this.isModified("motDePasse")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);
module.exports = Utilisateur;