const nodemailer = require("nodemailer");

// 🔹 Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,     // ex: votre.email@gmail.com
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// 🔹 Générer un code de vérification à 6 chiffres
const genererCodeVerification = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🔹 Envoyer un email de vérification
const envoyerCodeVerification = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Code de vérification - Support Technique",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Vérification de votre adresse email</h2>
        <p>Votre code de vérification est :</p>
        <h1 style="color: #2563eb; letter-spacing: 5px;">${code}</h1>
        <p>Ce code expire dans <strong>10 minutes</strong>.</p>
        <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 🔹 Envoyer un email de réinitialisation mot de passe
const envoyerCodeResetPassword = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Réinitialisation du mot de passe - Support Technique",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔐 Réinitialisation de votre mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Votre code de réinitialisation est :</p>
        <h1 style="color: #dc2626; letter-spacing: 5px;">${code}</h1>
        <p>Ce code expire dans <strong>10 minutes</strong>.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { genererCodeVerification, envoyerCodeVerification, envoyerCodeResetPassword };
