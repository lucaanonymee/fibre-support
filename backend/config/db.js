// backend/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test_db");
    console.log("MongoDB connecté ✅");
  } catch (err) {
    console.error("Erreur de connexion MongoDB :", err);
    process.exit(1); // arrête le serveur si DB indisponible
  }
};

module.exports = connectDB;
