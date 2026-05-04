import { Link } from 'react-router';
import { ArrowLeft, FileText } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useEffect } from 'react';

export default function TermsPage() {
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
            <FileText size={32} color="#42a5f5" />
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Conditions d'utilisation</h1>
          </div>
          <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Dernière mise à jour : Février 2026</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
        {[
          {
            title: '1. Objet',
            content: "Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Smart Fibre TT, développée pour la gestion des incidents fibre optique de Tunisie Telecom.",
          },
          {
            title: "2. Accès à la plateforme",
            content: "L'accès à Smart Fibre TT est réservé aux utilisateurs disposant d'un compte validé. Quatre rôles sont définis : Client, Technicien, Administrateur et Super Administrateur. Chaque rôle donne accès à des fonctionnalités spécifiques adaptées à ses responsabilités.",
          },
          {
            title: "3. Obligations de l'utilisateur",
            content: "L'utilisateur s'engage à : fournir des informations exactes et à jour, maintenir la confidentialité de ses identifiants de connexion, ne pas tenter d'accéder à des fonctionnalités non autorisées, utiliser la plateforme uniquement dans le cadre de la gestion des incidents fibre optique, et signaler immédiatement toute utilisation non autorisée de son compte.",
          },
          {
            title: '4. Tickets et incidents',
            content: "Les tickets créés doivent concerner exclusivement des incidents liés au réseau fibre optique de Tunisie Telecom. Les informations fournies (numéro de série, localisation, description) doivent être exactes. La priorisation par IA est indicative , la validation finale reste à la charge de l'administrateur.",
          },
          {
            title: '5. Propriété intellectuelle',
            content: "L'ensemble des éléments de la plateforme (interface, algorithmes, base de données, documentation) est la propriété exclusive de Tunisie Telecom. Toute reproduction, modification ou distribution non autorisée est strictement interdite.",
          },
          {
            title: '6. Responsabilité',
            content: "Smart Fibre TT s'efforce d'assurer la disponibilité et la fiabilité de la plateforme. Toutefois, Tunisie Telecom ne saurait être tenu responsable des interruptions de service dues à des maintenances programmées, des cas de force majeure, ou des problèmes de connectivité indépendants de sa volonté.",
          },
          {
            title: '7. Modification des CGU',
            content: "Tunisie Telecom se réserve le droit de modifier les présentes CGU à tout moment. L'utilisation continue de la plateforme après modification vaut acceptation des nouvelles conditions.",
          },
          {
            title: '8. Résiliation',
            content: "Tunisie Telecom se réserve le droit de suspendre ou de résilier tout compte utilisateur en cas de non-respect des présentes conditions, sans préavis ni indemnité.",
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a237e', margin: '0 0 12px' }}>{section.title}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#555', margin: 0 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, padding: '20px 24px', borderRadius: 12, background: '#e8eaf6', border: '1px solid #c5cae9' }}>
          <p style={{ margin: 0, fontSize: 15, color: '#1a237e', lineHeight: 1.6 }}>
            <strong>Contact :</strong><br/> Pour toute question relative à ces conditions, contactez-nous à <strong>smartfibrett@gmail.com</strong> ou au <strong>+216 71 001 298</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
