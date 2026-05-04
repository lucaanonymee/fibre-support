import { Link } from 'react-router';
import { ArrowLeft, Scale } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useEffect } from 'react';

export default function MentionsPage() {
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
            <Scale size={32} color="#42a5f5" />
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Mentions légales</h1>
          </div>
          <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Dernière mise à jour : Février 2026</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
        {[
          {
            title: '1. Éditeur de la plateforme',
            content: "La plateforme Smart Fibre TT est éditée par Tunisie Telecom, société anonyme au capital social de 963 000 000 TND, immatriculée au Registre National des Entreprises, dont le siège social est situé à Tunis, Tunisie.",
          },
          {
            title: '2. Directeur de la publication',
            content: "Le directeur de la publication est Monsieur Lasaâd Ben Dhiab, en sa qualité de Président-Directeur Général de Tunisie Telecom.",
          },
          {
            title: '3. Hébergement',
            content: "La plateforme est hébergée sur les infrastructures de Tunisie Telecom. Adresse : Rue Hedi Nouira, Tunis 1002, Tunisie. Téléphone : +216 71 001 298.",
          },
          {
            title: '4. Propriété intellectuelle',
            content: "L'ensemble du contenu de la plateforme Smart Fibre TT (textes, graphismes, images, logos, icônes, logiciels, algorithmes d'IA) est protégé par le droit de la propriété intellectuelle tunisien et international. Toute reproduction ou représentation, totale ou partielle, sans autorisation expresse est interdite et constituerait une contrefaçon.",
          },
          {
            title: '5. Données personnelles',
            content: "Conformément à la loi organique n°2004-63 du 27 juillet 2004 portant sur la protection des données à caractère personnel, les utilisateurs disposent d'un droit d'accès, de modification et de suppression des données les concernant. L'Instance Nationale de Protection des Données Personnelles (INPDP) est l'autorité compétente.",
          },
          {
            title: '6. Limitation de responsabilité',
            content: "Tunisie Telecom met tout en œuvre pour assurer l'exactitude et la mise à jour des informations diffusées sur la plateforme. Toutefois, elle ne saurait garantir l'exactitude, la complétude ou l'actualité des informations publiées. L'utilisation de la plateforme se fait sous la responsabilité exclusive de l'utilisateur.",
          },
          {
            title: '7. Droit applicable',
            content: "Les présentes mentions légales sont régies par le droit tunisien. Tout litige relatif à l'utilisation de la plateforme Smart Fibre TT sera soumis à la compétence exclusive des tribunaux de Tunis.",
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a237e', margin: '0 0 12px' }}>{section.title}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#555', margin: 0 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, padding: '20px 24px', borderRadius: 12, background: '#e8eaf6', border: '1px solid #c5cae9' }}>
          <p style={{ margin: 0, fontSize: 15, color: '#1a237e', lineHeight: 1.6 }}>
            <strong>Contact :</strong> <br/>Pour toute question relative à ces mentions, contactez-nous à <strong>smartfibrett@gmail.com</strong> ou au <strong>+216 71 001 298</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
