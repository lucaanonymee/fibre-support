import { Link } from 'react-router';
import { ArrowLeft, Shield } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useEffect } from 'react';

export default function PrivacyPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f8faff', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 100%)',
        padding: '32px 32px 48px', color: 'white',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <LogoIcon size={68} />
            <span style={{ fontWeight: 800, fontSize: 18 }}>Smart Fibre TT</span>
          </div>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={32} color="#42a5f5" />
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Politique de confidentialité</h1>
          </div>
          <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Dernière mise à jour : Février 2026</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
        {[
          {
            title: '1. Collecte des données',
            content: "Smart Fibre TT collecte les informations nécessaires au fonctionnement de la plateforme : nom, prénom, adresse email, numéro de téléphone, et données de localisation géographique liées aux tickets d'intervention. Ces données sont collectées lors de l'inscription et de l'utilisation de la plateforme.",
          },
          {
            title: '2. Utilisation des données',
            content: "Les données collectées sont utilisées exclusivement pour : la gestion des comptes utilisateurs, la création et le suivi des tickets d'incident, la priorisation par intelligence artificielle, l'assignation géographique des techniciens, et l'amélioration continue de nos services.",
          },
          {
            title: '3. Protection des données',
            content: "Toutes les données sont stockées de manière sécurisée sur des serveurs protégés. Les mots de passe sont chiffrés avec des algorithmes de hachage robustes. Les échanges de données sont protégés par le protocole HTTPS/TLS. L'accès aux données est strictement limité au personnel autorisé.",
          },
          {
            title: '4. Partage des données',
            content: "Smart Fibre TT ne partage aucune donnée personnelle avec des tiers, sauf obligation légale. Les données sont traitées uniquement dans le cadre des opérations de Tunisie Telecom pour la résolution des incidents fibre optique.",
          },
          {
            title: '5. Droits des utilisateurs',
            content: "Conformément à la loi organique n°2004-63 du 27 juillet 2004 relative à la protection des données à caractère personnel, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous à smartfibrett@gmail.com.",
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a237e', margin: '0 0 12px' }}>{section.title}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#555', margin: 0 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, padding: '20px 24px', borderRadius: 12, background: '#e8eaf6', border: '1px solid #c5cae9' }}>
          <p style={{ margin: 0, fontSize: 15, color: '#1a237e', lineHeight: 1.6 }}>
            <strong>Contact :</strong><br/> Pour toute question relative à cette politique, contactez-nous à <strong>smartfibrett@gmail.com</strong> ou au <strong>+216 71 001 298</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
