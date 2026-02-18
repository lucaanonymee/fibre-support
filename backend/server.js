// backend/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 🔹 Config DB
const connectDB = require("./config/db");

// 🔹 Routes
const authRoutes = require("./routes/auth.routes");
const superadminRoutes = require("./routes/superadmin.routes");
const adminRoutes = require("./routes/admin.routes");
const clientRoutes = require("./routes/client.routes");
const technicienRoutes = require("./routes/technicien.routes");
const utilisateurRoutes = require("./routes/utilisateur.routes");

const app = express();

// 🔹 Middleware global
app.use(cors());
app.use(express.json());

// 🔹 Routes test
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connecté avec succès 🚀" });
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// 🔹 Routes principales
app.use(authRoutes);          // login / register client
app.use(superadminRoutes);    // création admin (par super admin)
app.use(adminRoutes);         // création technicien + gestion tickets
app.use(clientRoutes);        // tickets client
app.use(technicienRoutes);    // tickets technicien
app.use(utilisateurRoutes);   // profil utilisateur

// 🔹 Route 404 - Endpoint non trouvé
app.use((req, res) => {
  res.status(404).json({ message: "Route non trouvée" });
});

// 🔹 Middleware global de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.stack);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

// 🔹 Connexion MongoDB + lancement serveur
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Serveur lancé sur http://localhost:${process.env.PORT || 5000}`);
  });
});
