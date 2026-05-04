import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { LogoIcon } from './Logo';
import { apiRequest, getErrorMessage, invalidateCsrfTokenCache } from '../utils/httpApi';

export interface NavItem {
  label: string;
  icon: React.ComponentType<any>;
  path: string;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  userPhotoUrl?: string | null;
  roleLabel: string;
  roleColor?: string;
}

function StatusDot({ color }: { color: string }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, display: 'inline-block',
    }} />
  );
}

export function DashboardLayout({ navItems, userName, userEmail, userPhotoUrl = null, roleLabel, roleColor = '#42a5f5' }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setLogoutError(null);

    try {
      await apiRequest('/api/logout', { method: 'POST' });
    } catch (error) {
      // Logout should still clear local state even if server cleanup fails.
      setLogoutError(getErrorMessage(error, 'Deconnexion partielle. Session locale fermee.'));
    } finally {
      invalidateCsrfTokenCache();
      navigate('/', { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f4f8', fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: collapsed ? 68 : 248,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1a237e 0%, #283593 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '4px 0 20px rgba(26,35,126,0.18)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 18px' : '20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 12, minHeight: 72,
        }}>
          <LogoIcon size={66} />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Smart Fibre TT</div>
              <div style={{ color: roleColor, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{roleLabel}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/client' && item.path !== '/admin' && item.path !== '/tech' && item.path !== '/superadmin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: collapsed ? '11px 14px' : '11px 14px',
                  borderRadius: 10, marginBottom: 4,
                  color: isActive ? '#1a237e' : 'rgba(255,255,255,0.75)',
                  background: isActive ? '#e8f0fe' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.18s',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <item.icon size={18} style={{ flexShrink: 0, color: isActive ? '#1a237e' : 'rgba(255,255,255,0.75)' }} />
                {!collapsed && <span style={{ fontSize: 14 }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {!collapsed && (
          <div style={{
            margin: '0 10px 10px', padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: roleColor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0,
                overflow: 'hidden',
              }}>
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={`Photo de ${userName}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
              </div>
            </div>
          </div>
        )}

        {/* Collapse btn */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            margin: '0 10px 12px', padding: '9px',
            borderRadius: 10, border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 12, transition: 'background 0.18s',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Réduire</span></>}
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          height: 64, background: 'white',
          borderBottom: '1px solid #e8ecf0',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusDot color="#4caf50" />
            <span style={{ fontSize: 13, color: '#666' }}>Système opérationnel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a237e' }}>{userName}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{roleLabel}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid #e8ecf0', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              color: '#666', fontSize: 13, fontWeight: 500,
              opacity: loggingOut ? 0.7 : 1,
            }}>
              <LogOut size={14} />
              {loggingOut ? 'Deconnexion...' : 'Deconnexion'}
            </button>
          </div>
        </div>

        {logoutError && (
          <div style={{
            margin: '12px 24px 0',
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fff8e1',
            border: '1px solid #ffe082',
            color: '#8d6e63',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {logoutError}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;