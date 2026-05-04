import { DashboardLayout } from '../../components/DashboardLayout';
import { Ticket, PlusCircle, User } from 'lucide-react';
import { useRoleProfile } from '../../context/ProfileContext';

const navItems = [
  { label: 'Mes Tickets', icon: Ticket, path: '/client/tickets' },
  { label: 'Nouveau Ticket', icon: PlusCircle, path: '/client/nouveau-ticket' },
  { label: 'Mon Profil', icon: User, path: '/client/profil' },
];

export default function ClientLayout() {
  const { name, email, photoUrl } = useRoleProfile('client', {
    name: 'Client Tunisie Telecom',
    email: 'client@tunisietelecom.tn',
  });

  return (
    <DashboardLayout
      navItems={navItems}
      userName={name}
      userEmail={email}
      userPhotoUrl={photoUrl}
      roleLabel="Espace Client"
      roleColor="#42a5f5"
    />
  );
}
