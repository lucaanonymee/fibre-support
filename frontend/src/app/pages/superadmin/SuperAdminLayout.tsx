import { DashboardLayout } from '../../components/DashboardLayout';
import { LayoutDashboard, Users, UserPlus, User } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/superadmin/dashboard' },
  { label: 'Liste des Utilisateurs', icon: Users, path: '/superadmin/utilisateurs' },
  { label: 'Créer un Admin', icon: UserPlus, path: '/superadmin/creer-admin' },
  { label: 'Mon Profil', icon: User, path: '/superadmin/profil' },
];

export default function SuperAdminLayout() {
  return (
    <DashboardLayout
      navItems={navItems}
      userName="Directeur Système"
      userEmail="superadmin@tunisietelecom.tn"
      roleLabel="Super Administrateur"
      roleColor="#ce93d8"
    />
  );
}
