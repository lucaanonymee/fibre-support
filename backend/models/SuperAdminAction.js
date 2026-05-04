const mongoose = require("mongoose");

const superAdminActionSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
    actionType: {
      type: String,
      enum: ["CREATION", "DESACTIVATION", "REACTIVATION"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["ADMIN", "CLIENT", "TECHNICIEN"],
      required: true,
    },
    targetName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuperAdminAction", superAdminActionSchema);
