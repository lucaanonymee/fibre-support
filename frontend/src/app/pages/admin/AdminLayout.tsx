import { DashboardLayout } from '../../components/DashboardLayout';
import { LayoutDashboard, Ticket, UserPlus, Users, User, ClipboardCheck } from 'lucide-react';
import { useRoleProfile } from '../../context/ProfileContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Tickets', icon: Ticket, path: '/admin/tickets' },
  { label: 'Assigner Ticket', icon: ClipboardCheck, path: '/admin/assigner-ticket' },
  { label: 'Techniciens', icon: Users, path: '/admin/techniciens' },
  { label: 'Créer un technicien', icon: UserPlus, path: '/admin/creer-technicien' },
  { label: 'Mon Profil', icon: User, path: '/admin/profil' },
];

export default function AdminLayout() {
  const { name, email, photoUrl } = useRoleProfile('admin', {
    name: 'Administrateur TT',
    email: 'admin@tunisietelecom.tn',
  });

  return (
    <DashboardLayout
      navItems={navItems}
      userName={name}
      userEmail={email}
      userPhotoUrl={photoUrl}
      roleLabel="Espace Admin"
      roleColor="#ff9800"
    />
  );
}
