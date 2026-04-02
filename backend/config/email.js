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
    from: `"Smart Fibre TT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Validez votre adresse e-mail – Smart Fibre TT",
    html: `
      <div style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Google Sans',Roboto,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color:#0d6efd;padding:30px 40px;text-align:center;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">Smart Fibre TT</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 20px;">
                    <h2 style="margin:0 0 20px;font-size:20px;color:#202124;font-weight:600;">Validez votre adresse e-mail</h2>
                    <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#5f6368;">
                      <strong>Smart Fibre TT</strong> a reçu une demande pour vérifier l'adresse e-mail <strong>${email}</strong>.
                    </p>
                    <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#5f6368;">
                      Utilisez le code ci-dessous pour terminer la vérification :
                    </p>
                    <!-- Code -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;background-color:#f0f6ff;border:1px solid #d2e3fc;border-radius:8px;padding:16px 40px;">
                            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0d6efd;">${code}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#80868b;">
                      Ce code expirera dans <strong>10 minutes</strong>.
                    </p>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding:0 40px;">
                    <hr style="border:none;border-top:1px solid #e8eaed;margin:20px 0;">
                  </td>
                </tr>
                <!-- Footer note -->
                <tr>
                  <td style="padding:0 40px 30px;">
                    <p style="margin:0;font-size:12px;line-height:18px;color:#80868b;">
                      Si vous n'avez pas effectué cette demande, vous pouvez ignorer ce message en toute sécurité.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8eaed;">
                    <p style="margin:0;font-size:11px;color:#9aa0a6;">
                      © ${new Date().getFullYear()} Smart Fibre TT — smartfibrett@gmail.com
                    </p>
                    <p style="margin:6px 0 0;font-size:11px;color:#9aa0a6;">
                      Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 🔹 Envoyer un email de réinitialisation mot de passe
const envoyerCodeResetPassword = async (email, code) => {
  const mailOptions = {
    from: `"Smart Fibre TT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Réinitialisation de votre mot de passe – Smart Fibre TT",
    html: `
      <div style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Google Sans',Roboto,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color:#0d6efd;padding:30px 40px;text-align:center;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">Smart Fibre TT</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 20px;">
                    <h2 style="margin:0 0 20px;font-size:20px;color:#202124;font-weight:600;">Réinitialisation de votre mot de passe</h2>
                    <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#5f6368;">
                      <strong>Smart Fibre TT</strong> a reçu une demande de réinitialisation du mot de passe pour le compte associé à <strong>${email}</strong>.
                    </p>
                    <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#5f6368;">
                      Utilisez le code ci-dessous pour réinitialiser votre mot de passe :
                    </p>
                    <!-- Code -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 40px;">
                            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#dc2626;">${code}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#80868b;">
                      Ce code expirera dans <strong>10 minutes</strong>.
                    </p>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding:0 40px;">
                    <hr style="border:none;border-top:1px solid #e8eaed;margin:20px 0;">
                  </td>
                </tr>
                <!-- Footer note -->
                <tr>
                  <td style="padding:0 40px 30px;">
                    <p style="margin:0;font-size:12px;line-height:18px;color:#80868b;">
                      Si vous n'avez pas effectué cette demande, vous pouvez ignorer ce message en toute sécurité. Votre mot de passe restera inchangé.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8eaed;">
                    <p style="margin:0;font-size:11px;color:#9aa0a6;">
                      © ${new Date().getFullYear()} Smart Fibre TT — smartfibrett@gmail.com
                    </p>
                    <p style="margin:6px 0 0;font-size:11px;color:#9aa0a6;">
                      Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 🔹 Envoyer un email de notification de clôture de ticket
const envoyerEmailClotureTicket = async (email, ticket) => {
  const mailOptions = {
    from: `"Smart Fibre TT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Ticket clôturé – ${ticket.typeProbleme} – Smart Fibre TT`,
    html: `
      <div style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Google Sans',Roboto,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color:#16a34a;padding:30px 40px;text-align:center;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">Smart Fibre TT</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 20px;">
                    <h2 style="margin:0 0 20px;font-size:20px;color:#202124;font-weight:600;">✅ Votre ticket a été clôturé</h2>
                    <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#5f6368;">
                      Bonjour, nous vous informons que votre ticket a été traité et clôturé avec succès.
                    </p>
                    <!-- Ticket Details -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:16px 0;">
                      <tr>
                        <td style="padding:20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:4px 0;font-size:13px;color:#5f6368;width:140px;"><strong>N° Série (SN)</strong></td>
                              <td style="padding:4px 0;font-size:13px;color:#202124;">${ticket.sn}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-size:13px;color:#5f6368;"><strong>Type de problème</strong></td>
                              <td style="padding:4px 0;font-size:13px;color:#202124;">${ticket.typeProbleme.replace(/_/g, ' ')}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-size:13px;color:#5f6368;"><strong>Date de création</strong></td>
                              <td style="padding:4px 0;font-size:13px;color:#202124;">${new Date(ticket.creationDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-size:13px;color:#5f6368;"><strong>Date de clôture</strong></td>
                              <td style="padding:4px 0;font-size:13px;color:#202124;">${new Date(ticket.clotureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-size:13px;color:#5f6368;"><strong>Statut</strong></td>
                              <td style="padding:4px 0;font-size:13px;color:#16a34a;font-weight:600;">CLÔTURÉ</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#80868b;">
                      Si le problème persiste, vous pouvez créer un nouveau ticket depuis votre espace client.
                    </p>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding:0 40px;">
                    <hr style="border:none;border-top:1px solid #e8eaed;margin:20px 0;">
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8eaed;">
                    <p style="margin:0;font-size:11px;color:#9aa0a6;">
                      © ${new Date().getFullYear()} Smart Fibre TT — smartfibrett@gmail.com
                    </p>
                    <p style="margin:6px 0 0;font-size:11px;color:#9aa0a6;">
                      Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 🔹 Envoyer un email de bienvenue après création de compte admin/technicien
const envoyerEmailBienvenueCompte = async ({ email, nom, role, motDePasseTemporaire }) => {
  const roleLabel = role === "ADMIN" ? "Administrateur" : "Technicien";

  const mailOptions = {
    from: `"Smart Fibre TT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Bienvenue ${roleLabel} - Vos identifiants Smart Fibre TT`,
    html: `
      <div style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Google Sans',Roboto,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color:#0d6efd;padding:30px 40px;text-align:center;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">Smart Fibre TT</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 40px 20px;">
                    <h2 style="margin:0 0 14px;font-size:20px;color:#202124;font-weight:600;">Bienvenue ${nom}</h2>
                    <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#5f6368;">
                      Votre compte <strong>${roleLabel}</strong> a ete cree avec succes sur <strong>Smart Fibre TT</strong>.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f6ff;border:1px solid #d2e3fc;border-radius:8px;margin:16px 0;">
                      <tr>
                        <td style="padding:18px 20px;">
                          <p style="margin:0 0 8px;font-size:13px;color:#5f6368;"><strong>Identifiants de connexion</strong></p>
                          <p style="margin:0 0 6px;font-size:13px;color:#202124;">Email : <strong>${email}</strong></p>
                          <p style="margin:0;font-size:13px;color:#202124;">Mot de passe temporaire : <strong>${motDePasseTemporaire}</strong></p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin:16px 0;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0;font-size:13px;line-height:20px;color:#9a3412;">
                            <strong>Avertissement securite :</strong> changez immediatement ce mot de passe apres votre premiere connexion.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#80868b;">
                      Nous vous souhaitons la bienvenue et une excellente experience sur la plateforme.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px;">
                    <hr style="border:none;border-top:1px solid #e8eaed;margin:20px 0;">
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8eaed;">
                    <p style="margin:0;font-size:11px;color:#9aa0a6;">
                      © ${new Date().getFullYear()} Smart Fibre TT — smartfibrett@gmail.com
                    </p>
                    <p style="margin:6px 0 0;font-size:11px;color:#9aa0a6;">
                      Cet e-mail a ete envoye automatiquement, merci de ne pas y repondre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  genererCodeVerification,
  envoyerCodeVerification,
  envoyerCodeResetPassword,
  envoyerEmailClotureTicket,
  envoyerEmailBienvenueCompte
};
