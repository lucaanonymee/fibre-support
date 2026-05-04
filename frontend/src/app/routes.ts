import { createBrowserRouter, redirect } from 'react-router';
import { ApiError, apiRequest } from './utils/httpApi';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import EmailVerifyPage from './pages/auth/EmailVerifyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ChangeEmailPage from './pages/auth/ChangeEmailPage';
import ClientLayout from './pages/client/ClientLayout';
import ClientTicketsPage from './pages/client/ClientTicketsPage'; 
import ClientNewTicketPage from './pages/client/ClientNewTicketPage';
import ClientProfilePage from './pages/client/ClientProfilePage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminAssignPage from './pages/admin/AdminAssignPage';
import AdminTechniciansPage from './pages/admin/AdminTechniciansPage';
import AdminCreateTechnicianPage from './pages/admin/AdminCreateTechnicianPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import TechLayout from './pages/tech/TechLayout';
import TechTicketsPage from './pages/tech/TechTicketsPage';
import TechHistoryPage from './pages/tech/TechHistoryPage';
import TechProfilePage from './pages/tech/TechProfilePage';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboardPage from './pages/superadmin/SuperAdminDashboardPage';
import SuperAdminUsersPage from './pages/superadmin/SuperAdminUsersPage';
import SuperAdminCreateAdminPage from './pages/superadmin/SuperAdminCreateAdminPage';
import SuperAdminProfilePage from './pages/superadmin/SuperAdminProfilePage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import MentionsPage from './pages/legal/MentionsPage';
import NotFoundPage from './pages/NotFoundPage';

type AppRole = 'CLIENT' | 'TECHNICIEN' | 'ADMIN' | 'SUPER_ADMIN';
type BackendRole = AppRole | 'SUPER ADMIN';

const ROLE_HOME_PATHS: Record<AppRole, string> = {
  CLIENT: '/client/tickets',
  TECHNICIEN: '/tech/tickets',
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/superadmin/dashboard',
};

const normalizeRole = (role?: string | null): AppRole | null => {
  if (!role) {
    return null;
  }

  if (role === 'SUPER ADMIN') {
    return 'SUPER_ADMIN';
  }

  if (role === 'CLIENT' || role === 'TECHNICIEN' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return role;
  }

  return null;
};

const loginRedirectForRequest = (request: Request) => {
  const requestUrl = new URL(request.url);
  const nextPath = `${requestUrl.pathname}${requestUrl.search}`;
  return redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
};

const getCurrentSession = async () => {
  const payload = await apiRequest<{ role?: BackendRole }>('/api/me', { method: 'GET' });
  const role = normalizeRole(payload?.role);

  if (!role) {
    throw new ApiError('Role utilisateur invalide', 403, payload);
  }

  return { role };
};

const requireRoleLoader = (roles: AppRole[]) => {
  return async ({ request }: { request: Request }) => {
    try {
      const session = await getCurrentSession();

      if (!roles.includes(session.role)) {
        return redirect(ROLE_HOME_PATHS[session.role]);
      }

      return null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return loginRedirectForRequest(request);
      }

      throw error;
    }
  };
};

const guestOnlyLoader = async () => {
  try {
    const session = await getCurrentSession();
    return redirect(ROLE_HOME_PATHS[session.role]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }

    throw error;
  }
};

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/legal/privacy', Component: PrivacyPage },
  { path: '/legal/terms', Component: TermsPage },
  { path: '/legal/mentions', Component: MentionsPage },
  { path: '/auth/login', loader: guestOnlyLoader, Component: LoginPage },
  { path: '/auth/register', loader: guestOnlyLoader, Component: RegisterPage },
  { path: '/auth/verify', loader: guestOnlyLoader, Component: EmailVerifyPage },
  { path: '/auth/forgot', loader: guestOnlyLoader, Component: ForgotPasswordPage },
  { path: '/auth/change-email', loader: guestOnlyLoader, Component: ChangeEmailPage },
  {
    path: '/client',
    loader: requireRoleLoader(['CLIENT']),
    Component: ClientLayout,
    children: [
      { index: true, loader: () => redirect('/client/tickets') },
      { path: 'tickets', Component: ClientTicketsPage },
      { path: 'nouveau-ticket', Component: ClientNewTicketPage },
      { path: 'profil', Component: ClientProfilePage },
      { path: 'new-ticket', loader: () => redirect('/client/nouveau-ticket') },
      { path: 'profile', loader: () => redirect('/client/profil') },
    ],
  },
  {
    path: '/admin',
    loader: requireRoleLoader(['ADMIN']),
    Component: AdminLayout,
    children: [
      { index: true, loader: () => redirect('/admin/dashboard') },
      { path: 'dashboard', Component: AdminDashboardPage },
      { path: 'tickets', Component: AdminTicketsPage },
      { path: 'assigner-ticket', Component: AdminAssignPage },
      { path: 'techniciens', Component: AdminTechniciansPage },
      { path: 'creer-technicien', Component: AdminCreateTechnicianPage },
      { path: 'profil', Component: AdminProfilePage },
      { path: 'assign', loader: () => redirect('/admin/assigner-ticket') },
      { path: 'technicians', loader: () => redirect('/admin/techniciens') },
      { path: 'create-technician', loader: () => redirect('/admin/creer-technicien') },
      { path: 'map', loader: () => redirect('/admin/assigner-ticket') },
      { path: 'carte', loader: () => redirect('/admin/assigner-ticket') },
      { path: 'profile', loader: () => redirect('/admin/profil') },
    ],
  },
  {
    path: '/tech',
    loader: requireRoleLoader(['TECHNICIEN']),
    Component: TechLayout,
    children: [
      { index: true, loader: () => redirect('/tech/tickets') },
      { path: 'tickets', Component: TechTicketsPage },
      { path: 'historique', Component: TechHistoryPage },
      { path: 'profil', Component: TechProfilePage },
      { path: 'history', loader: () => redirect('/tech/historique') },
      { path: 'profile', loader: () => redirect('/tech/profil') },
    ],
  },
  {
    path: '/superadmin',
    loader: requireRoleLoader(['SUPER_ADMIN']),
    Component: SuperAdminLayout,
    children: [
      { index: true, loader: () => redirect('/superadmin/dashboard') },
      { path: 'dashboard', Component: SuperAdminDashboardPage },
      { path: 'utilisateurs', Component: SuperAdminUsersPage },
      { path: 'creer-admin', Component: SuperAdminCreateAdminPage },
      { path: 'profil', Component: SuperAdminProfilePage },
      { path: 'home', loader: () => redirect('/superadmin/dashboard') },
      { path: 'admins', loader: () => redirect('/superadmin/utilisateurs') },
      { path: 'administrateurs', loader: () => redirect('/superadmin/utilisateurs') },
      { path: 'create-admin', loader: () => redirect('/superadmin/creer-admin') },
      { path: 'profile', loader: () => redirect('/superadmin/profil') },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);
