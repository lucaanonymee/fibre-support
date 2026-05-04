import { DashboardLayout } from '../../components/DashboardLayout';
import { Ticket, History, User } from 'lucide-react';
import { useRoleProfile } from '../../context/ProfileContext';

const navItems = [
  { label: 'Mes Tickets', icon: Ticket, path: '/tech/tickets' },
  { label: 'Historique des pannes', icon: History, path: '/tech/historique' },
  { label: 'Mon Profil', icon: User, path: '/tech/profil' },
];

export default function TechLayout() {
  const { name, email, photoUrl } = useRoleProfile('tech', {
    name: 'Technicien TT',
    email: 'technicien@tunisietelecom.tn',
  });

  return (
    <DashboardLayout
      navItems={navItems}
      userName={name}
      userEmail={email}
      userPhotoUrl={photoUrl}
      roleLabel="Espace Technicien ULS"
      roleColor="#00bcd4"
    />
  );
}
